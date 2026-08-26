import { Router, type IRouter } from "express";
import { db, festivalsTable, festivalDonationsTable, adminsTable, volunteerFestivalAssignmentsTable } from "@workspace/db";
import { eq, and, sql, desc, asc, inArray, or } from "drizzle-orm";
import { requireRole, canAccessFestival } from "../middlewares/requireRole";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isPositiveInteger(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val > 0;
}

// ── GET /api/admin/festivals ────────────────────────────────────────────────
// List all festivals with stats (total collection, residents paid, pending)
// All admin roles can view festivals

router.get("/admin/festivals", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const admin = (req as any).admin;

   let festivals;

if (admin.role === "Volunteer") {
  const assignments = await db.select({ festivalId: volunteerFestivalAssignmentsTable.festivalId })
    .from(volunteerFestivalAssignmentsTable)
    .where(eq(volunteerFestivalAssignmentsTable.volunteerId, admin.id));
  const assignedIds = assignments.map((assignment) => assignment.festivalId);
  const access = assignedIds.length
    ? or(eq(festivalsTable.assignedVolunteerId, admin.id), inArray(festivalsTable.id, assignedIds))
    : eq(festivalsTable.assignedVolunteerId, admin.id);
  festivals = await db
    .select()
    .from(festivalsTable)
    .where(access)
    .orderBy(desc(festivalsTable.year), desc(festivalsTable.createdAt));
} else {
  festivals = await db
    .select()
    .from(festivalsTable)
    .orderBy(desc(festivalsTable.year), desc(festivalsTable.createdAt));
}

    // Attach stats to each festival
    const result = await Promise.all(
      festivals.map(async (f) => {
        const stats = await getFestivalStats(f.id);
        return { ...f, ...stats };
      })
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch festivals" });
  }
});

// ── Helper: Get festival stats ─────────────────────────────────────────────

