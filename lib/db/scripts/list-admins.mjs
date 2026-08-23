import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  try {
    const envContent = readFileSync(path.join(root, ".env"), "utf8");
    const line = envContent.split(/\r?\n/).find((value) => value.trim().startsWith("DATABASE_URL="));
    databaseUrl = line?.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  } catch { }
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const { rows: admins } = await pool.query("SELECT id, username, role FROM admins");
console.log("Admins in DB:", admins);
await pool.end();
