import { pgTable, text, serial, timestamp, integer, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";
import { residentsTable } from "./residents";

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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdByAdminId: text("created_by_admin_id"),
  registrationStart: timestamp("registration_start", { withTimezone: true }),
  registrationEnd: timestamp("registration_end", { withTimezone: true }),
  votingStart: timestamp("voting_start", { withTimezone: true }),
  votingEnd: timestamp("voting_end", { withTimezone: true }),
  maxImages: integer("max_images").notNull().default(3),
  resultsPublished: integer("results_published").notNull().default(0),
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

/** Decoration submissions are separate from the legacy generic registrations. */
export const competitionEntriesTable = pgTable("competition_entries", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitionsTable.id),
  residentId: integer("resident_id").notNull().references(() => residentsTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  reviewedByAdminId: text("reviewed_by_admin_id"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  oneEntryPerResident: uniqueIndex("idx_competition_entries_competition_resident").on(table.competitionId, table.residentId),
  competitionStatus: index("idx_competition_entries_status").on(table.competitionId, table.status),
}));

export const competitionEntryImagesTable = pgTable("competition_entry_images", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => competitionEntriesTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  cloudinaryPublicId: text("cloudinary_public_id").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  entryOrder: uniqueIndex("idx_competition_entry_images_order").on(table.entryId, table.displayOrder),
}));

export const competitionVotesTable = pgTable("competition_votes", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitionsTable.id),
  entryId: integer("entry_id").notNull().references(() => competitionEntriesTable.id),
  voterHash: text("voter_hash").notNull(),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  riskStatus: text("risk_status").notNull().default("normal"),
  riskScore: integer("risk_score").notNull().default(0),
  riskMetadata: jsonb("risk_metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  voterOncePerCompetition: uniqueIndex("idx_competition_votes_unique_voter").on(table.competitionId, table.voterHash),
  competitionEntry: index("idx_competition_votes_competition_entry").on(table.competitionId, table.entryId),
  riskLookup: index("idx_competition_votes_risk").on(table.competitionId, table.riskStatus),
}));

export const competitionSecurityAttemptsTable = pgTable("competition_security_attempts", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").references(() => competitionsTable.id),
  entryId: integer("entry_id"),
  attemptType: text("attempt_type").notNull(),
  outcome: text("outcome").notNull(),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  competitionCreated: index("idx_competition_security_attempts_created").on(table.competitionId, table.createdAt),
}));

export const insertCompetitionSchema = createInsertSchema(competitionsTable).omit({ id: true, createdAt: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitionsTable.$inferSelect;

export const insertCompetitionRegistrationSchema = createInsertSchema(competitionRegistrationsTable).omit({ id: true, registeredAt: true });
export type InsertCompetitionRegistration = z.infer<typeof insertCompetitionRegistrationSchema>;
export type CompetitionRegistration = typeof competitionRegistrationsTable.$inferSelect;
