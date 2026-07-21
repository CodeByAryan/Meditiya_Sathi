import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";

export const competitionsTable = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  ageGroup: text("age_group"),
  venue: text("venue"),
  prizes: text("prizes"),
  status: text("status").notNull().default("upcoming"),
  maxParticipants: integer("max_participants"),
  festivalId: integer("festival_id").references(() => festivalsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const competitionRegistrationsTable = pgTable("competition_registrations", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitionsTable.id),
  participantName: text("participant_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  ageGroup: text("age_group"),
  userId: text("user_id"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const competitionWinnersTable = pgTable("competition_winners", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitionsTable.id),
  participantName: text("participant_name").notNull(),
  position: integer("position").notNull(),
  prize: text("prize"),
});

export const insertCompetitionSchema = createInsertSchema(competitionsTable).omit({ id: true, createdAt: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitionsTable.$inferSelect;

export const insertCompetitionRegistrationSchema = createInsertSchema(competitionRegistrationsTable).omit({ id: true, registeredAt: true });
export type InsertCompetitionRegistration = z.infer<typeof insertCompetitionRegistrationSchema>;
export type CompetitionRegistration = typeof competitionRegistrationsTable.$inferSelect;
