import { Router, type IRouter } from "express";
import { db, sponsorsTable, testimonialsTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sponsors", async (_req, res): Promise<void> => {
  const sponsors = await db.select().from(sponsorsTable).orderBy(asc(sponsorsTable.displayOrder));
  res.json(sponsors);
});

router.get("/testimonials", async (_req, res): Promise<void> => {
  const testimonials = await db.select().from(testimonialsTable);
  res.json(testimonials);
});

export default router;
