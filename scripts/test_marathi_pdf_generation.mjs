import { generateVarganiPdf, amountInWords } from "../artifacts/api-server/src/lib/vargani-pdf.ts";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("TESTING REBUILT MARATHI PAUTI PDF GENERATION ENGINE");
  console.log("=======================================================\n");

  const testCases = [
    {
      id: "test-marathi-donor-5001",
      data: {
        receiptNumber: "REC/2026/000123",
        donationDate: "2026-08-24",
        name: "राजेश व्ही. शर्मा (Rajesh V. Sharma)",
        mobile: "+91 98765 43210",
        building: "गोकुळ धाम",
        wing: "Wing A",
        flat: "402",
        amount: 5001,
        paymentMethod: "upi",
        festivalName: "गणेश उत्सव",
        festivalYear: 2026,
        collectedBy: "Super Admin",
      },
      desc: "Test 1: Marathi Donor Name & Standard ₹5,001 Donation",
    },
    {
      id: "test-english-donor-100000",
      data: {
        receiptNumber: "REC/2026/000999",
        donationDate: "2026-09-02",
        name: "Shree Siddhivinayak Construction Pvt. Ltd.",
        mobile: "9820011223",
        building: "Commercial Plaza",
        wing: "Tower 1",
        flat: "1204",
        amount: 100000,
        paymentMethod: "bank_transfer",
        festivalName: "गणेश उत्सव",
        festivalYear: 2026,
        collectedBy: "Mandal Trustee",
      },
      desc: "Test 2: English Donor Name & Large ₹1,00,000 Donation",
    },
    {
      id: "test-marathi-patil-500",
      data: {
        receiptNumber: "RCP-2026-0042",
        donationDate: "2026-08-30",
        name: "अमित बापूसाहेब पाटील",
        mobile: "9821998877",
        building: "शांती भुवन",
        wing: "बी विंग",
        flat: "101",
        amount: 500,
        paymentMethod: "cash",
        festivalName: "सार्वजनिक गणेशोत्सव",
        festivalYear: 2026,
        collectedBy: "Ramesh Pawar (Volunteer)",
      },
      desc: "Test 3: Pure Marathi Resident Details & ₹500 Cash Donation",
    },
    {
      id: "test-navratri-cheque-15000",
      data: {
        receiptNumber: "NAV/2026/0055",
        donationDate: "2026-10-12",
        name: "सौ. सुमित्रा शांताराम सावंत",
        mobile: "+91 99887 76655",
        building: "सुवर्ण सिंधू",
        wing: "C",
        flat: "703",
        amount: 15000,
        paymentMethod: "cheque",
        festivalName: "नवरात्र उत्सव",
        festivalYear: 2026,
        collectedBy: "Secretary",
      },
      desc: "Test 4: Navratri Festival & Cheque Payment ₹15,000",
    },
    {
      id: "test-edited-donation-version2",
      data: {
        receiptNumber: "REC/2026/000123",
        donationDate: "2026-08-25",
        name: "राजेश व्ही. शर्मा व कुटुंब (Updated Name)",
        mobile: "+91 98765 43210",
        building: "गोकुळ धाम",
        wing: "Wing A",
        flat: "402",
        amount: 11000, // Edited from 5001 to 11000
        paymentMethod: "upi",
        festivalName: "गणेश उत्सव",
        festivalYear: 2026,
        collectedBy: "Admin",
      },
      desc: "Test 5: Edited Donation Record with Updated Amount ₹11,000 and Name",
    },
  ];

  for (const tc of testCases) {
    console.log(`[Executing] ${tc.desc}...`);
    const start = Date.now();
    const pdfBuf = await generateVarganiPdf(tc.data);
    const duration = Date.now() - start;

    if (!pdfBuf || pdfBuf.length < 1000) {
      throw new Error(`Failed to generate valid PDF for ${tc.id}`);
    }

    const pdfPath = path.resolve(`${tc.id}.pdf`);
    await writeFile(pdfPath, pdfBuf);
    console.log(`  ✓ Generated ${tc.id}.pdf (${pdfBuf.length} bytes in ${duration}ms)`);
  }

  // Convert the first test case to PNG and inspect
  console.log("\nConverting test-marathi-donor-5001.pdf to PNG for inspection...");
  execSync(`python -c "import pymupdf; doc = pymupdf.open('test-marathi-donor-5001.pdf'); doc[0].get_pixmap(dpi=150).save('test-marathi-donor-5001.png')"`);
  console.log("  ✓ Saved test-marathi-donor-5001.png");

  console.log("\n=======================================================");
  console.log("ALL MARATHI PAUTI PDF TESTS PASSED SUCCESSFULLY");
  console.log("=======================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
