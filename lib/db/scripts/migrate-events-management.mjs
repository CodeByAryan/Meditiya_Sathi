import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const line = readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/).find((value) => value.trim().startsWith("DATABASE_URL="));
const databaseUrl = line?.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
if (!databaseUrl) throw new Error("DATABASE_URL not found in .env");

const pool = new pg.Pool({ connectionString: databaseUrl });
try {
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time text");
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by text");
  console.log("Event Management migration complete: event_time and created_by are available.");
} finally {
  await pool.end();
}
