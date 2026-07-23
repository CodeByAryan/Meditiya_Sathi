import "./load-env.js";
import app from "./app";
import { logger } from "./lib/logger";
import { seedDefaultAdmin } from "./routes/seed-admin";

const rawPort = process.env["PORT"] ?? "8080";

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Seed default admin before starting the server
seedDefaultAdmin()
  .catch((err) => {
    logger.error({ err }, "Error seeding default admin");
  })
  .finally(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
    });
  });
