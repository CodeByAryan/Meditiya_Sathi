import { pgTable, text, serial, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
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
  bannerImageUrl: text("banner_image_url"),
  youtubeUrl: text("youtube_url"),
  history: text("history"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFestivalSchema = createInsertSchema(festivalsTable).omit({ id: true, createdAt: true });
export type InsertFestival = z.infer<typeof insertFestivalSchema>;
export type Festival = typeof festivalsTable.$inferSelect;
