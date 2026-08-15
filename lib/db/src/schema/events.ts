import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  // Kept separately for clear display and editable forms; `date` remains the
  // canonical instant used by the existing summary/countdown queries.
  eventTime: text("event_time"),
  endDate: timestamp("end_date", { withTimezone: true }),
  location: text("location").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("upcoming"), // upcoming | ongoing | completed | cancelled
  maxParticipants: integer("max_participants"),
  festivalId: integer("festival_id").references(() => festivalsTable.id),
  assignedVolunteerId: text("assigned_volunteer_id"), // references admin.id for volunteer assignment
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const eventRegistrationsTable = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  userId: text("user_id"),
  userName: text("user_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  familyMembers: integer("family_members").default(1),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrationsTable).omit({ id: true, registeredAt: true });
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrationsTable.$inferSelect;
