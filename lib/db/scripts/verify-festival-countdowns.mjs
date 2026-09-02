import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const tables = await pool.query("select to_regclass('public.festival_countdowns') as countdown_table, to_regclass('public.festivals') as festivals_table");
  const columns = await pool.query("select table_name, column_name, data_type from information_schema.columns where table_name in ('festival_countdowns', 'festivals') order by table_name, ordinal_position");
  console.log(JSON.stringify({ tables: tables.rows[0], columns: columns.rows }, null, 2));
} finally {
  await pool.end();
}
