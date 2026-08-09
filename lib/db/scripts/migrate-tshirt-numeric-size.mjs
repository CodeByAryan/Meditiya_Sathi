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
    console.log("\nApplying migration: add t_shirt_size_numeric to tshirt_registrations");

    // Add column if it doesn't already exist
    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tshirt_registrations' AND column_name = 't_shirt_size_numeric'`
    );
    if (colRes.rows.length === 0) {
      await client.query(`
        ALTER TABLE tshirt_registrations
          ADD COLUMN t_shirt_size_numeric integer;
      `);
      console.log("  ✔ Added tshirt_registrations.t_shirt_size_numeric (integer, nullable)");
    } else {
      console.log("  ✔ tshirt_registrations.t_shirt_size_numeric already exists");
    }

    // Verify
    const res = await client.query(
      `SELECT is_nullable, data_type FROM information_schema.columns WHERE table_name = 'tshirt_registrations' AND column_name = 't_shirt_size_numeric'`
    );
    const present = res.rows.length > 0;
    const nullable = present && res.rows[0].is_nullable === "YES";
    const dataType = present ? res.rows[0].data_type : "N/A";
    console.log(`  Verify column present: ${present ? "YES" : "NO"} (${dataType}), nullable: ${nullable ? "YES" : "NO"}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
