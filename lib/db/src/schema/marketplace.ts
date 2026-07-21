import { pgTable, text, serial, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketplaceItemsTable = pgTable("marketplace_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  listingType: text("listing_type").notNull(), // sell | buy | donate
  price: numeric("price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  sellerName: text("seller_name").notNull(),
  sellerPhone: text("seller_phone").notNull(),
  userId: text("user_id"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMarketplaceItemSchema = createInsertSchema(marketplaceItemsTable).omit({ id: true, createdAt: true });
export type InsertMarketplaceItem = z.infer<typeof insertMarketplaceItemSchema>;
export type MarketplaceItem = typeof marketplaceItemsTable.$inferSelect;
