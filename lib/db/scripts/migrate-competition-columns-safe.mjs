import { loadEnvFile } from "node:process";
import pg from "pg";
loadEnvFile("../../.env");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()");
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS created_by_admin_id text");
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS registration_start timestamptz");
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS registration_end timestamptz");
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS voting_start timestamptz");
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS voting_end timestamptz");
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS max_images integer NOT NULL DEFAULT 3");
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS results_published integer NOT NULL DEFAULT 0");
  await client.query("COMMIT");
  console.log("Added only missing competition metadata columns.");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
