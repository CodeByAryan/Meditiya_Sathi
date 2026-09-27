import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`
    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS short_description TEXT;
    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS venue TEXT DEFAULT 'Medtiya Nagar, Mumbai';
    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS homepage_visible BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS is_homepage_featured BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // If there is currently an active festival and none is featured, feature the first active one with homepage_visible = true
  await pool.query(`
    UPDATE festivals
    SET is_homepage_featured = TRUE, homepage_visible = TRUE
    WHERE id = (
      SELECT id FROM festivals
      WHERE is_active = TRUE
      ORDER BY year DESC, start_date ASC
      LIMIT 1
    )
    AND NOT EXISTS (
      SELECT 1 FROM festivals WHERE is_homepage_featured = TRUE
    );
  `);

  console.log("festivals homepage fields migration completed successfully");
} finally {
  await pool.end();
}
