import { pgTable, text, serial, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminsTable = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email"),
  mobileNumber: text("mobile_number").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("Admin"), // Super Admin | Admin
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  lastLogin: timestamp("last_login", { withTimezone: true }),
});

export const insertAdminSchema = createInsertSchema(adminsTable).omit({ id: true, createdAt: true, updatedAt: true, lastLogin: true });
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof adminsTable.$inferSelect;

