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
    console.log("\nApplying migration: add assigned_volunteer_id columns (nullable text)");

    await client.query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS assigned_volunteer_id text;
    `);
    console.log("  ✔ events.assigned_volunteer_id");

    await client.query(`
      ALTER TABLE festivals
        ADD COLUMN IF NOT EXISTS assigned_volunteer_id text;
    `);
    console.log("  ✔ festivals.assigned_volunteer_id");

    // Verify
    for (const table of ["events", "festivals"]) {
      const res = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'assigned_volunteer_id'`,
        [table]
      );
      console.log(`  Verify ${table}.assigned_volunteer_id: ${res.rows.length > 0 ? "PRESENT ✔" : "MISSING ✘"}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

