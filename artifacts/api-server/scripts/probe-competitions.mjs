import "../src/load-env.ts";
import app from "../src/app.ts";
const server = app.listen(8081, async () => {
  for (const path of ["/api/competitions", "/api/competitions/upcoming/summary"]) {
    const response = await fetch(`http://localhost:8081${path}`);
    console.log(path, response.status, await response.text());
  }
  server.close();
});
