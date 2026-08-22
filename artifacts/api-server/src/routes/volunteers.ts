import { Router, type IRouter } from "express";
import { db, volunteersTable } from "@workspace/db";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import { JoinVolunteerBody, ListVolunteersQueryParams } from "@workspace/api-zod";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();

function formatVolunteer(v: any) {
  const photo = v.photo || v.photoUrl || null;
  const mobileNumber = v.mobileNumber || v.phone || "";
  const position = v.position || v.role || "Volunteer";
  const displayPosition = typeof v.displayPosition === "number" ? v.displayPosition : 1;

  return {
    id: v.id,
    name: v.name,
    photo,
    photoUrl: photo,
    mobileNumber,
    phone: mobileNumber,
    position,
    role: position,
    displayPosition,
    email: v.email || null,
    flatNumber: v.flatNumber || null,
    status: v.status || "approved",
    createdAt: v.createdAt,
    updatedAt: v.updatedAt || v.createdAt,
  };
}

async function normalizeDisplayPositions() {
  const all = await db
    .select()
    .from(volunteersTable)
    .where(eq(volunteersTable.status, "approved"))
    .orderBy(asc(volunteersTable.displayPosition), asc(volunteersTable.createdAt));

  for (let i = 0; i < all.length; i++) {
    const expectedPos = i + 1;
    if (all[i].displayPosition !== expectedPos) {
      await db
        .update(volunteersTable)
        .set({ displayPosition: expectedPos })
        .where(eq(volunteersTable.id, all[i].id));
    }
  }
}

// ── Public Routes ────────────────────────────────────────────────────────────

router.get("/volunteers", async (req, res): Promise<void> => {
  try {
    const volunteers = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.status, "approved"))
      .orderBy(asc(volunteersTable.displayPosition), asc(volunteersTable.createdAt));

    res.json(volunteers.map(formatVolunteer));
  } catch (err: any) {
    res.status(500).json({ error: "Unable to load volunteers. Please try again." });
  }
});

router.post("/volunteers", async (req, res): Promise<void> => {
  const parsed = JoinVolunteerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [volunteer] = await db
    .insert(volunteersTable)
    .values({
      ...parsed.data,
      position: parsed.data.role,
      mobileNumber: parsed.data.phone,
    })
    .returning();

  res.status(201).json(formatVolunteer(volunteer));
});

// ── Admin Routes ─────────────────────────────────────────────────────────────

router.get("/admin/volunteers", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const volunteers = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.status, "approved"))
      .orderBy(asc(volunteersTable.displayPosition), asc(volunteersTable.createdAt));

    res.json(volunteers.map(formatVolunteer));
  } catch (err: any) {
    res.status(500).json({ error: "Unable to load volunteers. Please try again." });
  }
});

router.post("/admin/volunteers", requireRole("Super Admin"), async (req, res): Promise<void> => {
  try {
    const name = String(req.body.name || "").trim();
    const photo = String(req.body.photo || req.body.photoUrl || "").trim();
    const mobileNumber = String(req.body.mobileNumber || req.body.phone || "").trim();
    const position = String(req.body.position || req.body.role || "").trim();

    if (!name) {
      res.status(400).json({ error: "Please enter the volunteer's name." });
      return;
    }
    if (!photo) {
      res.status(400).json({ error: "Please upload the volunteer's photo." });
      return;
    }
    if (!mobileNumber) {
      res.status(400).json({ error: "Please enter the volunteer's mobile number." });
      return;
    }
    if (!position) {
      res.status(400).json({ error: "Please enter the volunteer's position." });
      return;
    }

    const existing = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.status, "approved"))
      .orderBy(asc(volunteersTable.displayPosition), asc(volunteersTable.createdAt));

    const maxPos = existing.length + 1;
    let targetPos = Number(req.body.displayPosition);
    if (isNaN(targetPos) || targetPos < 1) targetPos = maxPos;
    if (targetPos > maxPos) targetPos = maxPos;

    // Shift existing volunteers down to make room
    if (targetPos <= existing.length) {
      await db
        .update(volunteersTable)
        .set({ displayPosition: sql`${volunteersTable.displayPosition} + 1` })
        .where(
          and(
            eq(volunteersTable.status, "approved"),
            sql`${volunteersTable.displayPosition} >= ${targetPos}`
          )
        );
    }

    const [created] = await db
      .insert(volunteersTable)
      .values({
        name,
        photo,
        mobileNumber,
        phone: mobileNumber,
        position,
        role: position,
        displayPosition: targetPos,
        status: "approved",
      })
      .returning();

    await normalizeDisplayPositions();

    const [fresh] = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.id, created.id));

    res.status(201).json(formatVolunteer(fresh || created));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Unable to add volunteer." });
  }
});

