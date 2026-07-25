// Vercel injects env vars natively — only load .env when running locally
if (!process.env.VERCEL) {
  await import("../src/load-env.js");
}

import app from "../src/app";

export default app;