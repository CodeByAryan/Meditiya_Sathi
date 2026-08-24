import { db, festivalDonationsTable } from "../lib/db/src/index.ts";
import { sql } from "../lib/db/node_modules/drizzle-orm/index.js";
import { generateVarganiPdf } from "../artifacts/api-server/src/lib/vargani-pdf.ts";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

async function testDonation62() {
  console.log("\n=======================================================");
  console.log("TESTING FESTIVAL DONATION ID 62 DIRECTLY FROM DATABASE");
  console.log("=======================================================\n");

  const result = await db.execute(sql`
    SELECT fd.*, f.name as festival_name, f.year as festival_year,
           r.full_name as resident_name, r.mobile as resident_mobile, r.flat_no,
           b.building_name, w.wing_name
    FROM festival_donations fd
    LEFT JOIN festivals f ON fd.festival_id = f.id
    LEFT JOIN residents r ON fd.resident_id = r.id
    LEFT JOIN buildings b ON r.building_id = b.id
    LEFT JOIN wings w ON r.wing_id = w.id
    WHERE fd.id = 62 LIMIT 1
  `);

  const row = (result.rows || [])[0];
  if (!row) {
    console.log("Donation ID 62 not found in database, querying latest paid donation instead...");
    const latestResult = await db.execute(sql`
      SELECT fd.*, f.name as festival_name, f.year as festival_year,
             r.full_name as resident_name, r.mobile as resident_mobile, r.flat_no,
             b.building_name, w.wing_name
      FROM festival_donations fd
      LEFT JOIN festivals f ON fd.festival_id = f.id
      LEFT JOIN residents r ON fd.resident_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN wings w ON r.wing_id = w.id
      WHERE fd.amount IS NOT NULL AND fd.payment_method != 'pending'
      ORDER BY fd.id DESC LIMIT 1
    `);
    const latestRow = (latestResult.rows || [])[0];
    console.log("Found latest donation:", latestRow);
    if (latestRow) {
      await testRow(latestRow);
    }
  } else {
    console.log("Found Donation ID 62 in database:", row);
    await testRow(row);
  }
}

async function testRow(row) {
  const collectedBy = row.collected_by_admin_name || "Admin (Authorized)";
  const pdf = await generateVarganiPdf({
    receiptNumber: row.receipt_number || `REC-2026-${row.id}`,
    donationDate: row.payment_date || row.created_at,
    name: row.resident_name || row.full_name || "Donor",
    mobile: row.resident_mobile || row.mobile,
    building: row.building_name,
    wing: row.wing_name,
    flat: row.flat_no,
    amount: Number(row.amount || 5001),
    paymentMethod: row.payment_method || "CASH",
    festivalName: row.festival_name || "गणेश उत्सव",
    festivalYear: row.festival_year ? Number(row.festival_year) : 2026,
    collectedBy,
  });

  console.log(`✓ Generated PDF for donation (bytes: ${pdf.length})`);
  await writeFile("test-donation-62.pdf", pdf);

  execSync(`python -c "import pymupdf; doc = pymupdf.open('test-donation-62.pdf'); doc[0].get_pixmap(dpi=150).save('test-donation-62.png')"`);
  console.log("✓ Rendered test-donation-62.png successfully");
}

testDonation62().catch((err) => {
  console.error("Donation 62 Test Error:", err);
  process.exit(1);
});
