import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const albumsTable = pgTable("albums", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  year: integer("year").notNull(),
  festival: text("festival"),
  coverImageUrl: text("cover_image_url"),
  coverPhotoId: integer("cover_photo_id"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const galleryPhotosTable = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id").notNull().references(() => albumsTable.id),
  imageUrl: text("image_url").notNull(),
  publicId: text("public_id"),
  title: text("title"),
  description: text("description"),
  caption: text("caption"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlbumSchema = createInsertSchema(albumsTable).omit({ id: true, createdAt: true });
export type InsertAlbum = z.infer<typeof insertAlbumSchema>;
export type Album = typeof albumsTable.$inferSelect;

export const insertGalleryPhotoSchema = createInsertSchema(galleryPhotosTable).omit({ id: true, createdAt: true });
export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;
export type GalleryPhoto = typeof galleryPhotosTable.$inferSelect;
