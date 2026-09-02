import dotenv from "dotenv";
import pg from "pg";

const envPath = new URL("../../../.env", import.meta.url);
dotenv.config({ path: envPath });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS festival_countdowns (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Festival Countdown',
      target_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NOT NULL,
      title TEXT,
      description TEXT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      display_on_homepage BOOLEAN NOT NULL DEFAULT FALSE,
      display_on_public_page BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE festival_countdowns ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE festival_countdowns ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE festival_countdowns ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
    UPDATE festival_countdowns SET name = COALESCE(NULLIF(name, ''), NULLIF(title, ''), 'Festival Countdown') WHERE name IS NULL OR name = '';
    UPDATE festival_countdowns SET end_at = target_at + INTERVAL '1 day' WHERE end_at IS NULL;
    ALTER TABLE festival_countdowns ALTER COLUMN end_at SET NOT NULL;
    ALTER TABLE festival_countdowns ALTER COLUMN name SET NOT NULL;
    ALTER TABLE festival_countdowns ADD COLUMN IF NOT EXISTS display_on_public_page BOOLEAN NOT NULL DEFAULT FALSE;
    DROP INDEX IF EXISTS idx_festival_countdowns_festival_id;
    DO $$ DECLARE constraint_name TEXT; BEGIN
      FOR constraint_name IN
        SELECT con.conname FROM pg_constraint con
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'festival_countdowns'::regclass AND att.attname = 'festival_id'
      LOOP
        EXECUTE format('ALTER TABLE festival_countdowns DROP CONSTRAINT IF EXISTS %I', constraint_name);
      END LOOP;
    END $$;
    ALTER TABLE festival_countdowns DROP COLUMN IF EXISTS festival_id;
    ALTER TABLE festival_countdowns DROP COLUMN IF EXISTS title;
    ALTER TABLE festival_countdowns DROP COLUMN IF EXISTS display_on_festival_page;
    CREATE INDEX IF NOT EXISTS idx_festival_countdowns_homepage ON festival_countdowns(display_on_homepage) WHERE enabled = TRUE;
  `);
  console.log("festival_countdowns is ready and independent");
} finally {
  await pool.end();
}
