import { pgTable, serial, integer, text, numeric, date, timestamp, index, uuid } from "drizzle-orm/pg-core";
import { festivalsTable } from "./festivals";
import { adminsTable } from "./admins";

export const festivalExpensesTable = pgTable("festival_expenses", {
  id: serial("id").primaryKey(),
  festivalId: integer("festival_id").notNull().references(() => festivalsTable.id, { onDelete: "cascade" }),
  expenseName: text("expense_name").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  vendorName: text("vendor_name"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => adminsTable.id),
  createdByAdminName: text("created_by_admin_name").notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => adminsTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  festivalIdx: index("idx_festival_expenses_festival_id").on(table.festivalId),
  dateIdx: index("idx_festival_expenses_expense_date").on(table.expenseDate),
  paymentMethodIdx: index("idx_festival_expenses_payment_method").on(table.paymentMethod),
  categoryIdx: index("idx_festival_expenses_category").on(table.category),
  addedByIdx: index("idx_festival_expenses_added_by_admin_id").on(table.createdByAdminId),
}));

export type InsertFestivalExpense = typeof festivalExpensesTable.$inferInsert;
export type FestivalExpense = typeof festivalExpensesTable.$inferSelect;
