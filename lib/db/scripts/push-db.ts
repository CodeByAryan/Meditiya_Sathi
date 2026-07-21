import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseEnv(content: string) {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }
  return out;
}

async function main() {
  const rootEnvPath = path.resolve(__dirname, "../../../.env");
  const envRaw = readFileSync(rootEnvPath, "utf8");
  const env = parseEnv(envRaw);

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(`DATABASE_URL not found in ${rootEnvPath}`);
  }

  // Verify DB connectivity quickly before pushing schema.
  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl });

  const client = await pool.connect();
  try {
    await client.query("select 1 as ok");
  } finally {
    client.release();
    await pool.end();
  }

  // Run drizzle-kit push with explicit schema path.
  const schemaPath = "./src/schema";
  const drizzleArgs = [
    "exec",
    "drizzle-kit",
    "push",
    "--schema",
    schemaPath,
    "--dialect",
    "postgresql",
    "--url",
    databaseUrl,
    "--force",
  ];

  const result = spawnSync("pnpm", drizzleArgs, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../.."),
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main().catch((err) => {
  console.error("push-db failed:", err);
  process.exit(1);
});

