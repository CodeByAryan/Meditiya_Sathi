import { Router, type IRouter } from "express";
import { db, festivalsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateFestivalBody, GetFestivalParams } from "@workspace/api-zod";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();

router.get("/festivals", async (_req, res): Promise<void> => {
  const festivals = await db.select().from(festivalsTable).orderBy(desc(festivalsTable.year), festivalsTable.startDate);
  res.json(festivals);
});

router.post("/festivals", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const parsed = CreateFestivalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [festival] = await db.insert(festivalsTable).values(parsed.data).returning();
  res.status(201).json(festival);
});

router.get("/festivals/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [festival] = await db.select().from(festivalsTable).where(eq(festivalsTable.slug, slug));
  if (!festival) { res.status(404).json({ error: "Festival not found" }); return; }
  res.json(festival);
});

export default router;
