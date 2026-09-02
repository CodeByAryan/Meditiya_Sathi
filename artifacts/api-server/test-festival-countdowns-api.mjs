import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const env = readFileSync("../../.env", "utf8");
const secretLine = env.split(/\r?\n/).find((value) => value.startsWith("JWT_SECRET="));
const secret = secretLine?.slice(secretLine.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "") || "meditiya-sathi-jwt-secret-change-in-production";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode({ alg: "HS256", typ: "JWT" });
const payload = encode({ id: "9609e32c-2322-45d0-8683-5c5332ebfabf", fullName: "Verification", username: "palekarlabs", role: "Super Admin", iat: now, exp: now + 300 });
const token = `${header}.${payload}.${createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")}`;
const response = await fetch("http://localhost:8080/api/admin/festival-countdowns", { headers: { Authorization: `Bearer ${token}` } });
console.log(`Authenticated HTTP ${response.status}`);
console.log(await response.text());
if (response.status !== 200) process.exitCode = 1;
