import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: new URL("../../../.env", import.meta.url) });
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`
    ALTER TABLE albums ADD COLUMN IF NOT EXISTS slug TEXT;
    ALTER TABLE albums ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE albums ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE albums ADD COLUMN IF NOT EXISTS cover_photo_id INTEGER;
    ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS public_id TEXT;
    ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE albums SET slug = lower(regexp_replace(trim(title), '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
    UPDATE albums SET slug = concat(slug, '-', id) WHERE slug IN (SELECT slug FROM albums GROUP BY slug HAVING count(*) > 1);
    ALTER TABLE albums ALTER COLUMN slug SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS albums_slug_unique ON albums(slug);
  `);
  console.log("Gallery album fields are ready");
} finally { await pool.end(); }
