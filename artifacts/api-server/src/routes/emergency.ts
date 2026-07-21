import { Router, type IRouter } from "express";
import { db, emergencyContactsTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/emergency", async (_req, res): Promise<void> => {
  const contacts = await db.select().from(emergencyContactsTable).orderBy(asc(emergencyContactsTable.displayOrder));
  res.json(contacts);
});

export default router;
