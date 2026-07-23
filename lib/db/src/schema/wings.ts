import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";

export const wingsTable = pgTable("wings", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").notNull().references(() => buildingsTable.id, { onDelete: "cascade" }),
  wingName: text("wing_name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWingSchema = createInsertSchema(wingsTable).omit({ id: true, createdAt: true });
export type InsertWing = z.infer<typeof insertWingSchema>;
export type Wing = typeof wingsTable.$inferSelect;

