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
    console.log("\nApplying migration: make chest_size optional in tshirt_registrations");

    await client.query(`
      ALTER TABLE tshirt_registrations
        ALTER COLUMN chest_size DROP NOT NULL;
    `);
    console.log("  ✔ tshirt_registrations.chest_size is now nullable");

    // Verify
    const res = await client.query(
      `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'tshirt_registrations' AND column_name = 'chest_size'`
    );
    const nullable = res.rows.length > 0 && res.rows[0].is_nullable === "YES";
    console.log(`  Verify tshirt_registrations.chest_size nullable: ${nullable ? "YES ✔" : "NO ✘"}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
