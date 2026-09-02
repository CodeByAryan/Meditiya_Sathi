import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const festivalCountdownsTable = pgTable("festival_countdowns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAt: timestamp("target_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  displayOnHomepage: boolean("display_on_homepage").notNull().default(false),
  displayOnPublicPage: boolean("display_on_public_page").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type FestivalCountdown = typeof festivalCountdownsTable.$inferSelect;
