import { loadEnvFile } from "node:process";
import pg from "pg";
loadEnvFile("../../.env");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const required = ["competition_entries", "competition_entry_images", "competition_votes", "competition_security_attempts"];
  const existing = await client.query("select tablename from pg_tables where schemaname=current_schema() and tablename=any($1::text[])", [required]);
  if (existing.rows.length) throw new Error(`Refusing to modify existing competition tables: ${existing.rows.map((r) => r.tablename).join(", ")}`);
  await client.query(`CREATE TABLE competition_entries (id serial PRIMARY KEY, competition_id integer NOT NULL REFERENCES competitions(id), resident_id integer NOT NULL REFERENCES residents(id), title text NOT NULL, description text NOT NULL, status text NOT NULL DEFAULT 'pending', reviewed_by_admin_id text, review_note text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
  await client.query(`CREATE UNIQUE INDEX idx_competition_entries_competition_resident ON competition_entries (competition_id, resident_id)`);
  await client.query(`CREATE INDEX idx_competition_entries_status ON competition_entries (competition_id, status)`);
  await client.query(`CREATE TABLE competition_entry_images (id serial PRIMARY KEY, entry_id integer NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE, image_url text NOT NULL, cloudinary_public_id text NOT NULL, display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now())`);
  await client.query(`CREATE UNIQUE INDEX idx_competition_entry_images_order ON competition_entry_images (entry_id, display_order)`);
  await client.query(`CREATE TABLE competition_votes (id serial PRIMARY KEY, competition_id integer NOT NULL REFERENCES competitions(id), entry_id integer NOT NULL REFERENCES competition_entries(id), voter_hash text NOT NULL, ip_hash text, user_agent_hash text, risk_status text NOT NULL DEFAULT 'normal', risk_score integer NOT NULL DEFAULT 0, risk_metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())`);
  await client.query(`CREATE UNIQUE INDEX idx_competition_votes_unique_voter ON competition_votes (competition_id, voter_hash)`);
  await client.query(`CREATE INDEX idx_competition_votes_competition_entry ON competition_votes (competition_id, entry_id)`);
  await client.query(`CREATE INDEX idx_competition_votes_risk ON competition_votes (competition_id, risk_status)`);
  await client.query(`CREATE TABLE competition_security_attempts (id serial PRIMARY KEY, competition_id integer REFERENCES competitions(id), entry_id integer, attempt_type text NOT NULL, outcome text NOT NULL, ip_hash text, user_agent_hash text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())`);
  await client.query(`CREATE INDEX idx_competition_security_attempts_created ON competition_security_attempts (competition_id, created_at)`);
  await client.query("COMMIT");
  console.log("Created competition entry, image, vote, and security-attempt tables and indexes.");
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
