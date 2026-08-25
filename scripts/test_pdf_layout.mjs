import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { generateVarganiPdf, amountInWords, getMarathiNumberWords } from "../artifacts/api-server/dist/app.mjs";

async function runTests() {
  console.log("=== Testing Vargani Donation Receipt PDF Engine ===");

  const testCases = [
    {
      name: "1. Normal Receipt",
      data: {
        receiptNumber: "REC-2026-000101",
        donationDate: new Date("2026-08-25"),
        name: "Aryan Anant Palekar",
        mobile: "+91 98765 43210",
        building: "Sai Leela Bldg",
        wing: "A",
        flat: "103",
        amount: 501,
        paymentMethod: "UPI",
        festivalName: "गणेश उत्सव",
        festivalYear: 2026,
        collectedBy: "Admin",
      },
      file: "test_receipt_normal.pdf",
    },
    {
      name: "2. Long Name",
      data: {
        receiptNumber: "REC-2026-000102",
        donationDate: new Date("2026-08-25"),
        name: "Very Long Resident Full Name Example With Extra Surnames And Middle Names",
        mobile: "+91 98765 43210",
        building: "Sai Leela Bldg",
        wing: "B",
        flat: "204",
        amount: 1001,
        paymentMethod: "CASH",
        festivalName: "गणेश उत्सव",
        festivalYear: 2026,
        collectedBy: "Suresh Patil (Trustee)",
      },
      file: "test_receipt_long_name.pdf",
    },
    {
      name: "3. Long Building",
      data: {
        receiptNumber: "REC-2026-000103",
        donationDate: new Date("2026-08-26"),
        name: "Rajesh Kumar",
        mobile: "+91 91234 56789",
        building: "Omkareshwar Residency Apartment Complex Phase 2",
        wing: "Tower C",
        flat: "1102",
        amount: 5000,
        paymentMethod: "BANK_TRANSFER",
        festivalName: "गणेश उत्सव",
        festivalYear: 2026,
        collectedBy: "Treasurer",
      },
      file: "test_receipt_long_building.pdf",
    },
    {
      name: "4. Large Amount",
      data: {
        receiptNumber: "REC-2026-000104",
        donationDate: new Date("2026-08-27"),
        name: "Shree Siddhivinayak Enterprises",
        mobile: "+91 99887 76655",
        building: "Commercial Center",
        wing: "East",
        flat: "501",
        amount: 100001,
        paymentMethod: "CHEQUE",
        festivalName: "गणेश उत्सव",
        festivalYear: 2026,
        collectedBy: "President",
      },
      file: "test_receipt_large_amount.pdf",
    },
    {
      name: "5. Long Festival",
      data: {
        receiptNumber: "REC-2026-000105",
        donationDate: new Date("2026-09-01"),
        name: "Mahesh Joshi",
        mobile: "+91 98111 22334",
        building: "Shanti Niwas",
        wing: "A",
        flat: "12",
        amount: 2501,
        paymentMethod: "UPI",
        festivalName: "Ganesh Utsav Mahotsav 2026 Silver Jubilee",
        festivalYear: 2026,
        collectedBy: "Secretary",
      },
      file: "test_receipt_long_festival.pdf",
    },
  ];

  for (const tc of testCases) {
    console.log(`Generating: ${tc.name}...`);
    const buffer = await generateVarganiPdf(tc.data);
    await writeFile(tc.file, buffer);
    console.log(`✓ Saved ${tc.file} (${buffer.length} bytes)`);
  }

  console.log("\nAll test receipts generated successfully!");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
