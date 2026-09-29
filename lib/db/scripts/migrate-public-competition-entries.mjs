import { loadEnvFile } from "node:process";
import pg from "pg";
loadEnvFile("../../.env");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`ALTER TABLE competition_entries ADD COLUMN IF NOT EXISTS entry_code text UNIQUE, ADD COLUMN IF NOT EXISTS participant_name text, ADD COLUMN IF NOT EXISTS mobile text, ADD COLUMN IF NOT EXISTS email text, ADD COLUMN IF NOT EXISTS instagram_username text, ADD COLUMN IF NOT EXISTS competition_category text, ADD COLUMN IF NOT EXISTS submission_url text, ADD COLUMN IF NOT EXISTS submission_file_name text`);
  await client.query(`ALTER TABLE competition_registrations ADD COLUMN IF NOT EXISTS entry_code text UNIQUE, ADD COLUMN IF NOT EXISTS instagram_username text, ADD COLUMN IF NOT EXISTS participating_events jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await client.query("ALTER TABLE competition_entries ALTER COLUMN resident_id DROP NOT NULL");
  await client.query("COMMIT");
  console.log("Public competition entry fields are ready.");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
