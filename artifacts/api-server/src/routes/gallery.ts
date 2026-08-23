import { Router, type IRouter } from "express";
import { db, albumsTable, galleryPhotosTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";
import {
  CreateAlbumBody,
  ListAlbumPhotosParams,
  AddPhotoToAlbumParams,
  AddPhotoToAlbumBody,
  ListAlbumsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/gallery/albums", async (req, res): Promise<void> => {
  const params = ListAlbumsQueryParams.safeParse(req.query);
  const year = params.success ? params.data.year : undefined;

  let conditions: any[] = [];
  if (year) conditions.push(eq(albumsTable.year, year));

  const albums = await db
    .select()
    .from(albumsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(albumsTable.year), desc(albumsTable.createdAt));

  const withCounts = await Promise.all(
    albums.map(async (album) => {
      const [row] = await db.select({ count: count() }).from(galleryPhotosTable).where(eq(galleryPhotosTable.albumId, album.id));
      return { ...album, photoCount: row.count };
    })
  );

  res.json(withCounts);
});

router.post("/gallery/albums", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const parsed = CreateAlbumBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [album] = await db.insert(albumsTable).values(parsed.data).returning();
  res.status(201).json({ ...album, photoCount: 0 });
});

router.get("/gallery/albums/:id/photos", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const photos = await db.select().from(galleryPhotosTable).where(eq(galleryPhotosTable.albumId, id)).orderBy(desc(galleryPhotosTable.createdAt));
  res.json(photos);
});

router.post("/gallery/albums/:id/photos", requireRole("Super Admin", "Admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = AddPhotoToAlbumBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [photo] = await db.insert(galleryPhotosTable).values({ ...parsed.data, albumId: id }).returning();
  res.status(201).json(photo);
});

router.get("/gallery/featured", async (_req, res): Promise<void> => {
  const photos = await db
    .select()
    .from(galleryPhotosTable)
    .where(eq(galleryPhotosTable.isFeatured, true))
    .orderBy(desc(galleryPhotosTable.createdAt))
    .limit(12);

  if (photos.length === 0) {
    const allPhotos = await db.select().from(galleryPhotosTable).orderBy(desc(galleryPhotosTable.createdAt)).limit(12);
    res.json(allPhotos);
    return;
  }

  res.json(photos);
});

export default router;
