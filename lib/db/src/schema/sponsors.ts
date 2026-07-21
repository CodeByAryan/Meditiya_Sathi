import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { festivalsTable } from "./festivals";

export const sponsorsTable = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  tier: text("tier").notNull().default("bronze"), // platinum | gold | silver | bronze
  festivalId: integer("festival_id").references(() => festivalsTable.id),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertSponsorSchema = createInsertSchema(sponsorsTable).omit({ id: true });
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type Sponsor = typeof sponsorsTable.$inferSelect;

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  flatNumber: text("flat_number").notNull(),
  message: text("message").notNull(),
  rating: integer("rating").notNull().default(5),
  photoUrl: text("photo_url"),
});

export const insertTestimonialSchema = createInsertSchema(testimonialsTable).omit({ id: true });
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonialsTable.$inferSelect;
