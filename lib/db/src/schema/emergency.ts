import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emergencyContactsTable = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContactsTable).omit({ id: true });
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;
export type EmergencyContact = typeof emergencyContactsTable.$inferSelect;
