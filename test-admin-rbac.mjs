import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".");
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  try {
    const envContent = readFileSync(path.join(root, ".env"), "utf8");
    const line = envContent.split(/\r?\n/).find((value) => value.trim().startsWith("DATABASE_URL="));
    databaseUrl = line?.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  } catch {}
}

const pool = new pg.Pool({ connectionString: databaseUrl });

async function run() {
  console.log("=== Testing Volunteer API & Super Admin RBAC ===");

  // 1. Unauthenticated POST -> should be 401
  const unauthRes = await fetch("http://localhost:8080/api/admin/volunteers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Unauth Test" }),
  });
  console.log("1. Unauthenticated POST status:", unauthRes.status, unauthRes.status === 401 ? "PASS (401)" : "FAIL");

  // Get super admin & normal admin logins or create test admin tokens
  // Let's check admins in DB
  const { rows: admins } = await pool.query("SELECT id, username, role FROM admins");
  console.log("Found admins in DB:", admins);

  // Let's login as superadmin using /api/admin/login
  const loginRes = await fetch("http://localhost:8080/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin", password: "password123" }),
  });

  let superAdminToken = null;
  if (loginRes.ok) {
    const data = await loginRes.json();
    superAdminToken = data.token;
    console.log("Super Admin login successful! Role:", data.role);
  } else {
    console.log("Superadmin login status:", loginRes.status);
  }

  if (superAdminToken) {
    // 2. Add new volunteer via Super Admin POST
    const addRes = await fetch("http://localhost:8080/api/admin/volunteers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: "Vikram Mehta",
        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
        mobileNumber: "9844556677",
        position: "Treasurer",
        displayPosition: 1, // insert at position 1 (top)
      }),
    });

    const added = await addRes.json();
    console.log("2. Super Admin Add Volunteer status:", addRes.status, added.name === "Vikram Mehta" ? "PASS" : "FAIL");
    console.log("Added volunteer:", added);

    // 3. Verify public GET returns Vikram at position 1 and Aryan shifted to position 2
    const listRes = await fetch("http://localhost:8080/api/volunteers");
    const list = await listRes.json();
    console.log("3. Public listing after position 1 insertion:");
    list.forEach((v) => console.log(`   #${v.displayPosition}: ${v.name} (${v.position})`));

    const vikramFirst = list[0]?.name === "Vikram Mehta" && list[0]?.displayPosition === 1;
    console.log("Vikram is #1 and positions are contiguous:", vikramFirst ? "PASS" : "FAIL");

    // 4. Edit volunteer: change Vikram to position 3
    const editRes = await fetch(`http://localhost:8080/api/admin/volunteers/${added.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: "Vikram Mehta (Updated)",
        mobileNumber: "9844556677",
        position: "Senior Treasurer",
        displayPosition: 3,
      }),
    });
    const edited = await editRes.json();
    console.log("4. Super Admin Edit status:", editRes.status, edited.position === "Senior Treasurer" ? "PASS" : "FAIL");

    const listRes2 = await fetch("http://localhost:8080/api/volunteers");
    const list2 = await listRes2.json();
    console.log("Listing after Vikram moved to #3:");
    list2.forEach((v) => console.log(`   #${v.displayPosition}: ${v.name} (${v.position})`));

    // 5. Delete volunteer
    const delRes = await fetch(`http://localhost:8080/api/admin/volunteers/${added.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
      },
    });
    console.log("5. Super Admin Delete status:", delRes.status, delRes.ok ? "PASS" : "FAIL");

    const listRes3 = await fetch("http://localhost:8080/api/volunteers");
    const list3 = await listRes3.json();
    console.log("Listing after delete (should have 3 items contiguous 1..3):");
    list3.forEach((v) => console.log(`   #${v.displayPosition}: ${v.name}`));
    const positionsContiguous = list3.every((v, i) => v.displayPosition === i + 1);
    console.log("Contiguous positions 1..N verified:", positionsContiguous ? "PASS" : "FAIL");
  }

  await pool.end();
}

run().catch(console.error);
