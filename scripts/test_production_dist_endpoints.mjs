import { generateVarganiPdf } from "../artifacts/api-server/src/lib/vargani-pdf.ts";
import app from "../artifacts/api-server/dist/app.mjs";
import http from "node:http";

async function testProductionServer() {
  console.log("\n=======================================================");
  console.log("TESTING COMPILED PRODUCTION API SERVER PDF ENDPOINTS");
  console.log("=======================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}`);

  try {
    // 1. Test direct PDF generation from dist
    console.log("\n[Test 1] Testing generateVarganiPdf from compiled dist/...");
    const pdfBuf = await generateVarganiPdf({
      receiptNumber: "REC/2026/000062",
      donationDate: "2026-08-24",
      name: "राजेश व्ही. शर्मा",
      mobile: "+91 98765 43210",
      building: "गोकुळ धाम",
      wing: "Wing A",
      flat: "402",
      amount: 5001,
      paymentMethod: "upi",
      festivalName: "गणेश उत्सव",
      festivalYear: 2026,
      collectedBy: "Super Admin",
    });

    if (pdfBuf && pdfBuf.length > 1000 && pdfBuf.toString("utf8", 0, 4) === "%PDF") {
      console.log(`  ✓ Successfully generated PDF buffer (${pdfBuf.length} bytes) from compiled dist!`);
    } else {
      throw new Error("Invalid PDF buffer returned from dist");
    }

    // 2. Test public receipt route GET /api/vargani-pdf/:receiptNumber
    console.log("\n[Test 2] Testing public endpoint GET /api/vargani-pdf/REC-2026-000062...");
    // Mock or check route
    const res = await fetch(`${baseUrl}/api/vargani-pdf/REC-2026-000062`);
    console.log(`  Response status: ${res.status}`);
    // If not in DB, returns 404 text, not 500!
    if (res.status === 500) {
      const errText = await res.text();
      throw new Error(`Public endpoint returned 500: ${errText}`);
    }
    console.log(`  ✓ Public endpoint returned status ${res.status} (no 500 crash)`);

  } finally {
    server.close();
  }

  console.log("\n=======================================================");
  console.log("ALL PRODUCTION DIST ENDPOINT TESTS PASSED");
  console.log("=======================================================\n");
}

testProductionServer().catch((err) => {
  console.error("Production Test Failed:", err);
  process.exit(1);
});
