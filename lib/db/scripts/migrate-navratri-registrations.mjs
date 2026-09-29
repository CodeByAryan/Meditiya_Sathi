import { loadEnvFile } from "node:process";
import pg from "pg";
loadEnvFile("../../.env");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS instagram_username text, ADD COLUMN IF NOT EXISTS selected_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await client.query("COMMIT");
  console.log("Navratri registration fields are ready.");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
