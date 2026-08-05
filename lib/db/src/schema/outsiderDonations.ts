import { pgTable, text, serial, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";

/**
 * Outsider Donations Table
 * Records donations received from non-residents (people outside the society).
 * This module is completely independent from the resident donation system.
 */
export const outsiderDonationsTable = pgTable("outsider_donations", {
  id: serial("id").primaryKey(),
  festivalId: integer("festival_id").notNull().references(() => festivalsTable.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email"),
  address: text("address"),
  amount: numeric("amount", { precision: 10, scale: 2 }), // nullable for pending
  paymentStatus: text("payment_status").notNull().default("pending"), // paid | pending
  paymentMethod: text("payment_method").notNull().default("pending"), // pending | cash | upi | bank_transfer | cheque
  pendingReason: text("pending_reason"),
  paymentDate: date("payment_date", { mode: "string" }),
  receiptNumber: text("receipt_number").unique(),
  receiptGeneratedAt: timestamp("receipt_generated_at", { withTimezone: true }),
  notes: text("notes"),
  collectedByAdminId: text("collected_by_admin_id").notNull(),
  collectedByAdminName: text("collected_by_admin_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOutsiderDonationSchema = createInsertSchema(outsiderDonationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  receiptNumber: true,
  receiptGeneratedAt: true,
});
export type InsertOutsiderDonation = z.infer<typeof insertOutsiderDonationSchema>;
export type OutsiderDonation = typeof outsiderDonationsTable.$inferSelect;
