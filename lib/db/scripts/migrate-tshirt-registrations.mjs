import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function main() {
  const rootEnvPath = path.resolve(__dirname, "../../../.env");
  const env = parseEnv(readFileSync(rootEnvPath, "utf8"));
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not found in .env");
  }

  try {
    const u = new URL(databaseUrl);
    console.log(`Connected to: ${u.host}${u.pathname}`);
  } catch {
    console.log("Connected to: <unable to parse host>");
  }

  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    console.log("\nApplying migration: create tshirt_registrations table");

    await client.query(`
      CREATE TABLE IF NOT EXISTS tshirt_registrations (
        id SERIAL PRIMARY KEY,
        festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        mobile_number TEXT NOT NULL,
        building_id INTEGER NOT NULL REFERENCES buildings(id),
        wing_id INTEGER REFERENCES wings(id),
        t_shirt_size TEXT NOT NULL,
        chest_size NUMERIC(5, 2) NOT NULL,
        paid_to_admin_id TEXT,
        paid_to_name TEXT,
        payment_mode TEXT NOT NULL DEFAULT 'pending',
        pending_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("  ✔ tshirt_registrations table created");

    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tshirt_registrations'`
    );
    console.log(`  Verify: ${res.rows.length} columns present ✔`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
