import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const committeeMembersTable = pgTable("committee_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  photoUrl: text("photo_url"),
  flatNumber: text("flat_number"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertCommitteeMemberSchema = createInsertSchema(committeeMembersTable).omit({ id: true });
export type InsertCommitteeMember = z.infer<typeof insertCommitteeMemberSchema>;
export type CommitteeMember = typeof committeeMembersTable.$inferSelect;
