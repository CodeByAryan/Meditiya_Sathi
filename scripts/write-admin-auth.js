const fs = require('fs');

const content = `import { Router, type IRouter } from "express";
import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, adminsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "meditiya-sathi-jwt-secret-change-in-production";

interface TokenPayload {
  id: number;
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

function createToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + 86400,
  };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = base64UrlEncode(
    createHmac("sha256", JWT_SECRET)
      .update(\`\${headerB64}.\${payloadB64}\`)
      .digest()
      .toString("base64url")
  );
  return \`\${headerB64}.\${payloadB64}.\${signature}\`;
}

export function verifyAdminToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSig = base64UrlEncode(
      createHmac("sha256", JWT_SECRET)
        .update(\`\${headerB64}.\${payloadB64}\`)
        .digest()
        .toString("base64url")
    );
    if (signatureB64 !== expectedSig) return null;
    const payload: TokenPayload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

router.post("/admin/login", async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: "Username/Mobile and password are required" });
      return;
    }
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(
        or(
          eq(adminsTable.username, username.trim()),
          eq(adminsTable.mobileNumber, username.trim())
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
    console.error("Login error:", err);
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
`;

fs.writeFileSync('c:\\Projects\\Meditiya_Sathi-main\\artifacts\\api-server\\src\\routes\\admin-auth.ts', content, 'utf8');
console.log('admin-auth.ts written successfully');
</parameter>
</invoke>
</｜｜DSML｜｜tool_calls>
