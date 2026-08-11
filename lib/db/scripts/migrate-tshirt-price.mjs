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

const DEFAULT_PRICE = 250;
const VALID_PRICES = [230, 250];

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
    console.log("\nApplying migration: add tshirt_price + total_amount to tshirt_registrations");

    // ── Add columns (idempotent) ─────────────────────────────────────────
    await client.query(`
      ALTER TABLE tshirt_registrations
        ADD COLUMN IF NOT EXISTS tshirt_price integer NOT NULL DEFAULT ${DEFAULT_PRICE};
    `);
    console.log("  ✔ tshirt_registrations.tshirt_price (integer, default 250)");

    await client.query(`
      ALTER TABLE tshirt_registrations
        ADD COLUMN IF NOT EXISTS total_amount integer NOT NULL DEFAULT 0;
    `);
    console.log("  ✔ tshirt_registrations.total_amount (integer, default 0)");

    // ── Backfill historical price (only where no valid price exists) ─────
    // Never overwrite an existing valid price (230 or 250).
    const backfillPrice = await client.query(
      `UPDATE tshirt_registrations
       SET tshirt_price = ${DEFAULT_PRICE}
       WHERE tshirt_price IS NULL
          OR tshirt_price NOT IN (${VALID_PRICES.join(",")})`
    );
    console.log(`  ✔ Backfilled tshirt_price = ₹${DEFAULT_PRICE} for ${backfillPrice.rowCount ?? 0} existing registration(s)`);

    // ── Recompute total_amount for every row (idempotent) ────────────────
    // total_amount = tshirt_price × quantity.
    // quantity defaults to 1 where it is null/0 to keep amounts meaningful.
    const recompute = await client.query(`
      UPDATE tshirt_registrations
      SET total_amount =
        tshirt_price * GREATEST(COALESCE(NULLIF(quantity, 0), 1), 1)
      WHERE id IS NOT NULL
    `);
    console.log(`  ✔ Recalculated total_amount (price × quantity) for ${recompute.rowCount ?? 0} registration(s)`);

    // ── Verify ───────────────────────────────────────────────────────────
    const colsRes = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'tshirt_registrations'
         AND column_name IN ('tshirt_price','total_amount')
       ORDER BY column_name`
    );
    console.log(`  Verify tshirt_price + total_amount present: ${colsRes.rows.length}/2 ✔`);

    const sampleRes = await client.query(
      `SELECT
         COUNT(*)::int AS total_rows,
         COUNT(*) FILTER (WHERE tshirt_price IN (230, 250))::int AS valid_price_rows,
         COUNT(*) FILTER (WHERE total_amount = tshirt_price * GREATEST(COALESCE(NULLIF(quantity, 0), 1), 1))::int AS correct_amount_rows
       FROM tshirt_registrations`
    );
    const sample = sampleRes.rows?.[0] || {};
    console.log(`  Verify data: ${sample.total_rows ?? 0} total rows, ${sample.valid_price_rows ?? 0} valid prices, ${sample.correct_amount_rows ?? 0} correct totals`);

    const summaryRes = await client.query(
      `SELECT
         COALESCE(SUM(tshirt_price), 0)::int AS raw_price_sum,
         COALESCE(SUM(total_amount), 0)::int AS amount_sum
       FROM tshirt_registrations`
    );
    const summary = summaryRes.rows?.[0] || {};
    console.log(`  Verify totals: total_amount sum = ₹${(summary.amount_sum ?? 0).toLocaleString("en-IN")}`);
    console.log("\nMigration complete ✔ (safe to run multiple times)");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
