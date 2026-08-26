import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, adminsTable, festivalsTable, eventsTable, volunteerFestivalAssignmentsTable, volunteerEventAssignmentsTable } from "@workspace/db";
import { eq, asc, or, and, inArray } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

/**
 * ALLOWED ROLES per action:
 * - Super Admin: full CRUD on all admin/volunteer accounts
 * - Admin: can read all accounts, can manage Volunteer accounts only (create/edit/toggle/reset-password/delete)
 * - Volunteer: cannot access this module at all
 */

// ── GET /api/admin/manage ─────────────────────────────────────────────────
// List all admins/volunteers (Super Admin and Admin)
router.get("/admin/manage", requireRole("Super Admin", "Admin"), async (_req, res): Promise<void> => {
  try {
    const admins = await db
      .select({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        username: adminsTable.username,
        email: adminsTable.email,
        mobileNumber: adminsTable.mobileNumber,
        role: adminsTable.role,
        isActive: adminsTable.isActive,
        createdAt: adminsTable.createdAt,
        updatedAt: adminsTable.updatedAt,
        lastLogin: adminsTable.lastLogin,
      })
      .from(adminsTable)
      .orderBy(asc(adminsTable.fullName));

    const volunteerIds = admins.filter((a) => a.role === "Volunteer").map((a) => a.id);
    const [festivalAssignments, eventAssignments] = volunteerIds.length === 0
      ? [[], []]
      : await Promise.all([
          db.select({ volunteerId: volunteerFestivalAssignmentsTable.volunteerId, festivalId: volunteerFestivalAssignmentsTable.festivalId }).from(volunteerFestivalAssignmentsTable).where(inArray(volunteerFestivalAssignmentsTable.volunteerId, volunteerIds)),
          db.select({ volunteerId: volunteerEventAssignmentsTable.volunteerId, eventId: volunteerEventAssignmentsTable.eventId }).from(volunteerEventAssignmentsTable).where(inArray(volunteerEventAssignmentsTable.volunteerId, volunteerIds)),
        ]);

    res.json(admins.map(a => ({
      ...a,
      assignedFestivalIds: festivalAssignments.filter((x) => x.volunteerId === a.id).map((x) => x.festivalId),
      assignedEventIds: eventAssignments.filter((x) => x.volunteerId === a.id).map((x) => x.eventId),
      createdAt: a.createdAt?.toISOString?.() || a.createdAt,
      updatedAt: a.updatedAt?.toISOString?.() || a.updatedAt,
      lastLogin: a.lastLogin?.toISOString?.() || a.lastLogin,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch accounts" });
  }
});

// ── POST /api/admin/manage ────────────────────────────────────────────────
// Add a new account (Super Admin: can add any role; Admin: can add Volunteers only)
router.post("/admin/manage", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const body = req.body || {};
    const requestingAdmin = (req as any).admin;

    if (!isNonEmptyString(body.fullName)) {
      res.status(400).json({ error: "Full name is required" });
      return;
    }
    if (!isNonEmptyString(body.username)) {
      res.status(400).json({ error: "Username is required" });
      return;
    }
    if (!isNonEmptyString(body.mobileNumber)) {
      res.status(400).json({ error: "Mobile number is required" });
      return;
    }
    if (!isNonEmptyString(body.password)) {
      res.status(400).json({ error: "Password is required" });
      return;
    }
    if (body.password.length < 6 || body.password.length > 128) {
      res.status(400).json({ error: "Password must be between 6 and 128 characters" });
      return;
    }
    if (body.password !== body.confirmPassword) {
      res.status(400).json({ error: "Passwords do not match" });
      return;
    }

    // Validate role based on who is creating
    let role = body.role;
    const validRoles = ["Super Admin", "Admin", "Volunteer"];

    if (!validRoles.includes(role)) {
      role = "Volunteer";
    }

    // Admins can only create Volunteer accounts
    if (requestingAdmin.role === "Admin" && role !== "Volunteer") {
      res.status(403).json({ error: "Admins can only create Volunteer accounts" });
      return;
    }

    // Only Super Admin can create other Super Admins
    if (role === "Super Admin" && requestingAdmin.role !== "Super Admin") {
      res.status(403).json({ error: "Only Super Admin can create Super Admin accounts" });
      return;
    }

    const isActive = body.isActive !== false;
    const fullName = body.fullName.trim();
    const username = body.username.trim().toLowerCase();
    const mobileNumber = body.mobileNumber.trim();
    const email = body.email?.trim() || null;

    // Check duplicate username
    const existingUsername = await db
      .select({ id: adminsTable.id })
      .from(adminsTable)
      .where(eq(adminsTable.username, username))
      .limit(1);
    if (existingUsername.length > 0) {
      res.status(409).json({ error: "Username already exists" });
      return;
    }

    // Check duplicate mobile
    const existingMobile = await db
      .select({ id: adminsTable.id })
      .from(adminsTable)
      .where(eq(adminsTable.mobileNumber, mobileNumber))
      .limit(1);
    if (existingMobile.length > 0) {
      res.status(409).json({ error: "Mobile number already exists" });
      return;
    }

    // Check duplicate email
    if (email) {
      const existingEmail = await db
        .select({ id: adminsTable.id })
        .from(adminsTable)
        .where(eq(adminsTable.email, email))
        .limit(1);
      if (existingEmail.length > 0) {
        res.status(409).json({ error: "Email already exists" });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    const [admin] = await db
      .insert(adminsTable)
      .values({
        fullName,
        username,
        mobileNumber,
        email,
        password: hashedPassword,
        role,
        isActive,
      })
      .returning({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        username: adminsTable.username,
        email: adminsTable.email,
        mobileNumber: adminsTable.mobileNumber,
        role: adminsTable.role,
        isActive: adminsTable.isActive,
        createdAt: adminsTable.createdAt,
      });

    res.status(201).json({
      ...admin,
      createdAt: admin.createdAt?.toISOString?.() || admin.createdAt,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Duplicate value. Username, mobile, or email already exists." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to create account" });
  }
});

// ── PATCH /api/admin/manage/:id ───────────────────────────────────────────
// Edit account details
router.patch("/admin/manage/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const rawId = req.params.id as string;
    const adminId = rawId;
    const requestingAdmin = (req as any).admin;

    const body = req.body || {};

    // First, fetch the target account
    const [targetAdmin] = await db
      .select({ id: adminsTable.id, role: adminsTable.role })
      .from(adminsTable)
      .where(eq(adminsTable.id, adminId as any))
      .limit(1);

    if (!targetAdmin) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    // Admins can only edit Volunteer accounts
    if (requestingAdmin.role === "Admin" && targetAdmin.role !== "Volunteer") {
      res.status(403).json({ error: "Admins can only edit Volunteer accounts" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ["fullName", "username", "mobileNumber", "email", "role", "isActive"];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "fullName" && !isNonEmptyString(body[field])) {
          res.status(400).json({ error: "Full name cannot be empty" });
          return;
        }
        if (field === "username") {
          if (!isNonEmptyString(body[field])) {
            res.status(400).json({ error: "Username cannot be empty" });
            return;
          }
          updateData[field] = body[field].trim().toLowerCase();
        } else if (field === "mobileNumber") {
          if (!isNonEmptyString(body[field])) {
            res.status(400).json({ error: "Mobile number cannot be empty" });
            return;
          }
          updateData[field] = body[field].trim();
        } else if (field === "role") {
          // Admins cannot change roles to/from Super Admin or Admin
          if (requestingAdmin.role === "Admin") {
            res.status(403).json({ error: "Admins cannot change account roles" });
            return;
          }
          // Only allow valid roles
          const validRoles = ["Super Admin", "Admin", "Volunteer"];
          if (!validRoles.includes(body[field])) {
            res.status(400).json({ error: "Invalid role" });
            return;
          }
          updateData[field] = body[field];
        } else if (field === "isActive") {
          updateData[field] = body[field] === true;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(adminsTable)
      .set(updateData)
      .where(eq(adminsTable.id, adminId as any))
      .returning({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        username: adminsTable.username,
        email: adminsTable.email,
        mobileNumber: adminsTable.mobileNumber,
        role: adminsTable.role,
        isActive: adminsTable.isActive,
        updatedAt: adminsTable.updatedAt,
      });

    res.json({
      ...updated,
      updatedAt: updated.updatedAt?.toISOString?.() || updated.updatedAt,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Username, mobile, or email already exists." });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update account" });
  }
});

// ── PATCH /api/admin/manage/:id/status ────────────────────────────────────
// Enable/disable account
router.patch("/admin/manage/:id/status", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const rawId = req.params.id as string;
    const adminId = rawId;
    const requestingAdmin = (req as any).admin;

    // Fetch target account
    const [targetAdmin] = await db
      .select({ id: adminsTable.id, role: adminsTable.role })
      .from(adminsTable)
      .where(eq(adminsTable.id, adminId as any))
      .limit(1);

    if (!targetAdmin) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    // Admins can only toggle Volunteer accounts
    if (requestingAdmin.role === "Admin" && targetAdmin.role !== "Volunteer") {
      res.status(403).json({ error: "Admins can only manage Volunteer account status" });
      return;
    }

    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") {
      res.status(400).json({ error: "isActive (boolean) is required" });
      return;
    }

    // Prevent disabling own account
    if (requestingAdmin.id === adminId && !isActive) {
      res.status(400).json({ error: "You cannot disable your own account" });
      return;
    }

    const [updated] = await db
      .update(adminsTable)
      .set({ isActive })
      .where(eq(adminsTable.id, adminId as any))
      .returning({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        isActive: adminsTable.isActive,
      });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update status" });
  }
});

// ── PATCH /api/admin/manage/:id/reset-password ────────────────────────────
// Reset account password
router.patch("/admin/manage/:id/reset-password", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const rawId = req.params.id as string;
    const adminId = rawId;
    const requestingAdmin = (req as any).admin;

    // Fetch target account
    const [targetAdmin] = await db
      .select({ id: adminsTable.id, role: adminsTable.role })
      .from(adminsTable)
      .where(eq(adminsTable.id, adminId as any))
      .limit(1);

    if (!targetAdmin) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    // Admins can only reset passwords for Volunteer accounts
    if (requestingAdmin.role === "Admin" && targetAdmin.role !== "Volunteer") {
      res.status(403).json({ error: "Admins can only reset passwords for Volunteer accounts" });
      return;
    }

    const { newPassword, confirmPassword } = req.body || {};
    if (!isNonEmptyString(newPassword) || newPassword.length < 6 || newPassword.length > 128) {
      res.status(400).json({ error: "New password must be between 6 and 128 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: "Passwords do not match" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const [updated] = await db
      .update(adminsTable)
      .set({ password: hashedPassword })
      .where(eq(adminsTable.id, adminId as any))
      .returning({ id: adminsTable.id, fullName: adminsTable.fullName });

    res.json({ message: "Password reset successfully", id: updated.id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to reset password" });
  }
});

// ── DELETE /api/admin/manage/:id ──────────────────────────────────────────
// Delete account
router.delete("/admin/manage/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const rawId = req.params.id as string;
    const adminId = rawId;
    const requestingAdmin = (req as any).admin;

    // Fetch target account
    const [targetAdmin] = await db
      .select({ id: adminsTable.id, role: adminsTable.role })
      .from(adminsTable)
      .where(eq(adminsTable.id, adminId as any))
      .limit(1);

    if (!targetAdmin) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    // Prevent deleting own account
    if (requestingAdmin.id === adminId) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }

    // Admins can only delete Volunteer accounts
    if (requestingAdmin.role === "Admin" && targetAdmin.role !== "Volunteer") {
      res.status(403).json({ error: "Admins can only delete Volunteer accounts" });
      return;
    }

    const [deleted] = await db
      .delete(adminsTable)
      .where(eq(adminsTable.id, adminId as any))
      .returning({ id: adminsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete account" });
  }
});

// Assignment management remains inside Admin Management and follows its existing
// role gate. Admins retain their existing ability to manage Volunteer accounts;
// Volunteers cannot reach these endpoints.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getVolunteerForAssignment(id: string) {
  if (!uuidPattern.test(id)) return null;
  const [volunteer] = await db.select({ id: adminsTable.id, role: adminsTable.role })
    .from(adminsTable).where(eq(adminsTable.id, id)).limit(1);
  return volunteer?.role === "Volunteer" ? volunteer : null;
}

router.get("/admin/manage/:id/assignments", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const volunteerId = String(req.params.id);
  try {
    if (!(await getVolunteerForAssignment(volunteerId))) { res.status(404).json({ error: "Volunteer not found" }); return; }
    const rows = await db.select({ festivalId: volunteerFestivalAssignmentsTable.festivalId, festivalName: festivalsTable.name, year: festivalsTable.year })
      .from(volunteerFestivalAssignmentsTable)
      .innerJoin(festivalsTable, eq(festivalsTable.id, volunteerFestivalAssignmentsTable.festivalId))
      .where(eq(volunteerFestivalAssignmentsTable.volunteerId, volunteerId));
    res.json(rows);
  } catch (error) {
    console.error("[assignments] load failed", { volunteerId, error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to load Volunteer assignments" });
  }
});

router.post("/admin/manage/:id/assignments", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const volunteerId = String(req.params.id);
  const festivalId = Number(req.body?.festivalId);
  try {
    if (!(await getVolunteerForAssignment(volunteerId))) { res.status(404).json({ error: "Volunteer not found" }); return; }
    if (!Number.isInteger(festivalId) || festivalId <= 0) { res.status(400).json({ error: "A valid festivalId is required" }); return; }
    const [festival] = await db.select({ id: festivalsTable.id, name: festivalsTable.name, year: festivalsTable.year })
      .from(festivalsTable).where(eq(festivalsTable.id, festivalId)).limit(1);
    if (!festival) { res.status(404).json({ error: "Festival not found" }); return; }
    const [created] = await db.insert(volunteerFestivalAssignmentsTable)
      .values({ volunteerId, festivalId }).returning();
    res.status(201).json({ ...created, festival });
  } catch (error: any) {
    if (error?.code === "23505") { res.status(409).json({ error: "Volunteer is already assigned to this festival" }); return; }
    console.error("[assignments] create failed", { volunteerId, festivalId, error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to assign Volunteer to festival" });
  }
});

router.delete("/admin/manage/:id/assignments/:festivalId", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const volunteerId = String(req.params.id);
  const festivalId = Number(req.params.festivalId);
  try {
    if (!(await getVolunteerForAssignment(volunteerId))) { res.status(404).json({ error: "Volunteer not found" }); return; }
    if (!Number.isInteger(festivalId) || festivalId <= 0) { res.status(400).json({ error: "Invalid festivalId" }); return; }
    const deleted = await db.delete(volunteerFestivalAssignmentsTable)
      .where(and(eq(volunteerFestivalAssignmentsTable.volunteerId, volunteerId), eq(volunteerFestivalAssignmentsTable.festivalId, festivalId)))
      .returning({ volunteerId: volunteerFestivalAssignmentsTable.volunteerId });
    if (!deleted.length) { res.status(404).json({ error: "Assignment not found" }); return; }
    res.json({ success: true, message: "Volunteer unassigned from festival" });
  } catch (error) {
    console.error("[assignments] remove failed", { volunteerId, festivalId, error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to remove Volunteer assignment" });
  }
});

router.patch("/admin/manage/:id/assignments", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const volunteerId = String(req.params.id);
    const [volunteer] = await db.select({ id: adminsTable.id, role: adminsTable.role }).from(adminsTable).where(eq(adminsTable.id, volunteerId as any)).limit(1);
    if (!volunteer) { res.status(404).json({ error: "Account not found" }); return; }
    if (volunteer.role !== "Volunteer") { res.status(400).json({ error: "Assignments can only be changed for Volunteers" }); return; }
    const festivalIds: number[] = Array.isArray(req.body?.festivalIds) ? Array.from(new Set<number>(req.body.festivalIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0))) : [];
    const eventIds: number[] = Array.isArray(req.body?.eventIds) ? Array.from(new Set<number>(req.body.eventIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0))) : [];
    const validFestivals = await db.select({ id: festivalsTable.id }).from(festivalsTable).where(inArray(festivalsTable.id, festivalIds));
    const validEvents = await db.select({ id: eventsTable.id }).from(eventsTable).where(inArray(eventsTable.id, eventIds));
    if (validFestivals.length !== festivalIds.length || validEvents.length !== eventIds.length) { res.status(400).json({ error: "One or more assignment targets do not exist" }); return; }
    await db.transaction(async (tx) => {
      await tx.delete(volunteerFestivalAssignmentsTable).where(eq(volunteerFestivalAssignmentsTable.volunteerId, volunteerId as any));
      await tx.delete(volunteerEventAssignmentsTable).where(eq(volunteerEventAssignmentsTable.volunteerId, volunteerId as any));
      if (festivalIds.length) await tx.insert(volunteerFestivalAssignmentsTable).values(festivalIds.map((festivalId) => ({ volunteerId: volunteerId as any, festivalId })));
      if (eventIds.length) await tx.insert(volunteerEventAssignmentsTable).values(eventIds.map((eventId) => ({ volunteerId: volunteerId as any, eventId })));
    });
    // Keep the legacy single-assignment columns compatible with older code paths.
    await db.update(festivalsTable).set({ assignedVolunteerId: null }).where(eq(festivalsTable.assignedVolunteerId, volunteerId));
    await db.update(eventsTable).set({ assignedVolunteerId: null }).where(eq(eventsTable.assignedVolunteerId, volunteerId));
    if (festivalIds.length) await db.update(festivalsTable).set({ assignedVolunteerId: volunteerId }).where(inArray(festivalsTable.id, festivalIds));
    if (eventIds.length) await db.update(eventsTable).set({ assignedVolunteerId: volunteerId }).where(inArray(eventsTable.id, eventIds));
    res.json({ volunteerId, festivalIds, eventIds, message: "Volunteer assignments updated successfully" });
  } catch { res.status(500).json({ error: "Failed to update Volunteer assignments" }); }
});


export default router;
