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
    console.log("\nApplying migration: T-Shirt Collection / Distribution fields");

    // ── Add all collection columns (idempotent) ──────────────────────────
    const columns = [
      ["collection_id", "text"],
      ["collection_status", "text NOT NULL DEFAULT 'pending'"],
      ["collected_at", "timestamptz"],
      ["collected_by_admin_id", "text"],
      ["collected_by_name", "text"],
      ["collection_notes", "text"],
    ];
    for (const [name, def] of columns) {
      await client.query(
        `ALTER TABLE tshirt_registrations ADD COLUMN IF NOT EXISTS ${name} ${def};`
      );
      console.log(`  ✔ tshirt_registrations.${name}`);
    }

    // ── Add unique index on collection_id ────────────────────────────────
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_tshirt_collection_id ON tshirt_registrations(collection_id);`
    );
    console.log("  ✔ unique index idx_tshirt_collection_id");

    // ── Backfill collection_id for existing rows that lack one ───────────
    // Format: TSH-{festivalYear}-{4-digit id}
    const backfill = await client.query(`
      WITH ranked AS (
        SELECT t.id, f.year AS festival_year,
               ROW_NUMBER() OVER (ORDER BY t.id) AS rn
        FROM tshirt_registrations t
        LEFT JOIN festivals f ON t.festival_id = f.id
        WHERE t.collection_id IS NULL OR t.collection_id = ''
      )
      UPDATE tshirt_registrations t
      SET collection_id = 'TSH-' || COALESCE((SELECT festival_year FROM ranked r WHERE r.id = t.id), EXTRACT(YEAR FROM NOW())::int) || '-' || LPAD(
        (SELECT rn FROM ranked r WHERE r.id = t.id)::text, 4, '0'
      )
      WHERE t.id IN (SELECT id FROM ranked);
    `);
    console.log(`  ✔ Backfilled collection_id for ${backfill.rowCount ?? 0} registrations`);

    // ── Verify ───────────────────────────────────────────────────────────
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tshirt_registrations' AND column_name IN ('collection_id','collection_status','collected_at','collected_by_admin_id','collected_by_name','collection_notes')`
    );
    console.log(`  Verify collection columns present: ${res.rows.length}/6 ✔`);

    const idxRes = await client.query(
      `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_tshirt_collection_id'`
    );
    console.log(`  Verify unique index: ${idxRes.rows.length > 0 ? "PRESENT ✔" : "MISSING ✘"}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