router.put("/admin/volunteers/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid volunteer id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Volunteer not found" });
      return;
    }

    const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
    const photo = req.body.photo !== undefined && String(req.body.photo).trim() !== ""
      ? String(req.body.photo).trim()
      : (existing.photo || existing.phone); // keep existing photo if none provided
    const mobileNumber = req.body.mobileNumber !== undefined ? String(req.body.mobileNumber).trim() : (existing.mobileNumber || existing.phone || "");
    const position = req.body.position !== undefined ? String(req.body.position).trim() : (existing.position || existing.role || "");

    if (!name) {
      res.status(400).json({ error: "Please enter the volunteer's name." });
      return;
    }
    if (!mobileNumber) {
      res.status(400).json({ error: "Please enter the volunteer's mobile number." });
      return;
    }
    if (!position) {
      res.status(400).json({ error: "Please enter the volunteer's position." });
      return;
    }

    const allApproved = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.status, "approved"))
      .orderBy(asc(volunteersTable.displayPosition), asc(volunteersTable.createdAt));

    const oldPos = existing.displayPosition || 1;
    let newPos = req.body.displayPosition !== undefined ? Number(req.body.displayPosition) : oldPos;
    if (isNaN(newPos) || newPos < 1) newPos = 1;
    if (newPos > allApproved.length) newPos = allApproved.length;

    if (newPos !== oldPos) {
      if (newPos < oldPos) {
        // Shift items in [newPos, oldPos - 1] up by 1
        await db
          .update(volunteersTable)
          .set({ displayPosition: sql`${volunteersTable.displayPosition} + 1` })
          .where(
            and(
              eq(volunteersTable.status, "approved"),
              sql`${volunteersTable.displayPosition} >= ${newPos}`,
              sql`${volunteersTable.displayPosition} < ${oldPos}`,
              sql`${volunteersTable.id} != ${id}`
            )
          );
      } else {
        // Shift items in [oldPos + 1, newPos] down by 1
        await db
          .update(volunteersTable)
          .set({ displayPosition: sql`${volunteersTable.displayPosition} - 1` })
          .where(
            and(
              eq(volunteersTable.status, "approved"),
              sql`${volunteersTable.displayPosition} > ${oldPos}`,
              sql`${volunteersTable.displayPosition} <= ${newPos}`,
              sql`${volunteersTable.id} != ${id}`
            )
          );
      }
    }

    const [updated] = await db
      .update(volunteersTable)
      .set({
        name,
        photo,
        mobileNumber,
        phone: mobileNumber,
        position,
        role: position,
        displayPosition: newPos,
        updatedAt: new Date(),
      })
      .where(eq(volunteersTable.id, id))
      .returning();

    await normalizeDisplayPositions();

    const [fresh] = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.id, id));

    res.json(formatVolunteer(fresh || updated));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Unable to update volunteer." });
  }
});

router.patch("/admin/volunteers/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  // Delegate patch to put logic
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid volunteer id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(volunteersTable)
    .where(eq(volunteersTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Volunteer not found" });
    return;
  }

  const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
  const photo = req.body.photo !== undefined && String(req.body.photo).trim() !== ""
    ? String(req.body.photo).trim()
    : existing.photo;
  const mobileNumber = req.body.mobileNumber !== undefined ? String(req.body.mobileNumber).trim() : (existing.mobileNumber || existing.phone || "");
  const position = req.body.position !== undefined ? String(req.body.position).trim() : (existing.position || existing.role || "");

  const allApproved = await db
    .select()
    .from(volunteersTable)
    .where(eq(volunteersTable.status, "approved"))
    .orderBy(asc(volunteersTable.displayPosition), asc(volunteersTable.createdAt));

  const oldPos = existing.displayPosition || 1;
  let newPos = req.body.displayPosition !== undefined ? Number(req.body.displayPosition) : oldPos;
  if (isNaN(newPos) || newPos < 1) newPos = 1;
  if (newPos > allApproved.length) newPos = allApproved.length;

  if (newPos !== oldPos) {
    if (newPos < oldPos) {
      await db
        .update(volunteersTable)
        .set({ displayPosition: sql`${volunteersTable.displayPosition} + 1` })
        .where(
          and(
            eq(volunteersTable.status, "approved"),
            sql`${volunteersTable.displayPosition} >= ${newPos}`,
            sql`${volunteersTable.displayPosition} < ${oldPos}`,
            sql`${volunteersTable.id} != ${id}`
          )
        );
    } else {
      await db
        .update(volunteersTable)
        .set({ displayPosition: sql`${volunteersTable.displayPosition} - 1` })
        .where(
          and(
            eq(volunteersTable.status, "approved"),
            sql`${volunteersTable.displayPosition} > ${oldPos}`,
            sql`${volunteersTable.displayPosition} <= ${newPos}`,
            sql`${volunteersTable.id} != ${id}`
          )
        );
    }
  }

  const [updated] = await db
    .update(volunteersTable)
    .set({
      name,
      photo,
      mobileNumber,
      phone: mobileNumber,
      position,
      role: position,
      displayPosition: newPos,
      updatedAt: new Date(),
    })
    .where(eq(volunteersTable.id, id))
    .returning();

  await normalizeDisplayPositions();

  const [fresh] = await db
    .select()
    .from(volunteersTable)
    .where(eq(volunteersTable.id, id));

  res.json(formatVolunteer(fresh || updated));
});

router.delete("/admin/volunteers/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid volunteer id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Volunteer not found" });
      return;
    }

    await db.delete(volunteersTable).where(eq(volunteersTable.id, id));

    await normalizeDisplayPositions();

    res.json({ success: true, message: "Volunteer deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Unable to delete volunteer." });
  }
});

export default router;

