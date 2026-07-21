import { Router, type IRouter } from "express";
import { db, eventsTable, eventRegistrationsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";
import { eq, desc, gte, lte, lt, count, and, sql } from "drizzle-orm";
import {
  CreateEventBody,
  UpdateEventBody,
  GetEventParams,
  UpdateEventParams,
  DeleteEventParams,
  RegisterForEventParams,
  RegisterForEventBody,
  ListEventsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const params = ListEventsQueryParams.safeParse(req.query);
  const status = params.success ? params.data.status : "all";
  const limit = params.success && params.data.limit ? params.data.limit : 50;

  const now = new Date();
  let query = db.select().from(eventsTable);

  let conditions: any[] = [];
  if (status === "upcoming") conditions.push(gte(eventsTable.date, now));
  if (status === "past") conditions.push(lt(eventsTable.date, now));

  const events = await db
    .select()
    .from(eventsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(eventsTable.date))
    .limit(limit);

  // Add registration counts
  const withCounts = await Promise.all(
    events.map(async (event) => {
      const [reg] = await db.select({ count: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.eventId, event.id));
      return { ...event, registrationCount: reg.count };
    })
  );

  res.json(withCounts);
});

router.get("/events/upcoming/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const events = await db
    .select()
    .from(eventsTable)
    .where(gte(eventsTable.date, now))
    .orderBy(eventsTable.date)
    .limit(3);

  const withCounts = await Promise.all(
    events.map(async (event) => {
      const [reg] = await db.select({ count: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.eventId, event.id));
      return { ...event, registrationCount: reg.count };
    })
  );

  res.json(withCounts);
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const [reg] = await db.select({ count: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.eventId, id));
  res.json({ ...event, registrationCount: reg.count });
});

router.post("/events", requireAdmin(), async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [event] = await db.insert(eventsTable).values({
    ...parsed.data,
    date: new Date(parsed.data.date),
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
  }).returning();
  res.status(201).json({ ...event, registrationCount: 0 });
});

router.patch("/events/:id", requireAdmin(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: any = { ...parsed.data };
  if (updateData.date) updateData.date = new Date(updateData.date);
  if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

  const [event] = await db.update(eventsTable).set(updateData).where(eq(eventsTable.id, id)).returning();
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const [reg] = await db.select({ count: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.eventId, id));
  res.json({ ...event, registrationCount: reg.count });
});

router.delete("/events/:id", requireAdmin(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.sendStatus(204);
});

router.post("/events/:id/register", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = RegisterForEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [registration] = await db.insert(eventRegistrationsTable).values({
    eventId: id,
    userName: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email ?? null,
    familyMembers: parsed.data.familyMembers ?? 1,
  }).returning();

  res.status(201).json({
    ...registration,
    userId: registration.userId ?? "",
    userName: registration.userName ?? "",
    registeredAt: registration.registeredAt.toISOString(),
  });
});

export default router;
