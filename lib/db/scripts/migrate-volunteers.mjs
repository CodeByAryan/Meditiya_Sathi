import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  try {
    const envContent = readFileSync(path.join(root, ".env"), "utf8");
    const line = envContent.split(/\r?\n/).find((value) => value.trim().startsWith("DATABASE_URL="));
    databaseUrl = line?.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  } catch {}
}

if (!databaseUrl) {
  console.log("No DATABASE_URL found, skipping migration.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id serial PRIMARY KEY,
      name text NOT NULL,
      phone text,
      email text,
      role text,
      flat_number text,
      status text NOT NULL DEFAULT 'approved',
      festival_id integer,
      user_id text,
      photo text,
      mobile_number text,
      position text,
      display_position integer NOT NULL DEFAULT 1,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );
  `);
  await pool.query("ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS photo text");
  await pool.query("ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS mobile_number text");
  await pool.query("ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS position text");
  await pool.query("ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS display_position integer NOT NULL DEFAULT 1");
  await pool.query("ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now()");
  await pool.query("UPDATE volunteers SET mobile_number = phone WHERE mobile_number IS NULL AND phone IS NOT NULL");
  await pool.query("UPDATE volunteers SET position = role WHERE position IS NULL AND role IS NOT NULL");
  console.log("Volunteer migration complete.");
} catch (err) {
  console.error("Migration error:", err.message);
} finally {
  await pool.end();
}
