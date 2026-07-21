import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // Use the directory so drizzle-kit can load all *.ts schema modules.
  schema: path.join(__dirname, "./src/schema"),
  dialect: "postgresql",
  // IMPORTANT: rely on drizzle-kit/CLI env injection for DATABASE_URL
  // because reading .env at config-evaluation time is blocked in this environment.
});



