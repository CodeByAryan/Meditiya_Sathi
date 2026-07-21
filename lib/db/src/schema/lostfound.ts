import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lostFoundItemsTable = pgTable("lost_found_items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // lost | found
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  imageUrl: text("image_url"),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  isResolved: boolean("is_resolved").notNull().default(false),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLostFoundItemSchema = createInsertSchema(lostFoundItemsTable).omit({ id: true, createdAt: true });
export type InsertLostFoundItem = z.infer<typeof insertLostFoundItemSchema>;
export type LostFoundItem = typeof lostFoundItemsTable.$inferSelect;
