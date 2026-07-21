import { Router, type IRouter } from "express";
import { db, lostFoundItemsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateLostFoundItemBody, ListLostFoundItemsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/lostfound", async (req, res): Promise<void> => {
  const params = ListLostFoundItemsQueryParams.safeParse(req.query);
  const type = params.success ? params.data.type : undefined;

  let conditions: any[] = [];
  if (type && type !== "all") conditions.push(eq(lostFoundItemsTable.type, type));

  const items = await db
    .select()
    .from(lostFoundItemsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(lostFoundItemsTable.createdAt));

  res.json(items);
});

router.post("/lostfound", async (req, res): Promise<void> => {
  const parsed = CreateLostFoundItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [item] = await db.insert(lostFoundItemsTable).values(parsed.data).returning();
  res.status(201).json(item);
});

export default router;
