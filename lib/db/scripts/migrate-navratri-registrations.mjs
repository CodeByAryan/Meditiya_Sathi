import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(path.join(root, ".env"), "utf8");
    return env.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("DATABASE_URL="))
      ?.split("=").slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

const databaseUrl = readDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL is required to run the Navratri registration migration");

const pool = new pg.Pool({ connectionString: databaseUrl });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS instagram_username text, ADD COLUMN IF NOT EXISTS selected_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await client.query("COMMIT");
  console.log("Navratri registration migration completed successfully");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
