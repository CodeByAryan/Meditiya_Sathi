import { Router, type IRouter } from "express";
import { db, festivalsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateFestivalBody, GetFestivalParams } from "@workspace/api-zod";
import { requireRole } from "../middlewares/requireRole";
import { z } from "zod";

const router: IRouter = Router();
const publicFestivalFields = {
  id: festivalsTable.id,
  name: festivalsTable.name,
  slug: festivalsTable.slug,
  description: festivalsTable.description,
  year: festivalsTable.year,
  startDate: festivalsTable.startDate,
  endDate: festivalsTable.endDate,
  bannerImageUrl: festivalsTable.bannerImageUrl,
  googleDriveUrl: festivalsTable.googleDriveUrl,
  status: festivalsTable.status,
  isActive: festivalsTable.isActive,
};
const driveUrlSchema = z.string().url().refine((value) => /^https:\/\/drive\.google\.com\//i.test(value), "Please enter a valid Google Drive link.");

router.get("/festivals", async (_req, res): Promise<void> => {
  const festivals = await db.select(publicFestivalFields).from(festivalsTable).where(eq(festivalsTable.isActive, true)).orderBy(desc(festivalsTable.year), festivalsTable.startDate);
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

  const [festival] = await db.select(publicFestivalFields).from(festivalsTable).where(and(eq(festivalsTable.slug, slug), eq(festivalsTable.isActive, true)));
  if (!festival) { res.status(404).json({ error: "Festival not found" }); return; }
  res.json(festival);
});

export default router;
