import bcrypt from "bcryptjs";
import { db, adminsTable } from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * Seed the default Super Admin account if no admins exist.
 * This runs during server initialization.
 * Default: username=admin, password=admin123
 */
export async function seedDefaultAdmin(): Promise<void> {
  try {
    // Check if any admin exists
    const result = await db.select({ id: adminsTable.id }).from(adminsTable).limit(1);

    if (result && result.length > 0) {
      // Admin already exists, no need to seed
      return;
    }

    // Create default Super Admin
    const hashedPassword = await bcrypt.hash("admin123", 12);

    const [admin] = await db
      .insert(adminsTable)
      .values({
        fullName: "Super Admin",
        username: "admin",
        mobileNumber: "0000000000",
        email: "admin@meditiya-sathi.com",
        password: hashedPassword,
        role: "Super Admin",
        isActive: true,
      })
      .returning({
        id: adminsTable.id,
        fullName: adminsTable.fullName,
        username: adminsTable.username,
        role: adminsTable.role,
      });

    logger.info(
      { username: admin.username, role: admin.role },
      "Default Super Admin account created. Username: admin, Password: admin123"
    );
  } catch (err: any) {
    // If table doesn't exist yet, that's okay - skip seeding
    if (err?.code === "42P01") {
      logger.warn("admins table does not exist yet. Skipping seed.");
      return;
    }
    logger.error({ err }, "Failed to seed default admin account");
  }
}
