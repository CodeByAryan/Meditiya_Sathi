import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";

export const donationsTable = pgTable("donations", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  donorName: text("donor_name").notNull(),
  donorPhone: text("donor_phone"),
  festivalId: integer("festival_id").references(() => festivalsTable.id),
  transactionId: text("transaction_id"),
  method: text("method").notNull().default("cash"), // upi | cash | online
  message: text("message"),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDonationSchema = createInsertSchema(donationsTable).omit({ id: true, createdAt: true });
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donationsTable.$inferSelect;
