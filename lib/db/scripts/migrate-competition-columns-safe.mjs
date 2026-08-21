import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, "../../../.env");

function parseEnv(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = parseEnv(readFileSync(rootEnvPath, "utf8"));
const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString: databaseUrl });
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
  await client.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS rules text");
  await client.query("COMMIT");
  console.log("Added only missing competition metadata columns.");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
