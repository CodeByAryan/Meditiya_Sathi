import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(path.join(root, ".env"), "utf8");
    return env.split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith("DATABASE_URL="))?.split("=").slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
  } catch { return undefined; }
}

const databaseUrl = readDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL is required to run the Navratri competition content migration");
const pool = new pg.Pool({ connectionString: databaseUrl });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`
    CREATE TABLE IF NOT EXISTS navratri_competition_content (
      id serial PRIMARY KEY,
      title text NOT NULL DEFAULT 'Navratri 2026 Competition',
      introduction text NOT NULL DEFAULT 'Participate. Create. Celebrate. Join the Meditiya Sathi Navratri 2026 competition and share your festive spirit with our community.',
      rules jsonb NOT NULL DEFAULT '[]'::jsonb,
      google_form_url text,
      contact_name text NOT NULL DEFAULT 'Meditiya Mitra Mandal',
      contact_phone text NOT NULL DEFAULT '+91 8108388000',
      contact_email text NOT NULL DEFAULT 'medtiyasathi@gmail.com',
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await client.query(`INSERT INTO navratri_competition_content (rules) SELECT $1::jsonb WHERE NOT EXISTS (SELECT 1 FROM navratri_competition_content)`, [JSON.stringify([
    "Entries must follow the official competition theme and instructions shared by the organising committee.",
    "Please submit accurate information through the official Google Form before the registration deadline.",
    "The organising committee's decision regarding eligibility, judging and results will be final.",
  ])]);
  await client.query("COMMIT");
  console.log("Navratri competition content migration completed successfully");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
