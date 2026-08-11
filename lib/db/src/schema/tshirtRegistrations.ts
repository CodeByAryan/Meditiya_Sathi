import { pgTable, text, serial, timestamp, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";
import { buildingsTable } from "./buildings";
import { wingsTable } from "./wings";

/**
 * T-Shirt Registrations Table
 * Records festival-specific t-shirt registrations for residents.
 * Each registration is linked to a festival (festival_id) and reuses the
 * existing buildings, wings, and admins (paid_to) data where possible.
 */
export const tshirtRegistrationsTable = pgTable("tshirt_registrations", {
  id: serial("id").primaryKey(),
  festivalId: integer("festival_id").notNull().references(() => festivalsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  buildingId: integer("building_id").notNull().references(() => buildingsTable.id),
  wingId: integer("wing_id").references(() => wingsTable.id),
  tShirtSize: text("t_shirt_size").notNull(), // XS | S | M | L | XL | XXL | XXXL
  tShirtSizeNumeric: integer("t_shirt_size_numeric"), // optional numeric size (e.g. 42)
  quantity: integer("quantity").notNull().default(1), // 1-5 shirts per registration
  tshirtPrice: integer("tshirt_price").notNull().default(250), // 230 | 250 (price per single t-shirt)
  totalAmount: integer("total_amount").notNull().default(0), // tshirt_price × quantity (server-calculated)
  chestSize: numeric("chest_size", { precision: 5, scale: 2 }), // inches (optional)
  paidToAdminId: text("paid_to_admin_id"), // FK to admins.id (UUID)
  paidToName: text("paid_to_name"), // denormalized for display
  paymentMode: text("payment_mode").notNull().default("pending"), // cash | upi | online | pending
  pendingReason: text("pending_reason"),
  // ── T-Shirt Collection / Distribution ──────────────────────────────────
  collectionId: text("collection_id"), // unique public ID e.g. TSH-2026-0001
  collectionStatus: text("collection_status").notNull().default("pending"), // pending | collected
  collectedAt: timestamp("collected_at", { withTimezone: true }),
  collectedByAdminId: text("collected_by_admin_id"), // FK to admins.id (UUID)
  collectedByName: text("collected_by_name"), // denormalized for display
  collectionNotes: text("collection_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  collectionIdIdx: uniqueIndex("idx_tshirt_collection_id").on(table.collectionId),
}));

export const insertTshirtRegistrationSchema = createInsertSchema(tshirtRegistrationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTshirtRegistration = z.infer<typeof insertTshirtRegistrationSchema>;
export type TshirtRegistration = typeof tshirtRegistrationsTable.$inferSelect;
