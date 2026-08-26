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
if (!databaseUrl) throw new Error("DATABASE_URL is required to run the volunteer assignment migration");

const pool = new pg.Pool({ connectionString: databaseUrl });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`CREATE TABLE IF NOT EXISTS volunteer_festival_assignments (volunteer_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE, festival_id integer NOT NULL REFERENCES festivals(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_volunteer_festival_assignment UNIQUE (volunteer_id, festival_id))`);
  await client.query(`ALTER TABLE volunteer_festival_assignments ADD COLUMN IF NOT EXISTS volunteer_id uuid`);
  await client.query(`ALTER TABLE volunteer_festival_assignments ADD COLUMN IF NOT EXISTS festival_id integer`);
  await client.query(`ALTER TABLE volunteer_festival_assignments ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_volunteer_festival_assignment ON volunteer_festival_assignments(volunteer_id, festival_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_volunteer_festival_volunteer ON volunteer_festival_assignments(volunteer_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_volunteer_festival_festival ON volunteer_festival_assignments(festival_id)`);
  await client.query(`CREATE TABLE IF NOT EXISTS volunteer_event_assignments (volunteer_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE, event_id integer NOT NULL REFERENCES events(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_volunteer_event_assignment UNIQUE (volunteer_id, event_id))`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_volunteer_event_volunteer ON volunteer_event_assignments(volunteer_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_volunteer_event ON volunteer_event_assignments(event_id)`);

  const requiredColumns = [
    ["admins", "id", "uuid"],
    ["festivals", "id", "integer"],
    ["volunteer_festival_assignments", "volunteer_id", "uuid"],
    ["volunteer_festival_assignments", "festival_id", "integer"],
  ];
  for (const [tableName, columnName, dataType] of requiredColumns) {
    const result = await client.query(
      `SELECT data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
      [tableName, columnName],
    );
    if (result.rows.length === 0 || result.rows[0].data_type !== dataType) {
      throw new Error(`Schema verification failed for ${tableName}.${columnName}`);
    }
  }
  console.log("Verified volunteer_festival_assignments and referenced columns.");

  // Preserve the existing one-to-one assignment columns during migration.
  await client.query(`INSERT INTO volunteer_festival_assignments (volunteer_id, festival_id) SELECT assigned_volunteer_id::uuid, id FROM festivals WHERE assigned_volunteer_id IS NOT NULL AND assigned_volunteer_id ~* '^[0-9a-f-]{36}$' ON CONFLICT DO NOTHING`);
  await client.query(`INSERT INTO volunteer_event_assignments (volunteer_id, event_id) SELECT assigned_volunteer_id::uuid, id FROM events WHERE assigned_volunteer_id IS NOT NULL AND assigned_volunteer_id ~* '^[0-9a-f-]{36}$' ON CONFLICT DO NOTHING`);
  await client.query("COMMIT");
  console.log("Volunteer assignment tables created and legacy assignments preserved.");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
