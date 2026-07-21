import { Router, type IRouter } from "express";
import { createHmac } from "node:crypto";

const router: IRouter = Router();

interface TokenPayload {
  username: string;
  role: "admin";
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString();
}

function createToken(username: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    username,
    role: "admin",
    iat: now,
    exp: now + 86400, // 24 hours
  };
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    createHmac("sha256", adminPassword)
      .update(`${headerB64}.${payloadB64}`)
      .digest()
      .toString("base64url")
  );
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyAdminToken(token: string): { username: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const adminPassword = process.env.ADMIN_PASSWORD || "";
    const expectedSig = base64UrlEncode(
      createHmac("sha256", adminPassword)
        .update(`${headerB64}.${payloadB64}`)
        .digest()
        .toString("base64url")
    );
    if (signatureB64 !== expectedSig) return null;
    const payload: TokenPayload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const { username, password } = req.body || {};
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";

  if (username !== adminUsername || password !== adminPassword) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = createToken(username);
  res.json({ token, username, role: "admin" });
});

export default router;

