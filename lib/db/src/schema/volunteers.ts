import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";

export const volunteersTable = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  photo: text("photo"),
  mobileNumber: text("mobile_number"),
  position: text("position"),
  displayPosition: integer("display_position").notNull().default(1),
  phone: text("phone"),
  email: text("email"),
  role: text("role"),
  flatNumber: text("flat_number"),
  status: text("status").notNull().default("approved"), // pending | approved | rejected
  festivalId: integer("festival_id").references(() => festivalsTable.id),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVolunteerSchema = createInsertSchema(volunteersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type Volunteer = typeof volunteersTable.$inferSelect;

