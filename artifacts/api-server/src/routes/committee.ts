import { Router, type IRouter } from "express";
import { db, committeeMembersTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import { CreateCommitteeMemberBody } from "@workspace/api-zod";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();

router.get("/committee", async (_req, res): Promise<void> => {
  const members = await db.select().from(committeeMembersTable).orderBy(asc(committeeMembersTable.displayOrder));
  res.json(members);
});

router.post("/committee", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const parsed = CreateCommitteeMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [member] = await db.insert(committeeMembersTable).values(parsed.data).returning();
  res.status(201).json(member);
});

export default router;
