import { Router, type IRouter } from "express";
import { db, volunteersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { JoinVolunteerBody, ListVolunteersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/volunteers", async (req, res): Promise<void> => {
  const params = ListVolunteersQueryParams.safeParse(req.query);

  const volunteers = await db
    .select()
    .from(volunteersTable)
    .where(eq(volunteersTable.status, "approved"))
    .orderBy(desc(volunteersTable.createdAt));

  res.json(volunteers);
});

router.post("/volunteers", async (req, res): Promise<void> => {
  const parsed = JoinVolunteerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [volunteer] = await db.insert(volunteersTable).values(parsed.data).returning();
  res.status(201).json(volunteer);
});

export default router;
