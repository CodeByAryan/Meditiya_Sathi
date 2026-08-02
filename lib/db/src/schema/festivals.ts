import { pgTable, text, serial, timestamp, boolean, integer, date, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const festivalsTable = pgTable("festivals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  year: integer("year").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  expectedDonation: numeric("expected_donation", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("upcoming"), // upcoming | active | completed
  bannerImageUrl: text("banner_image_url"),
  youtubeUrl: text("youtube_url"),
  history: text("history"),
  isActive: boolean("is_active").notNull().default(true),
  assignedVolunteerId: text("assigned_volunteer_id"), // FK to admins.id (UUID) — Volunteer assigned to this festival
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  nameYearUnique: uniqueIndex("idx_festival_name_year").on(table.name, table.year),
}));

export const insertFestivalSchema = createInsertSchema(festivalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFestival = z.infer<typeof insertFestivalSchema>;
export type Festival = typeof festivalsTable.$inferSelect;
