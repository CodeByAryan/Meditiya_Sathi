import { Router, type IRouter } from "express";
import { db, albumsTable, galleryPhotosTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../middlewares/requireRole";
import {
  CreateAlbumBody,
  ListAlbumPhotosParams,
  AddPhotoToAlbumParams,
  AddPhotoToAlbumBody,
  ListAlbumsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const CreateAlbumRequest = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullish(),
  year: z.coerce.number().int().optional(),
  festival: z.string().trim().nullish(),
  coverImageUrl: z.string().url().nullish(),
  isPublished: z.boolean().default(false),
});
const AddPhotoRequest = z.object({
  imageUrl: z.string().min(1),
  publicId: z.string().nullish(),
  title: z.string().trim().nullish(),
  description: z.string().trim().nullish(),
  caption: z.string().trim().nullish(),
  isFeatured: z.boolean().default(false),
});
function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function publicAlbum(album: typeof albumsTable.$inferSelect, photoCount: number, coverImageUrl: string | null) {
  return { id: album.id, title: album.title, slug: album.slug, description: album.description, coverImageUrl: album.coverImageUrl || coverImageUrl, photoCount, createdAt: album.createdAt };
}

router.get("/gallery/albums", async (req, res): Promise<void> => {
  const params = ListAlbumsQueryParams.safeParse(req.query);
  const year = params.success ? params.data.year : undefined;
  const conditions = [eq(albumsTable.isPublished, true)];
  if (year) conditions.push(eq(albumsTable.year, year));
  const albums = await db.select().from(albumsTable).where(and(...conditions)).orderBy(desc(albumsTable.year), desc(albumsTable.createdAt));
  const withCounts = await Promise.all(albums.map(async (album) => {
    const [row] = await db.select({ count: count() }).from(galleryPhotosTable).where(and(eq(galleryPhotosTable.albumId, album.id), eq(galleryPhotosTable.isFeatured, true)));
    const [cover] = await db.select({ imageUrl: galleryPhotosTable.imageUrl }).from(galleryPhotosTable).where(and(eq(galleryPhotosTable.albumId, album.id), eq(galleryPhotosTable.isFeatured, true))).orderBy(desc(galleryPhotosTable.createdAt)).limit(1);
    return publicAlbum(album, row.count, cover?.imageUrl || null);
  }));
  res.json(withCounts);
});

router.get("/gallery/albums/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [album] = await db.select().from(albumsTable).where(and(eq(albumsTable.slug, slug), eq(albumsTable.isPublished, true)));
  if (!album) { res.status(404).json({ error: "Album not found" }); return; }
  const photos = await db.select().from(galleryPhotosTable).where(and(eq(galleryPhotosTable.albumId, album.id), eq(galleryPhotosTable.isFeatured, true))).orderBy(desc(galleryPhotosTable.createdAt));
  res.json({ album: publicAlbum(album, photos.length, null), photos: photos.map(({ publicId: _publicId, ...photo }) => photo) });
});

router.get("/admin/gallery/albums", requireRole("Super Admin", "Admin"), async (_req, res): Promise<void> => {
  const albums = await db.select().from(albumsTable).orderBy(desc(albumsTable.createdAt));
  const withCounts = await Promise.all(albums.map(async (album) => {
    const [row] = await db.select({ count: count() }).from(galleryPhotosTable).where(eq(galleryPhotosTable.albumId, album.id));
    return { ...album, photoCount: row.count };
  }));
  res.json(withCounts);
});

