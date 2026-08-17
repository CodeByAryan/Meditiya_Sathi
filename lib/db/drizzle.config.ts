import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDir, "../..");
const envPath = path.join(projectRoot, ".env");

if (!process.env.DATABASE_URL && existsSync(envPath)) {
  loadEnvFile(envPath);
}
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required in the project root .env file.");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
});
