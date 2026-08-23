import { Router, type IRouter } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, adminsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { loginRateLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === "production") {
    console.error("CRITICAL: JWT_SECRET environment variable is not set in production!");
  }
  return "meditiya-sathi-jwt-secret-change-in-production";
}

interface TokenPayload {
  id: string;
  fullName: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString();
}

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function createToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + 86400, // 24 hours
  };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = createHmac("sha256", getJwtSecret())
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyAdminToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== "string" || token.length > 2048) return null;
    const parts = token.trim().split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Validate header algorithm
    const header = JSON.parse(base64UrlDecode(headerB64));
    if (!header || header.alg !== "HS256" || (header.typ && header.typ !== "JWT")) {
      return null;
    }

    const currentSecret = getJwtSecret();
    const expectedSig = createHmac("sha256", currentSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    let isValidSignature = safeCompare(signatureB64, expectedSig);

    // Only in non-production allow checking development fallback secret
    if (!isValidSignature && process.env.NODE_ENV !== "production") {
      const fallbackSecret = "meditiya-sathi-jwt-secret-change-in-production";
      const fallbackSig = createHmac("sha256", fallbackSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest("base64url");
      isValidSignature = safeCompare(signatureB64, fallbackSig);
    }

    if (!isValidSignature) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(base64UrlDecode(payloadB64));
    if (!payload || !payload.id || !payload.username || !payload.role) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < nowSec) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

router.post("/admin/login", loginRateLimiter, async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body || {};
    if (!username || typeof username !== "string" || !password || typeof password !== "string") {
      res.status(400).json({ error: "Username/Mobile and password are required" });
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length === 0 || trimmedUsername.length > 100) {
      res.status(400).json({ error: "Username must be between 1 and 100 characters" });
      return;
    }

    // Step 4: Protect against Long Password DoS (limit max 128 chars before bcrypt hash)
    if (password.length > 128) {
      res.status(400).json({ error: "Password must not exceed 128 characters" });
      return;
    }

    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(
        or(
          eq(adminsTable.username, trimmedUsername.toLowerCase()),
          eq(adminsTable.username, trimmedUsername),
          eq(adminsTable.mobileNumber, trimmedUsername)
        )
      )
      .limit(1);

    if (!admin) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!admin.isActive) {
      res.status(403).json({ error: "Account is disabled. Contact Super Admin." });
      return;
    }
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    await db
      .update(adminsTable)
      .set({ lastLogin: new Date() })
      .where(eq(adminsTable.id, admin.id));
    const token = createToken({
      id: admin.id,
      fullName: admin.fullName,
      username: admin.username,
      role: admin.role,
    });
    res.json({
      token,
      id: admin.id,
      fullName: admin.fullName,
      username: admin.username,
      role: admin.role,
      email: admin.email,
      mobileNumber: admin.mobileNumber,
    });
  } catch (err: any) {
    console.error("Login error:", err?.message || err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.post("/admin/verify", async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }
    const token = authHeader.slice(7);
    const payload = verifyAdminToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const [admin] = await db
      .select({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        username: adminsTable.username,
        role: adminsTable.role,
        email: adminsTable.email,
        mobileNumber: adminsTable.mobileNumber,
        isActive: adminsTable.isActive,
      })
      .from(adminsTable)
      .where(eq(adminsTable.id, payload.id))
      .limit(1);
    if (!admin || !admin.isActive) {
      res.status(403).json({ error: "Account not found or disabled" });
      return;
    }
    res.json(admin);
  } catch (err: any) {
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