async function getFestivalStats(festivalId: number) {
  // Total collection
  const [totalResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${festivalDonationsTable.amount}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(festivalDonationsTable)
    .where(eq(festivalDonationsTable.festivalId, festivalId));

  const totalCollection = parseFloat(String(totalResult?.total ?? "0"));
  const totalEntries = totalResult?.count ?? 0;

  // Residents paid (distinct resident count)
  const [paidResult] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${festivalDonationsTable.residentId})::int` })
    .from(festivalDonationsTable)
    .where(eq(festivalDonationsTable.festivalId, festivalId));

  const residentsPaid = paidResult?.count ?? 0;

  // Total residents (this is a simplified approach - we estimate from buildings/residents)
  // We'll get actual pending count differently
  const residentsPending = 0; // Will be calculated with real resident data later

  return {
    totalCollection,
    totalEntries,
    residentsPaid,
    residentsPending,
  };
}

// ── GET /api/admin/festivals/:id ────────────────────────────────────────────
// Get a single festival with full stats

router.get("/admin/festivals/:id", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.id as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const admin = (req as any).admin;

    // Volunteers can only access festivals assigned to them
    if (!(await canAccessFestival(admin.role, admin.id, festivalId))) {
      res.status(403).json({ error: "Forbidden - you do not have access to this festival" });
      return;
    }

    const [festival] = await db
      .select()
      .from(festivalsTable)
      .where(eq(festivalsTable.id, festivalId))
      .limit(1);

    if (!festival) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

    const stats = await getFestivalStats(festivalId);
    res.json({ ...festival, ...stats });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch festival" });
  }
});

// ── POST /api/admin/festivals ───────────────────────────────────────────────
// Create a new festival (with duplicate check: name + year)
// Only Super Admin and Admin can create festivals

router.post("/admin/festivals", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const body = req.body || {};

    // Validation
    if (!isNonEmptyString(body.festivalName)) {
      res.status(400).json({ error: "Festival name is required" });
      return;
    }
    if (!isPositiveInteger(body.year)) {
      res.status(400).json({ error: "Valid year is required" });
      return;
    }

    const festivalName = body.festivalName.trim();
    const year = body.year;
    const slug = festivalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + year;

    // Check duplicate (name + year)
    const existing = await db
      .select({ id: festivalsTable.id })
      .from(festivalsTable)
      .where(and(
        eq(festivalsTable.name, festivalName),
        eq(festivalsTable.year, year),
      ))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: `Festival "${festivalName} ${year}" already exists.` });
      return;
    }

    // Ensure unique slug
    let finalSlug = slug;
    const slugCheck = await db
      .select({ id: festivalsTable.id })
      .from(festivalsTable)
      .where(eq(festivalsTable.slug, slug))
      .limit(1);

    if (slugCheck.length > 0) {
      finalSlug = slug + "-" + Date.now();
    }

    // Validate assigned volunteer (if provided)
    let assignedVolunteerId: string | null = null;
    if (body.assignedVolunteerId != null) {
      if (!isNonEmptyString(body.assignedVolunteerId)) {
        res.status(400).json({ error: "Invalid assigned volunteer" });
        return;
      }
      const volunteer = await db
        .select({ id: adminsTable.id })
        .from(adminsTable)
        .where(and(
          eq(adminsTable.id, body.assignedVolunteerId as string),
          eq(adminsTable.role, "Volunteer"),
          eq(adminsTable.isActive, true),
        ))
        .limit(1);
      if (volunteer.length === 0) {
        res.status(400).json({ error: "Assigned volunteer not found or not active" });
        return;
      }
      assignedVolunteerId = body.assignedVolunteerId.trim();
    }

    const [festival] = await db
      .insert(festivalsTable)
      .values({
        name: festivalName,
        slug: finalSlug,
        description: body.description?.trim() || "",
        year,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        expectedDonation: body.expectedDonation ? String(body.expectedDonation) : null,
        status: body.status || "upcoming",
        isActive: body.status === "active",
        assignedVolunteerId,
      })
      .returning();

    res.status(201).json(festival);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A festival with this name and year already exists." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to create festival" });
  }
});

// ── PATCH /api/admin/festivals/:id ──────────────────────────────────────────
// Update a festival
// Only Super Admin and Admin can update festivals

router.patch("/admin/festivals/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.id as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    const body = req.body || {};
    const allowedFields = ["festivalName", "description", "year", "startDate", "endDate", "expectedDonation", "status"] as const;
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "festivalName") {
          if (!isNonEmptyString(body[field])) {
            res.status(400).json({ error: "Festival name cannot be empty" });
            return;
          }
          updateData.name = body[field].trim();
        } else if (field === "year") {
          if (!isPositiveInteger(body[field])) {
            res.status(400).json({ error: "Valid year is required" });
            return;
          }
          updateData.year = body[field];
        } else if (field === "expectedDonation") {
          updateData.expectedDonation = body[field] ? String(body[field]) : null;
        } else if (field === "status") {
          updateData.status = body[field];
          updateData.isActive = body[field] === "active";
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    // Handle assignedVolunteerId separately (accepts null to un-assign)
    if (body.assignedVolunteerId !== undefined) {
      const vol = body.assignedVolunteerId;
      if (vol == null || (typeof vol === "string" && vol.trim() === "")) {
        updateData.assignedVolunteerId = null;
      } else if (isNonEmptyString(vol)) {
        const volunteer = await db
          .select({ id: adminsTable.id })
          .from(adminsTable)
          .where(and(
            eq(adminsTable.id, vol as string),
            eq(adminsTable.role, "Volunteer"),
            eq(adminsTable.isActive, true),
          ))
          .limit(1);
        if (volunteer.length === 0) {
          res.status(400).json({ error: "Assigned volunteer not found or not active" });
          return;
        }
        updateData.assignedVolunteerId = vol.trim();
      } else {
        res.status(400).json({ error: "Invalid assigned volunteer" });
        return;
      }
    }

    // Update slug if name changed
    if (updateData.name) {
      const current = await db
        .select({ name: festivalsTable.name, year: festivalsTable.year })
        .from(festivalsTable)
        .where(eq(festivalsTable.id, festivalId))
        .limit(1);
      if (current.length > 0) {
        const year = (updateData.year as number) || current[0].year;
        updateData.slug = String(updateData.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + year;
      }
    }

    const [updated] = await db
      .update(festivalsTable)
      .set(updateData)
      .where(eq(festivalsTable.id, festivalId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A festival with this name and year already exists." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update festival" });
  }
});

// ── DELETE /api/admin/festivals/:id ─────────────────────────────────────────
// Delete a festival with cascade check
// Only Super Admin can delete festivals

router.delete("/admin/festivals/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.id as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    // Check if festival exists
    const [festival] = await db
      .select({ id: festivalsTable.id, name: festivalsTable.name })
      .from(festivalsTable)
      .where(eq(festivalsTable.id, festivalId))
      .limit(1);

    if (!festival) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

    // Check for donation records
    const [donationCheck] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(festivalDonationsTable)
      .where(eq(festivalDonationsTable.festivalId, festivalId));

    const donationCount = donationCheck?.count ?? 0;

    if (donationCount > 0) {
      res.status(409).json({
        error: `This festival has ${donationCount} donation record(s). All related donations will also be deleted.`,
        donationCount,
      });
      return;
    }

    const [deleted] = await db
      .delete(festivalsTable)
      .where(eq(festivalsTable.id, festivalId))
      .returning({ id: festivalsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete festival" });
  }
});

// ── DELETE /api/admin/festivals/:id/force ───────────────────────────────────
// Force delete a festival and all its donations
// Only Super Admin can force delete

router.delete("/admin/festivals/:id/force", requireRole("Super Admin"), async (req, res): Promise<void> => {
  try {
    const festivalId = parseInt(req.params.id as string, 10);
    if (isNaN(festivalId)) {
      res.status(400).json({ error: "Invalid festival ID" });
      return;
    }

    // Delete donations first (cascade should handle this, but explicit is safer)
    await db
      .delete(festivalDonationsTable)
      .where(eq(festivalDonationsTable.festivalId, festivalId));

    const [deleted] = await db
      .delete(festivalsTable)
      .where(eq(festivalsTable.id, festivalId))
      .returning({ id: festivalsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Festival not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete festival" });
  }
});

export default router;

