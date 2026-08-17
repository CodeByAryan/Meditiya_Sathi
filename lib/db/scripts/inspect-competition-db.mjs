import { loadEnvFile } from "node:process";
import pg from "pg";
loadEnvFile("../../.env");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const names = ["competitions", "competition_entries", "competition_entry_images", "competition_votes", "competition_security_attempts", "residents", "buildings", "users", "festivals", "donations", "admins"];
const tables = await pool.query("select tablename from pg_tables where schemaname=current_schema() and tablename=any($1::text[])", [names]);
const indexes = await pool.query("select tablename,indexname,indexdef from pg_indexes where schemaname=current_schema() and tablename like $1 order by tablename,indexname", ["competition%"]);
console.log(JSON.stringify({ tables: tables.rows.map((r) => r.tablename), indexes: indexes.rows }, null, 2));
await pool.end();
