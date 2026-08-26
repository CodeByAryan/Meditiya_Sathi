import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
function requiredDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(path.join(root, ".env"), "utf8");
    const value = env.split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith("DATABASE_URL="));
    if (value) return value.split("=").slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
  } catch {
    // Fall through to the safe, non-secret error below.
  }
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({ connectionString: requiredDatabaseUrl() });
try {
  const columns = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND ((table_name = 'volunteer_festival_assignments' AND column_name IN ('volunteer_id', 'festival_id'))
        OR (table_name = 'admins' AND column_name = 'id')
        OR (table_name = 'festivals' AND column_name = 'id'))
    ORDER BY table_name, column_name
  `);
  const expected = new Map([
    ["admins.id", "uuid"],
    ["festivals.id", "integer"],
    ["volunteer_festival_assignments.volunteer_id", "uuid"],
    ["volunteer_festival_assignments.festival_id", "integer"],
  ]);
  for (const row of columns.rows) {
    const key = `${row.table_name}.${row.column_name}`;
    const expectedType = expected.get(key);
    if (expectedType && row.data_type !== expectedType) {
      throw new Error(`Unexpected type for ${key}`);
    }
    expected.delete(key);
  }
  if (expected.size) throw new Error(`Missing schema: ${[...expected.keys()].join(", ")}`);

  const result = await pool.query(`
    SELECT volunteer_id, festival_id
    FROM volunteer_festival_assignments
    WHERE volunteer_id IN ($1, $2)
  `, ["926ec092-e8d2-4c8c-8dff-4643a9e39363", "841da0b6-4a20-4dcd-b356-da85ac6711b5"]);
  console.log(`Volunteer assignment schema and query verified (${result.rows.length} matching assignments).`);
} finally {
  await pool.end();
}
