import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { wingsTable } from "./wings";

export const residentsTable = pgTable("residents", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  mobile: text("mobile").notNull().unique(),
  buildingId: integer("building_id").notNull().references(() => buildingsTable.id),
  wingId: integer("wing_id").references(() => wingsTable.id),
  flatNo: text("flat_no").notNull(),
  address: text("address"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  buildingWingFlatUnique: uniqueIndex("idx_residents_building_wing_flat").on(table.buildingId, table.wingId, table.flatNo),
}));

export const insertResidentSchema = createInsertSchema(residentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResident = z.infer<typeof insertResidentSchema>;
export type Resident = typeof residentsTable.$inferSelect;

