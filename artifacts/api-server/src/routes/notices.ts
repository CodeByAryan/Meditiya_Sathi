import { Router, type IRouter } from "express";
import { db, noticesTable } from "@workspace/db";
import { eq, desc, ilike, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

import {
  CreateNoticeBody,
  UpdateNoticeBody,
  GetNoticeParams,
  UpdateNoticeParams,
  DeleteNoticeParams,
  ListNoticesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notices", async (req, res): Promise<void> => {
  const params = ListNoticesQueryParams.safeParse(req.query);
  const category = params.success ? params.data.category : undefined;
  const search = params.success ? params.data.search : undefined;
  const limit = params.success && params.data.limit ? params.data.limit : 50;

  let conditions: any[] = [];
  if (category) conditions.push(eq(noticesTable.category, category));
  if (search) conditions.push(ilike(noticesTable.title, `%${search}%`));

  const notices = await db
    .select()
    .from(noticesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(noticesTable.isPinned), desc(noticesTable.createdAt))
    .limit(limit);

  res.json(notices);
});

router.get("/notices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [notice] = await db.select().from(noticesTable).where(eq(noticesTable.id, id));
  if (!notice) { res.status(404).json({ error: "Notice not found" }); return; }
  res.json(notice);
});

router.post("/notices", requireAdmin(), async (req, res): Promise<void> => {
  const parsed = CreateNoticeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [notice] = await db.insert(noticesTable).values(parsed.data).returning();
  res.status(201).json(notice);
});

router.patch("/notices/:id", requireAdmin(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateNoticeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [notice] = await db.update(noticesTable).set(parsed.data).where(eq(noticesTable.id, id)).returning();
  if (!notice) { res.status(404).json({ error: "Notice not found" }); return; }
  res.json(notice);
});

router.delete("/notices/:id", requireAdmin(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(noticesTable).where(eq(noticesTable.id, id));
  res.sendStatus(204);
});

export default router;
