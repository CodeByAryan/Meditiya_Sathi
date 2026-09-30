import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export type NavratriRuleSection = {
  key: string;
  title: string;
  eventId: number | null;
  content: string;
  displayOrder: number;
  enabled: boolean;
};

export const navratriCompetitionContentTable = pgTable("navratri_competition_content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Navratri 2026 Competition"),
  introduction: text("introduction").notNull().default("Participate. Create. Celebrate. Join the Meditiya Sathi Navratri 2026 competition and share your festive spirit with our community."),
  // Kept for backwards compatibility with existing records. New public/admin flows use ruleSections.
  rules: jsonb("rules").$type<string[]>().notNull().default([]),
  generalRules: text("general_rules").notNull().default(""),
  ruleSections: jsonb("rule_sections").$type<NavratriRuleSection[]>().notNull().default([]),
  googleFormUrl: text("google_form_url"),
  contactName: text("contact_name").notNull().default("Meditiya Mitra Mandal"),
  contactPhone: text("contact_phone").notNull().default("+91 8108388000"),
  contactEmail: text("contact_email").notNull().default("medtiyasathi@gmail.com"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type NavratriCompetitionContent = typeof navratriCompetitionContentTable.$inferSelect;
