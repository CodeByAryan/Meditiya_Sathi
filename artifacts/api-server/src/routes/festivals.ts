import { Router, type IRouter } from "express";
import { db, festivalsTable } from "@workspace/db";
import { eq, desc, and, or } from "drizzle-orm";
import { CreateFestivalBody, GetFestivalParams } from "@workspace/api-zod";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();
const publicFestivalFields = {
  id: festivalsTable.id,
  name: festivalsTable.name,
  slug: festivalsTable.slug,
  description: festivalsTable.description,
  shortDescription: festivalsTable.shortDescription,
  year: festivalsTable.year,
  startDate: festivalsTable.startDate,
  endDate: festivalsTable.endDate,
  venue: festivalsTable.venue,
  bannerImageUrl: festivalsTable.bannerImageUrl,
  googleDriveUrl: festivalsTable.googleDriveUrl,
  status: festivalsTable.status,
  homepageVisible: festivalsTable.homepageVisible,
  isHomepageFeatured: festivalsTable.isHomepageFeatured,
  isActive: festivalsTable.isActive,
};

// Public homepage featured festival endpoint
router.get("/festivals/homepage/showcase", async (_req, res): Promise<void> => {
  // First look for explicitly featured & visible festival
  let [festival] = await db
    .select(publicFestivalFields)
    .from(festivalsTable)
    .where(
      and(
        eq(festivalsTable.isHomepageFeatured, true),
        eq(festivalsTable.homepageVisible, true),
        eq(festivalsTable.isActive, true),
      )
    )
    .limit(1);

  // If none explicitly featured, fallback to the latest active festival with homepageVisible != false
  if (!festival) {
    [festival] = await db
      .select(publicFestivalFields)
      .from(festivalsTable)
      .where(
        and(
          eq(festivalsTable.homepageVisible, true),
          eq(festivalsTable.isActive, true),
        )
      )
      .orderBy(desc(festivalsTable.year), festivalsTable.startDate)
      .limit(1);
  }

  // If still none, check if any active festival exists and return null or first active
  if (!festival) {
    res.json({ festival: null });
    return;
  }

  res.json({ festival });
});
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
  const param = (Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug)?.trim();
  if (!param) {
    res.status(404).json({ error: "Festival not found" });
    return;
  }

  const numId = parseInt(param, 10);
  const condition = !isNaN(numId) && String(numId) === param
    ? or(eq(festivalsTable.slug, param), eq(festivalsTable.id, numId))
    : eq(festivalsTable.slug, param);

  const [festival] = await db
    .select(publicFestivalFields)
    .from(festivalsTable)
    .where(and(condition, eq(festivalsTable.isActive, true)));

  if (!festival) {
    res.status(404).json({ error: "Festival not found" });
    return;
  }
  res.json(festival);
});

export default router;
