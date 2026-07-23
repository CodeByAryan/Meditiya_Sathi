import { pgTable, text, serial, timestamp, integer, numeric, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";

export const festivalDonationsTable = pgTable("festival_donations", {
  id: serial("id").primaryKey(),
  festivalId: integer("festival_id").notNull().references(() => festivalsTable.id, { onDelete: "cascade" }),
  residentId: integer("resident_id").notNull(),
  paymentMethod: text("payment_method").notNull().default("pending"), // pending | cash | upi | bank_transfer | cheque
  amount: numeric("amount", { precision: 10, scale: 2 }), // nullable for pending
  paymentDate: date("payment_date", { mode: "string" }), // nullable for pending
  receiptNumber: text("receipt_number").unique(),
  receiptGeneratedAt: timestamp("receipt_generated_at", { withTimezone: true }),
  notes: text("notes"),
  collectedByAdminId: text("collected_by_admin_id").notNull(),
  collectedByAdminName: text("collected_by_admin_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  // One record per resident per festival
  uniqueResidentPerFestival: uniqueIndex("idx_festdonation_resident_festival").on(table.festivalId, table.residentId),
}));

export const insertFestivalDonationSchema = createInsertSchema(festivalDonationsTable).omit({ id: true, createdAt: true, updatedAt: true, receiptNumber: true, receiptGeneratedAt: true });
export type InsertFestivalDonation = z.infer<typeof insertFestivalDonationSchema>;
export type FestivalDonation = typeof festivalsTable.$inferSelect;