router.post("/gallery/albums", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const input = CreateAlbumRequest.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: input.error.message }); return; }
  const data = input.data;
  const baseSlug = slugify(data.title) || `album-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;
  while ((await db.select({ id: albumsTable.id }).from(albumsTable).where(eq(albumsTable.slug, slug))).length) slug = `${baseSlug}-${suffix++}`;
  const [album] = await db.insert(albumsTable).values({ ...data, year: data.year || new Date().getFullYear(), slug, description: data.description || null, festival: data.festival || null, coverImageUrl: data.coverImageUrl || null }).returning();
  res.status(201).json({ ...album, photoCount: 0 });
});

router.patch("/gallery/albums/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || typeof req.body?.isPublished !== "boolean") { res.status(400).json({ error: "Invalid album update" }); return; }
  const [album] = await db.update(albumsTable).set({ isPublished: req.body.isPublished, updatedAt: new Date() }).where(eq(albumsTable.id, id)).returning();
  if (!album) { res.status(404).json({ error: "Album not found" }); return; }
  res.json(album);
});

router.delete("/gallery/albums/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid album id" }); return; }
  const deleted = await db.transaction(async (tx) => {
    await tx.delete(galleryPhotosTable).where(eq(galleryPhotosTable.albumId, id));
    return tx.delete(albumsTable).where(eq(albumsTable.id, id)).returning({ id: albumsTable.id });
  });
  if (!deleted.length) { res.status(404).json({ error: "Album not found" }); return; }
  res.status(204).end();
});

router.get("/admin/gallery/albums/:id/photos", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const photos = await db.select().from(galleryPhotosTable).where(eq(galleryPhotosTable.albumId, id)).orderBy(desc(galleryPhotosTable.createdAt));
  res.json(photos);
});

router.get("/gallery/albums/:id/photos", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [album] = await db.select({ id: albumsTable.id }).from(albumsTable).where(and(eq(albumsTable.id, id), eq(albumsTable.isPublished, true)));
  if (!album) { res.status(404).json({ error: "Album not found" }); return; }
  const photos = await db.select().from(galleryPhotosTable).where(and(eq(galleryPhotosTable.albumId, id), eq(galleryPhotosTable.isFeatured, true))).orderBy(desc(galleryPhotosTable.createdAt));
  res.json(photos.map(({ publicId: _publicId, ...photo }) => photo));
});

router.post("/gallery/albums/:id/photos", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [album] = await db.select({ id: albumsTable.id }).from(albumsTable).where(eq(albumsTable.id, id));
  if (!album) { res.status(404).json({ error: "Album not found" }); return; }

  const parsed = AddPhotoRequest.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [photo] = await db.insert(galleryPhotosTable).values({ ...parsed.data, albumId: id, caption: parsed.data.caption || null, publicId: parsed.data.publicId || null, title: parsed.data.title || null, description: parsed.data.description || null }).returning();
  res.status(201).json(photo);
});

router.patch("/gallery/photos/:id", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const update: Record<string, unknown> = {};
  if (typeof req.body?.caption === "string") update.caption = req.body.caption.trim() || null;
  if (typeof req.body?.isFeatured === "boolean") update.isFeatured = req.body.isFeatured;
  if (typeof req.body?.title === "string") update.title = req.body.title.trim() || null;
  if (typeof req.body?.description === "string") update.description = req.body.description.trim() || null;
  if (!Object.keys(update).length) { res.status(400).json({ error: "No valid changes supplied" }); return; }
  const [photo] = await db.update(galleryPhotosTable).set(update).where(eq(galleryPhotosTable.id, id)).returning();
  if (!photo) { res.status(404).json({ error: "Photo not found" }); return; }
  res.json(photo);
});

router.delete("/gallery/photos/:id", requireRole("Super Admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [photo] = await db.delete(galleryPhotosTable).where(eq(galleryPhotosTable.id, id)).returning({ id: galleryPhotosTable.id });
  if (!photo) { res.status(404).json({ error: "Photo not found" }); return; }
  res.status(204).end();
});

router.get("/gallery/featured", async (_req, res): Promise<void> => {
  const photos = await db
    .select({ id: galleryPhotosTable.id, albumId: galleryPhotosTable.albumId, imageUrl: galleryPhotosTable.imageUrl, caption: galleryPhotosTable.caption, isFeatured: galleryPhotosTable.isFeatured, createdAt: galleryPhotosTable.createdAt })
    .from(galleryPhotosTable)
    .innerJoin(albumsTable, eq(galleryPhotosTable.albumId, albumsTable.id))
    .where(and(eq(galleryPhotosTable.isFeatured, true), eq(albumsTable.isPublished, true)))
    .orderBy(desc(galleryPhotosTable.createdAt))
    .limit(12);
  res.json(photos);
});

export default router;
