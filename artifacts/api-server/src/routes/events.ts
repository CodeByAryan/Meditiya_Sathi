import { Router, type IRouter } from "express";
import { db, eventsTable, eventRegistrationsTable } from "@workspace/db";
import { requireRole } from "../middlewares/requireRole";
import { publicFormRateLimiter } from "../middlewares/rateLimiter";
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
import { z } from "zod";

const router: IRouter = Router();

const AdminEventBody = CreateEventBody.extend({
  eventTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Event time must use HH:MM format").optional(),
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).optional(),
});

const AdminEventUpdateBody = UpdateEventBody.extend({
  eventTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Event time must use HH:MM format").nullable().optional(),
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).optional(),
});

function isCloudinaryImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

// ── Admin routes for event management ──────────────────────────────────────

router.get("/admin/events", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const params = ListEventsQueryParams.safeParse(req.query);
    const status = params.success ? params.data.status : "all";
    const limit = params.success && params.data.limit ? params.data.limit : 50;

    const now = new Date();
    let conditions: any[] = [];

    // Volunteers only see events assigned to them
    if (admin.role === "Volunteer") {
      conditions.push(eq(eventsTable.assignedVolunteerId, admin.id));
    }

    if (status === "upcoming") conditions.push(gte(eventsTable.date, now));
    if (status === "past") conditions.push(lt(eventsTable.date, now));

    const events = await db
      .select()
      .from(eventsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(eventsTable.date))
      .limit(limit);

    const withCounts = await Promise.all(
      events.map(async (event) => {
        const [reg] = await db.select({ count: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.eventId, event.id));
        return { ...event, registrationCount: reg.count };
      })
    );

    res.json(withCounts);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch events" });
  }
});

router.get("/admin/events/upcoming/summary", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const now = new Date();
    let conditions: any[] = [gte(eventsTable.date, now)];

    if (admin.role === "Volunteer") {
      conditions.push(eq(eventsTable.assignedVolunteerId, admin.id));
    }

    const events = await db
      .select()
      .from(eventsTable)
      .where(and(...conditions))
      .orderBy(eventsTable.date)
      .limit(3);

    const withCounts = await Promise.all(
      events.map(async (event) => {
        const [reg] = await db.select({ count: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.eventId, event.id));
        return { ...event, registrationCount: reg.count };
      })
    );

    res.json(withCounts);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch event summary" });
  }
});

router.get("/admin/events/:id", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const admin = (req as any).admin;

    // Volunteers can only access events assigned to them
    if (admin.role === "Volunteer") {
      const [event] = await db
        .select({ id: eventsTable.id, assignedVolunteerId: eventsTable.assignedVolunteerId })
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      if (event.assignedVolunteerId !== admin.id) {
        res.status(403).json({ error: "You can only view events assigned to you" });
        return;
      }
    }

    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }

    const [reg] = await db.select({ count: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.eventId, id));
    res.json({ ...event, registrationCount: reg.count });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch event" });
  }
});

// ── Create event: Only Super Admin and Admin ────────────────────────────────
router.post("/admin/events", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const parsed = AdminEventBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    if (parsed.data.imageUrl && !isCloudinaryImageUrl(parsed.data.imageUrl)) {
      res.status(400).json({ error: "Event image must be a secure Cloudinary URL." });
      return;
    }

    const [event] = await db.insert(eventsTable).values({
      ...parsed.data,
      date: new Date(parsed.data.date),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      createdBy: (req as any).admin.id,
    }).returning();
    res.status(201).json({ ...event, registrationCount: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to create event" });
  }
});

// ── Update event: Super Admin, Admin, or assigned Volunteer ────────────────
router.patch("/admin/events/:id", requireRole("Super Admin", "Admin", "Volunteer"), async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const admin = (req as any).admin;

    // Volunteer can only edit events assigned to them
    if (admin.role === "Volunteer") {
      const [event] = await db
        .select({ id: eventsTable.id, assignedVolunteerId: eventsTable.assignedVolunteerId })
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      if (event.assignedVolunteerId !== admin.id) {
        res.status(403).json({ error: "You can only edit events assigned to you" });
        return;
      }
    }

    const parsed = AdminEventUpdateBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    if (parsed.data.imageUrl && !isCloudinaryImageUrl(parsed.data.imageUrl)) {
      res.status(400).json({ error: "Event image must be a secure Cloudinary URL." });
      return;
    }

    const updateData: any = { ...parsed.data };

    // Prevent Volunteer from changing ownership or creating events
    if (admin.role === "Volunteer") {
      delete updateData.assignedVolunteerId;
    }

    if (updateData.date) updateData.date = new Date(updateData.date);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const [event] = await db.update(eventsTable).set(updateData).where(eq(eventsTable.id, id)).returning();
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }

    const [reg] = await db.select({ count: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.eventId, id));
    res.json({ ...event, registrationCount: reg.count });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update event" });
  }
});

// ── Delete event: Only Super Admin and Admin ────────────────────────────────
router.delete("/admin/events/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete event" });
  }
});

// ── Assign volunteer to event: Only Super Admin and Admin ──────────────────
router.patch("/admin/events/:id/assign-volunteer", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { volunteerId } = req.body || {};
    if (!volunteerId) {
      res.status(400).json({ error: "Volunteer ID is required" });
      return;
    }

    const [event] = await db
      .update(eventsTable)
      .set({ assignedVolunteerId: String(volunteerId) })
      .where(eq(eventsTable.id, id))
      .returning();

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to assign volunteer" });
  }
});

// ── Public event routes (no auth required) ─────────────────────────────────
router.get("/events", async (req, res): Promise<void> => {
  const params = ListEventsQueryParams.safeParse(req.query);
  const status = params.success ? params.data.status : "all";
  const limit = params.success && params.data.limit ? params.data.limit : 50;

  const now = new Date();
  let conditions: any[] = [];
  if (status === "upcoming") conditions.push(gte(eventsTable.date, now), eq(eventsTable.status, "upcoming"));
  if (status === "past") conditions.push(lt(eventsTable.date, now));

  const events = await db
    .select()
    .from(eventsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(status === "upcoming" ? eventsTable.date : desc(eventsTable.date))
    .limit(limit);

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
    .where(and(gte(eventsTable.date, now), eq(eventsTable.status, "upcoming")))
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

router.post("/events/:id/register", publicFormRateLimiter, async (req, res): Promise<void> => {
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
