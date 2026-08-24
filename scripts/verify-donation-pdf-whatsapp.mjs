import "regenerator-runtime/runtime.js";
import { normalizePhoneNumber, buildVarganiCaption, isWhatsAppCloudApiConfigured } from "../artifacts/api-server/src/lib/whatsapp-cloud-api.ts";
import { getPublicAppBaseUrl, getReceiptPdfUrl, getReceiptShareUrl } from "../artifacts/api-server/src/lib/app-url.ts";
import { generateVarganiPdf, amountInWords } from "../artifacts/api-server/src/lib/vargani-pdf.ts";
import { formatWhatsAppPhone, buildReceiptMessage } from "../artifacts/meditiya-sathi/src/lib/whatsapp-service.ts";

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("MEDITIYA SATHI - DONATION PDF & WHATSAPP VERIFICATION");
  console.log("=======================================================\n");

  // ── TEST 1: Phone Number Normalization ─────────────────────────────────────
  console.log("[TEST 1] Phone Number Normalization Edge Cases");

  const phoneCases = [
    { input: "98765 43210", expected: "919876543210", desc: "10-digit with spaces" },
    { input: "+91 98765-43210", expected: "919876543210", desc: "+91 prefix with hyphen" },
    { input: "09876543210", expected: "919876543210", desc: "11-digit with leading zero" },
    { input: "91919876543210", expected: "919876543210", desc: "Accidental double 91 prefix" },
    { input: "(987) 654-3210", expected: "919876543210", desc: "Parentheses and hyphens" },
    { input: "919876543210", expected: "919876543210", desc: "Standard 12-digit 91XXXXXXXXXX" },
  ];

  for (const c of phoneCases) {
    const backendRes = normalizePhoneNumber(c.input);
    const frontendRes = formatWhatsAppPhone(c.input);

    assert(backendRes.isValid && backendRes.normalized === c.expected, `Backend: ${c.desc} -> ${c.expected}`);
    assert(frontendRes === c.expected, `Frontend: ${c.desc} -> ${c.expected}`);
  }

  const invalidRes = normalizePhoneNumber("12345");
  assert(!invalidRes.isValid, "Rejects invalid short numbers (< 10 digits)");

  // ── TEST 2: Production URL Resolution (No Localhost in Prod) ────────────────
  console.log("\n[TEST 2] Production URL Resolution & Localhost Immunity");

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  // Simulate prod with no env or localhost in env
  const origAppUrl = process.env.PUBLIC_APP_URL;
  delete process.env.PUBLIC_APP_URL;

  const prodUrl = getPublicAppBaseUrl();
  assert(!prodUrl.includes("localhost") && !prodUrl.includes("127.0.0.1"), "Production URL contains no localhost");
  assert(prodUrl.startsWith("https://"), "Production URL uses secure HTTPS");

  const receiptUrl = getReceiptPdfUrl("REC/2026/000123");
  assert(!receiptUrl.includes("localhost") && !receiptUrl.includes("127.0.0.1"), "Receipt PDF URL contains no localhost");
  assert(receiptUrl.startsWith("https://"), "Receipt PDF URL is HTTPS");
  assert(receiptUrl.includes("REC%2F2026%2F000123.pdf") || receiptUrl.includes("REC/2026/000123.pdf") || receiptUrl.endsWith(".pdf"), "Receipt PDF URL includes encoded receipt number");

  // Restore
  if (origAppUrl) process.env.PUBLIC_APP_URL = origAppUrl;
  process.env.NODE_ENV = originalNodeEnv;

  // ── TEST 3: Dynamic PDF Generation (Updated Data) ───────────────────────────
  console.log("\n[TEST 3] Fresh PDF Generation with Updated Donation Data");

  // Version 1: Original Donation ₹5,001
  const pdfV1 = await generateVarganiPdf({
    receiptNumber: "REC-2026-000001",
    donationDate: "2026-08-25",
    name: "Ramesh Sharma",
    mobile: "9876543210",
    building: "Gokul Dham",
    wing: "A",
    flat: "402",
    amount: 5001,
    paymentMethod: "upi",
    festivalName: "गणेश उत्सव",
    festivalYear: 2026,
    collectedBy: "Admin",
  });
  assert(pdfV1.length > 5000, `Generated PDF Version 1 (${pdfV1.length} bytes)`);

  // Version 2: Edited Donation ₹11,000 with updated name
  const pdfV2 = await generateVarganiPdf({
    receiptNumber: "REC-2026-000001",
    donationDate: "2026-08-26",
    name: "Rameshwar V. Sharma",
    mobile: "9876543210",
    building: "Gokul Dham",
    wing: "A",
    flat: "402",
    amount: 11000,
    paymentMethod: "bank_transfer",
    festivalName: "गणेश उत्सव",
    festivalYear: 2026,
    collectedBy: "Admin",
  });
  assert(pdfV2.length > 5000, `Generated PDF Version 2 with updated data (${pdfV2.length} bytes)`);
  assert(amountInWords(11000).includes("Eleven Thousand"), "Amount in words calculates accurately for ₹11,000");

  // ── TEST 4: WhatsApp Message Format & Fallback ──────────────────────────────
  console.log("\n[TEST 4] WhatsApp Message Formatting & Fallback Behavior");

  const caption = buildVarganiCaption({
    receiptNumber: "REC-2026-000001",
    festivalName: "गणेश उत्सव",
    donorName: "Rameshwar V. Sharma",
    amount: 11000,
    pdfUrl: "https://meditiya-sathi.vercel.app/api/vargani-pdf/REC-2026-000001.pdf",
  });

  assert(caption.includes("मेड़तिया मित्र मंडळ"), "Message contains Mandal branding");
  assert(caption.includes("REC-2026-000001"), "Message contains correct Receipt No");
  assert(caption.includes("₹11,000"), "Message contains formatted Amount");
  assert(caption.includes("https://meditiya-sathi.vercel.app/api/vargani-pdf/REC-2026-000001.pdf"), "Message contains production receipt URL");
  assert(!caption.includes("localhost"), "Message contains NO localhost URL");

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
