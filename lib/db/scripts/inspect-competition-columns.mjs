import { loadEnvFile } from "node:process";
import pg from "pg";
loadEnvFile("../../.env");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query("select table_name,column_name,data_type from information_schema.columns where table_schema=current_schema() and table_name like 'competition%' order by table_name,ordinal_position");
console.log(JSON.stringify(result.rows, null, 2));
await pool.end();
