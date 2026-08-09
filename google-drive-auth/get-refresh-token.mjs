import { google } from "googleapis";
import http from "http";
import { URL } from "url";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required."
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

const scopes = [
  "https://www.googleapis.com/auth/drive"
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: scopes
});

console.log("\nOpen this URL in your browser:\n");
console.log(authUrl);
console.log("\nWaiting for Google authorization...\n");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      "http://localhost:3000"
    );

    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400);
      res.end("Authorization code missing.");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, {
      "Content-Type": "text/html"
    });

    res.end(`
      <h2>Google Drive authorization successful!</h2>
      <p>You can close this browser tab and return to PowerShell.</p>
    `);

    console.log("\n========================================");
    console.log("REFRESH TOKEN:");
    console.log("========================================\n");
    console.log(tokens.refresh_token);
    console.log("\n========================================");
    console.log("Add this to GitHub as:");
    console.log("GOOGLE_REFRESH_TOKEN");
    console.log("========================================\n");

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);

  } catch (error) {
    console.error("\nAuthorization failed:");
    console.error(error.response?.data || error.message);

    res.writeHead(500);
    res.end("Authorization failed. Check PowerShell.");
  }
});

server.listen(3000, () => {
  console.log("Waiting on http://localhost:3000 ...");
});