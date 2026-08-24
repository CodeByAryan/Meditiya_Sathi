import "regenerator-runtime/runtime.js";
import { generateVarganiPdf, amountInWords } from "../artifacts/api-server/src/lib/vargani-pdf.ts";
import { writeFile } from "node:fs/promises";
import path from "node:path";


async function runTests() {
  console.log("=== Starting Vargani PDF Generation Test Suite ===");

  // Test 1: Standard Donation (₹ 5,001)
  console.log("\n[Test 1] Standard Donation ₹5,001...");
  const pdf1 = await generateVarganiPdf({
    receiptNumber: "REC/2026/000123",
    donationDate: "2026-08-24",
    name: "Rajesh V. Sharma",
    mobile: "+91 98765 43210",
    building: "Gokul Dham",
    wing: "Wing A",
    flat: "402",
    amount: 5001,
    paymentMethod: "upi",
    festivalName: "गणेश उत्सव",
    festivalYear: 2026,
    collectedBy: "Super Admin",
  });
  await writeFile(path.resolve("test-receipt-5001.pdf"), pdf1);
  console.log("✓ Generated test-receipt-5001.pdf (bytes:", pdf1.length, ")");

  // Test 2: ₹ 500 Donation
  console.log("\n[Test 2] ₹500 Donation...");
  const pdf2 = await generateVarganiPdf({
    receiptNumber: "RCP-1-500",
    donationDate: new Date(),
    name: "Amit Patel",
    mobile: "9820012345",
    building: "Shanti Bhuvan",
    wing: "B",
    flat: "101",
    amount: 500,
    paymentMethod: "cash",
    festivalName: "गणेशोत्सव",
    festivalYear: 2026,
    collectedBy: "Admin",
  });
  await writeFile(path.resolve("test-receipt-500.pdf"), pdf2);
  console.log("✓ Generated test-receipt-500.pdf (bytes:", pdf2.length, ")");

  // Test 3: ₹ 1,500 Donation
  console.log("\n[Test 3] ₹1,500 Donation...");
  const pdf3 = await generateVarganiPdf({
    receiptNumber: "RCP-1-1500",
    donationDate: "2026-09-01",
    name: "Suresh S. Sawant",
    amount: 1500,
    paymentMethod: "bank_transfer",
    festivalName: "गणेश उत्सव",
    festivalYear: 2026,
    collectedBy: "Ramesh Pawar (Volunteer)",
  });
  await writeFile(path.resolve("test-receipt-1500.pdf"), pdf3);
  console.log("✓ Generated test-receipt-1500.pdf (bytes:", pdf3.length, ")");

  // Test 4: ₹ 10,000 Donation
  console.log("\n[Test 4] ₹10,000 Donation...");
  const pdf4 = await generateVarganiPdf({
    receiptNumber: "RCP-1-10000",
    donationDate: "2026-09-05",
    name: "Vikramaditya Construction Ltd.",
    mobile: "9821998877",
    amount: 10000,
    paymentMethod: "cheque",
    festivalName: "गणेश उत्सव",
    festivalYear: 2026,
    collectedBy: "Mandal Trustee",
  });
  await writeFile(path.resolve("test-receipt-10000.pdf"), pdf4);
  console.log("✓ Generated test-receipt-10000.pdf (bytes:", pdf4.length, ")");

  // Test 5: ₹ 1,00,000 (1 Lakh) Large Donation
  console.log("\n[Test 5] ₹1,00,000 (1 Lakh) Donation...");
  const pdf5 = await generateVarganiPdf({
    receiptNumber: "RCP-1-100000",
    donationDate: "2026-09-10",
    name: "Shree Siddhivinayak Enterprises",
    amount: 100000,
    paymentMethod: "bank_transfer",
    festivalName: "गणेश उत्सव",
    festivalYear: 2026,
    collectedBy: "President",
  });
  await writeFile(path.resolve("test-receipt-100000.pdf"), pdf5);
  console.log("✓ Generated test-receipt-100000.pdf (bytes:", pdf5.length, ")");

  // Test 6: Missing Optional Fields (Nulls/Undefined)
  console.log("\n[Test 6] Missing optional fields (safe fallback test)...");
  const pdf6 = await generateVarganiPdf({
    receiptNumber: "RCP-OUTSIDER-999",
    donationDate: "2026-09-12",
    name: "Anonymous Devotee",
    mobile: null,
    building: null,
    wing: null,
    flat: null,
    amount: 2501,
    paymentMethod: "cash",
    festivalName: null,
    festivalYear: null,
    collectedBy: null,
  });
  await writeFile(path.resolve("test-receipt-missing-fields.pdf"), pdf6);
  console.log("✓ Generated test-receipt-missing-fields.pdf (bytes:", pdf6.length, ")");

  console.log("\n=== ALL PDF GENERATION TESTS PASSED SUCCESSFULLY ===");

  // Verify Page Counts & Dimensions
  console.log("\n--- Verifying Exact Page Counts & Geometry ---");
  const { PDFDocument } = await import("../artifacts/api-server/node_modules/pdf-lib/cjs/index.js");
  const files = [
    "test-receipt-5001.pdf",
    "test-receipt-500.pdf",
    "test-receipt-1500.pdf",
    "test-receipt-10000.pdf",
    "test-receipt-100000.pdf",
    "test-receipt-missing-fields.pdf",
  ];
  const { readFile } = await import("node:fs/promises");
  for (const f of files) {
    const bytes = await readFile(f);
    const doc = await PDFDocument.load(bytes);
    const count = doc.getPageCount();
    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    console.log(`${f} -> Pages: ${count}, Size: ${width.toFixed(2)} x ${height.toFixed(2)} pt`);
    if (count !== 1) throw new Error(`${f} has ${count} pages (expected 1)`);
    if (Math.abs(width - 595.28) > 0.1 || Math.abs(height - 841.89) > 0.1) {
      throw new Error(`${f} is not A4 dimensions`);
    }
  }
  console.log("✓ ALL PDFS ARE STRICTLY 1 A4 PAGE (595.28 x 841.89 pt)!\n");
}


runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

