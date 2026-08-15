import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const possiblePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(currentDir, "../../../.env"),
  path.resolve(currentDir, "../../.env"),
  path.resolve(currentDir, "../.env"),
  path.resolve(currentDir, "./.env"),
];

for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    try {
      loadEnvFile(envPath);
      break;
    } catch {
      // Continue checking remaining paths if loading fails
    }
  }
}

