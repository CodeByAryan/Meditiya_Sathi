import { Router, type IRouter } from "express";
import { db, marketplaceItemsTable } from "@workspace/db";
import { eq, desc, ilike, and } from "drizzle-orm";
import {
  CreateMarketplaceItemBody,
  DeleteMarketplaceItemParams,
  ListMarketplaceItemsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/marketplace", async (req, res): Promise<void> => {
  const params = ListMarketplaceItemsQueryParams.safeParse(req.query);
  const category = params.success ? params.data.category : undefined;
  const type = params.success ? params.data.type : undefined;
  const search = params.success ? params.data.search : undefined;

  let conditions: any[] = [eq(marketplaceItemsTable.isAvailable, true)];
  if (category) conditions.push(eq(marketplaceItemsTable.category, category));
  if (type && type !== "all") conditions.push(eq(marketplaceItemsTable.listingType, type));
  if (search) conditions.push(ilike(marketplaceItemsTable.title, `%${search}%`));

  const items = await db
    .select()
    .from(marketplaceItemsTable)
    .where(and(...conditions))
    .orderBy(desc(marketplaceItemsTable.createdAt));

  res.json(items.map(i => ({ ...i, price: i.price ? parseFloat(String(i.price)) : null })));
});

router.post("/marketplace", async (req, res): Promise<void> => {
  const parsed = CreateMarketplaceItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [item] = await db.insert(marketplaceItemsTable).values({
    ...parsed.data,
    price: parsed.data.price != null ? String(parsed.data.price) : null,
  }).returning();
  res.status(201).json({ ...item, price: item.price ? parseFloat(String(item.price)) : null });
});

router.delete("/marketplace/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
  res.sendStatus(204);
});

export default router;
