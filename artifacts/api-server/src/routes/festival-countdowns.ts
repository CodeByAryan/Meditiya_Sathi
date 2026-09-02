import { Router, type IRouter } from "express";
import { and, asc, eq, ne } from "drizzle-orm";
import { db, festivalCountdownsTable } from "@workspace/db";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();
const INDIA_OFFSET = "+05:30";

function shape(row: any) {
  return { id: row.id, name: row.name, targetAt: row.targetAt, endAt: row.endAt, description: row.description, enabled: row.enabled, displayOnHomepage: row.displayOnHomepage, displayOnPublicPage: row.displayOnPublicPage };
}
function publicShape(row: any) {
  return { id: row.id, name: row.name, targetAt: row.targetAt, endAt: row.endAt, description: row.description };
}
function targetAt(date: unknown, time?: unknown) {
  if (typeof date !== "string") return null;
  const value = typeof time === "string" ? new Date(`${date}T${time}:00${INDIA_OFFSET}`) : new Date(date);
  return Number.isNaN(value.getTime()) ? null : value;
}
async function clearHomepage(exceptId?: number) {
  await db.update(festivalCountdownsTable).set({ displayOnHomepage: false }).where(exceptId ? ne(festivalCountdownsTable.id, exceptId) : eq(festivalCountdownsTable.displayOnHomepage, true));
}

router.get("/admin/festival-countdowns", requireRole("Super Admin", "Admin"), async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(festivalCountdownsTable).orderBy(asc(festivalCountdownsTable.targetAt));
    res.json({ countdowns: rows.map(shape) });
  } catch (error: any) { res.status(500).json({ error: error?.message || "Failed to load countdowns" }); }
});

router.post("/admin/festival-countdowns", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const at = body.targetAt ? targetAt(body.targetAt) : targetAt(body.targetDate, body.targetTime);
    const endAt = body.endAt ? targetAt(body.endAt) : at ? new Date(at.getTime() + 24 * 60 * 60 * 1000) : null;
    if (!name || !at || !endAt || endAt <= at) { res.status(400).json({ error: "Countdown name, target time, and a later end time are required" }); return; }
    if (body.displayOnHomepage === true) await clearHomepage();
    const [created] = await db.insert(festivalCountdownsTable).values({ name, targetAt: at, endAt, description: typeof body.description === "string" ? body.description.trim() || null : null, enabled: body.enabled !== false, displayOnHomepage: body.displayOnHomepage === true, displayOnPublicPage: body.displayOnPublicPage === true }).returning();
    res.status(201).json(shape(created));
  } catch (error: any) { res.status(500).json({ error: error?.message || "Failed to create countdown" }); }
});

router.patch("/admin/festival-countdowns/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id); const body = req.body || {};
    const [current] = await db.select().from(festivalCountdownsTable).where(eq(festivalCountdownsTable.id, id)).limit(1);
    if (!current) { res.status(404).json({ error: "Countdown not found" }); return; }
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) { if (typeof body.name !== "string" || !body.name.trim()) { res.status(400).json({ error: "Countdown name is required" }); return; } update.name = body.name.trim(); }
    if (body.targetAt !== undefined || body.targetDate !== undefined || body.targetTime !== undefined) {
      const at = body.targetAt ? targetAt(body.targetAt) : targetAt(body.targetDate || current.targetAt.toISOString().slice(0, 10), body.targetTime || current.targetAt.toISOString().slice(11, 16));
      if (!at) { res.status(400).json({ error: "Target date and time are invalid" }); return; } update.targetAt = at;
    }
    if (body.endAt !== undefined) {
      const endAt = targetAt(body.endAt);
      if (!endAt) { res.status(400).json({ error: "End time is invalid" }); return; }
      update.endAt = endAt;
    }
    const effectiveTargetAt = (update.targetAt as Date | undefined) || current.targetAt;
    const effectiveEndAt = (update.endAt as Date | undefined) || current.endAt;
    if (effectiveEndAt <= effectiveTargetAt) { res.status(400).json({ error: "End time must be later than target time" }); return; }
    for (const field of ["description", "enabled", "displayOnHomepage", "displayOnPublicPage"] as const) if (body[field] !== undefined) update[field] = typeof body[field] === "string" ? body[field].trim() || null : body[field];
    if (body.displayOnHomepage === true) await clearHomepage(id);
    const [updated] = await db.update(festivalCountdownsTable).set(update).where(eq(festivalCountdownsTable.id, id)).returning();
    res.json(shape(updated));
  } catch (error: any) { res.status(500).json({ error: error?.message || "Failed to update countdown" }); }
});

router.delete("/admin/festival-countdowns/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  const [deleted] = await db.delete(festivalCountdownsTable).where(eq(festivalCountdownsTable.id, Number(req.params.id))).returning({ id: festivalCountdownsTable.id });
  if (!deleted) { res.status(404).json({ error: "Countdown not found" }); return; } res.status(204).end();
});

function activeCountdown(visibility: "homepage" | "public") {
  return async (_req: any, res: any): Promise<void> => {
    try {
      const visibilityColumn = visibility === "homepage" ? festivalCountdownsTable.displayOnHomepage : festivalCountdownsTable.displayOnPublicPage;
      const [row] = await db.select().from(festivalCountdownsTable).where(and(eq(festivalCountdownsTable.enabled, true), eq(visibilityColumn, true))).orderBy(asc(festivalCountdownsTable.targetAt)).limit(1);
      res.json({ countdown: row ? publicShape(row) : null });
    } catch (error: any) { res.status(500).json({ error: error?.message || "Failed to load active countdown" }); }
  };
}
router.get("/festival-countdowns/homepage", activeCountdown("homepage"));
router.get("/festival-countdowns/active", activeCountdown("public"));
router.get("/festival-countdown/active", activeCountdown("homepage"));

router.get("/festival-countdown/festival-pages", async (_req, res): Promise<void> => {
  const rows = await db.select().from(festivalCountdownsTable).where(and(eq(festivalCountdownsTable.enabled, true), eq(festivalCountdownsTable.displayOnPublicPage, true))).orderBy(asc(festivalCountdownsTable.targetAt));
  res.json(rows.map(publicShape));
});

export default router;
