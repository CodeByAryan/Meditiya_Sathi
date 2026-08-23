import { Router, type IRouter } from "express";
import { db, serviceRequestsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";
import { publicFormRateLimiter } from "../middlewares/rateLimiter";
import { eq, desc, and, ne } from "drizzle-orm";
import {
  CreateServiceRequestBody,
  UpdateServiceRequestParams,
  UpdateServiceRequestBody,
  ListServiceRequestsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services/requests", async (req, res): Promise<void> => {
  const params = ListServiceRequestsQueryParams.safeParse(req.query);
  const status = params.success ? params.data.status : undefined;
  const category = params.success ? params.data.category : undefined;

  let conditions: any[] = [];
  if (status && status !== "all") conditions.push(eq(serviceRequestsTable.status, status));
  if (category) conditions.push(eq(serviceRequestsTable.category, category));

  const requests = await db
    .select()
    .from(serviceRequestsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(serviceRequestsTable.createdAt));

  res.json(requests);
});

router.post("/services/requests", publicFormRateLimiter, async (req, res): Promise<void> => {
  const parsed = CreateServiceRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [request] = await db.insert(serviceRequestsTable).values(parsed.data).returning();
  res.status(201).json(request);
});

router.patch("/services/requests/:id", requireAdmin(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateServiceRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [request] = await db.update(serviceRequestsTable).set(parsed.data).where(eq(serviceRequestsTable.id, id)).returning();
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(request);
});

export default router;
