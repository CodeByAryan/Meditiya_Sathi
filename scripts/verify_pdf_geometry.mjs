import { readFile } from "node:fs/promises";
import { PDFDocument } from "../artifacts/api-server/node_modules/pdf-lib/cjs/index.js";

async function verifyPdfs() {
  const files = [
    "test_receipt_normal.pdf",
    "test_receipt_long_name.pdf",
    "test_receipt_long_building.pdf",
    "test_receipt_large_amount.pdf",
    "test_receipt_long_festival.pdf",
  ];

  console.log("=== Verifying PDF Geometry & Page Count ===");
  for (const f of files) {
    const bytes = await readFile(f);
    const doc = await PDFDocument.load(bytes);
    const count = doc.getPageCount();
    const page = doc.getPage(0);
    const { width, height } = page.getSize();

    console.log(`File: ${f}`);
    console.log(`  Pages: ${count}`);
    console.log(`  Size: ${width.toFixed(2)} x ${height.toFixed(2)} pt`);

    if (count !== 1) {
      throw new Error(`File ${f} has ${count} pages instead of 1!`);
    }

    if (Math.abs(width - 595.28) > 0.1 || Math.abs(height - 841.89) > 0.1) {
      throw new Error(`File ${f} size ${width}x${height} does not match A4 (595.28 x 841.89)!`);
    }
  }

  console.log("\n✅ All 5 test PDFs verified: EXACTLY 1 page, EXACTLY A4 (595.28 x 841.89 pt)!");
}

verifyPdfs().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
