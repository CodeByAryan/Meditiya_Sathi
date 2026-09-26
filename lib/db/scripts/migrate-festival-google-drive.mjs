import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS google_drive_url TEXT;`);
  console.log("festivals.google_drive_url is ready");
} finally {
  await pool.end();
}
