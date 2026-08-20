import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { VARGANI_RECEIPT_CONFIG as CONFIG } from "./vargani-receipt-config.js";

export interface VarganiPdfData {
  receiptNumber: string;
  donationDate: string | Date;
  name: string;
  mobile?: string | null;
  building?: string | null;
  wing?: string | null;
  flat?: string | null;
  amount: number;
  paymentMethod: string;
  festivalName?: string | null;
  festivalYear?: number | null;
  collectedBy: string;
}

const clean = (value: unknown, fallback = "—") => {
  const text = String(value ?? "").trim();
  return text && text !== "null" && text !== "undefined" ? text : fallback;
};

function underHundred(n: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];
  if (n < 20) return ones[n] || "";
  return `${tens[Math.floor(n / 10)] || ""}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
}

function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  return [
    hundreds ? `${underHundred(hundreds)} Hundred` : "",
    remainder ? underHundred(remainder) : "",
  ].filter(Boolean).join(" ");
}

export function amountInWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid donation amount");
  const rupees = Math.floor(value + 1e-9);
  const paise = Math.round((value - rupees) * 100);
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  const result = parts.join(" ") || "Zero";
  return `Rupees ${result}${paise ? ` and ${underHundred(paise)} Paise` : ""} Only`;
}

function projectAssetPath(fileName: string): string {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/meditiya-sathi/public", fileName),
    path.resolve(process.cwd(), "../meditiya-sathi/public", fileName),
    path.resolve(process.cwd(), "../../artifacts/meditiya-sathi/public", fileName),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function drawCentered(page: any, text: string, y: number, size: number, font: any, color: any) {
  const textWidth = font.widthOfTextAtSize(text, size);
  const x = (page.getWidth() - textWidth) / 2;
  page.drawText(text, { x, y, size, font, color });
}

function fitText(text: string, maxWidth: number, size: number, font: any): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && font.widthOfTextAtSize(`${truncated}...`, size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

export async function generateVarganiPdf(data: VarganiPdfData): Promise<Buffer> {
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("Donation amount is invalid");
  }

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Load Unicode-safe fonts for INR (₹) symbol & Marathi/English typography
  const fontPath = projectAssetPath("noto-sans-regular.woff");
  const boldFontPath = projectAssetPath("noto-sans-bold.woff");
  let regular: any;
  let bold: any;
  try {
    regular = await doc.embedFont(await readFile(fontPath), { subset: false });
    bold = await doc.embedFont(await readFile(boldFontPath), { subset: false });
  } catch (fontError) {
    throw new Error(
      `Vargani receipt font could not be loaded: ${fontError instanceof Error ? fontError.message : String(fontError)}`
    );
  }

  // Exactly 1 page: Standard A4 Portrait (595.28 x 841.89 pt)
  const page = doc.addPage([595.28, 841.89]);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  // Premium festive color palette
  const saffron = rgb(0.88, 0.40, 0.05);       // #E0660D
  const darkNavy = rgb(0.09, 0.12, 0.18);      // #171F2E
  const ink = rgb(0.18, 0.20, 0.24);           // #2E333D
  const muted = rgb(0.44, 0.47, 0.52);         // #707885
  const borderGold = rgb(0.86, 0.78, 0.62);    // #DCC79E
  const innerBorder = rgb(0.92, 0.88, 0.80);   // #EBE0CC
  const lightCream = rgb(0.99, 0.98, 0.95);    // #FCFAF2
  const white = rgb(1, 1, 1);
  const emeraldGreen = rgb(0.08, 0.58, 0.32);  // #149452

  // 1. Page Background & Top Festive Accent Bar
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: lightCream,
  });
  page.drawRectangle({
    x: 0,
    y: pageHeight - 12,
    width: pageWidth,
    height: 12,
    color: saffron,
  });

  // 2. Main Card Container (Single Page Guarantee)
  const margin = 32;
  const cardX = margin;
  const cardY = margin;
  const cardWidth = pageWidth - margin * 2;   // 531.28 pt
  const cardHeight = pageHeight - margin * 2; // 777.89 pt

  // Outer card box
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    color: white,
    borderColor: borderGold,
    borderWidth: 1.5,
  });

  // Inner subtle double-border
  page.drawRectangle({
    x: cardX + 4,
    y: cardY + 4,
    width: cardWidth - 8,
    height: cardHeight - 8,
    borderColor: innerBorder,
    borderWidth: 0.75,
  });

  // 3. Header Section (Top-Left Logo + Top-Right Ganpati + Centered Mandal Info)
  const headerTop = cardY + cardHeight - 20; // ~789.89

  // Embed & Draw Top-Left Logo (Meditiya Sathi / Mandal Logo)
  try {
    const logoName = (CONFIG.mandalLogo || "/logo.png").replace(/^\/+/, "");
    const logoBuffer = await readFile(projectAssetPath(logoName));
    const logoImg = await doc.embedPng(logoBuffer);
    const maxLogoSize = 60;
    const logoScale = Math.min(maxLogoSize / logoImg.width, maxLogoSize / logoImg.height);
    const logoW = logoImg.width * logoScale;
    const logoH = logoImg.height * logoScale;
    page.drawImage(logoImg, {
      x: cardX + 20,
      y: headerTop - 64 + (60 - logoH) / 2,
      width: logoW,
      height: logoH,
    });
  } catch (err) {
    console.warn("Top-left logo image unavailable:", err instanceof Error ? err.message : err);
  }

  // Embed & Draw Top-Right Ganpati Image
  try {
    const ganpatiName = (CONFIG.ganpatiImage || "/logo.png").replace(/^\/+/, "");
    const ganpatiBuffer = await readFile(projectAssetPath(ganpatiName));
    const ganpatiImg = await doc.embedPng(ganpatiBuffer);
    const maxGanpatiSize = 60;
    const ganpatiScale = Math.min(maxGanpatiSize / ganpatiImg.width, maxGanpatiSize / ganpatiImg.height);
    const ganpatiW = ganpatiImg.width * ganpatiScale;
    const ganpatiH = ganpatiImg.height * ganpatiScale;
    page.drawImage(ganpatiImg, {
      x: cardX + cardWidth - 20 - maxGanpatiSize + (60 - ganpatiW) / 2,
      y: headerTop - 64 + (60 - ganpatiH) / 2,
      width: ganpatiW,
      height: ganpatiH,
    });
  } catch (err) {
    console.warn("Top-right Ganpati image unavailable:", err instanceof Error ? err.message : err);
  }

  // Centered Mandal Information
  drawCentered(page, CONFIG.mandalName, headerTop - 18, 18, bold, darkNavy);
  drawCentered(page, CONFIG.location, headerTop - 36, 11, regular, muted);
  const festTitle = `${data.festivalName || CONFIG.festivalName} ${data.festivalYear || CONFIG.festivalYear}`;
  drawCentered(page, festTitle, headerTop - 53, 12, bold, saffron);

  // Vargani Receipt Title Badge
  const badgeWidth = 200;
  const badgeHeight = 24;
  const badgeX = (pageWidth - badgeWidth) / 2;
  const badgeY = headerTop - 86;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeWidth,
    height: badgeHeight,
    color: rgb(0.99, 0.94, 0.88),
    borderColor: saffron,
    borderWidth: 1,
  });
  drawCentered(page, CONFIG.receiptTitle, badgeY + 6.5, 12, bold, saffron);

  // Header bottom divider
  const dividerY = badgeY - 14; // ~689
  page.drawLine({
    start: { x: cardX + 16, y: dividerY },
    end: { x: cardX + cardWidth - 16, y: dividerY },
    thickness: 1,
    color: innerBorder,
  });

  // 4. Receipt Number & Date Row
  const infoBarY = dividerY - 38; // ~651
  page.drawRectangle({
    x: cardX + 16,
    y: infoBarY,
    width: cardWidth - 32,
    height: 30,
    color: rgb(0.98, 0.96, 0.92),
    borderColor: innerBorder,
    borderWidth: 1,
  });

  page.drawText("Receipt No:", {
    x: cardX + 28,
    y: infoBarY + 9,
    size: 10,
    font: bold,
    color: muted,
  });
  page.drawText(clean(data.receiptNumber), {
    x: cardX + 96,
    y: infoBarY + 9,
    size: 11,
    font: bold,
    color: darkNavy,
  });

  const dateObj = new Date(data.donationDate);
  const dateStr = Number.isNaN(dateObj.getTime())
    ? clean(data.donationDate)
    : dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  page.drawText("Date:", {
    x: cardX + cardWidth - 170,
    y: infoBarY + 9,
    size: 10,
    font: bold,
    color: muted,
  });
  page.drawText(dateStr, {
    x: cardX + cardWidth - 134,
    y: infoBarY + 9,
    size: 11,
    font: bold,
    color: darkNavy,
  });

  // 5. Donor Details Section
  const donorSectionY = infoBarY - 26; // ~625
  page.drawText("DONOR DETAILS", {
    x: cardX + 18,
    y: donorSectionY,
    size: 11,
    font: bold,
    color: saffron,
  });
  page.drawLine({
    start: { x: cardX + 120, y: donorSectionY + 4 },
    end: { x: cardX + cardWidth - 18, y: donorSectionY + 4 },
    thickness: 0.75,
    color: innerBorder,
  });

  // Donor Details Box (Tabular Grid with no overlaps)
  const donorBoxHeight = 114;
  const donorBoxY = donorSectionY - 10 - donorBoxHeight; // ~501
  page.drawRectangle({
    x: cardX + 16,
    y: donorBoxY,
    width: cardWidth - 32,
    height: donorBoxHeight,
    color: rgb(0.995, 0.995, 1),
    borderColor: innerBorder,
    borderWidth: 1,
  });

  // Row 1: Name & Mobile
  const col1X = cardX + 32;
  const col2X = cardX + cardWidth / 2 + 10;
  const colWidth = (cardWidth - 80) / 2;

  // Donor Name
  page.drawText("NAME", { x: col1X, y: donorBoxY + 88, size: 8.5, font: bold, color: muted });
  page.drawText(fitText(clean(data.name), colWidth, 11.5, bold), {
    x: col1X,
    y: donorBoxY + 72,
    size: 11.5,
    font: bold,
    color: darkNavy,
  });

  // Mobile
  page.drawText("MOBILE NUMBER", { x: col2X, y: donorBoxY + 88, size: 8.5, font: bold, color: muted });
  page.drawText(fitText(clean(data.mobile), colWidth, 11.5, bold), {
    x: col2X,
    y: donorBoxY + 72,
    size: 11.5,
    font: bold,
    color: darkNavy,
  });

  // Mid Divider in Donor Box
  page.drawLine({
    start: { x: col1X, y: donorBoxY + 58 },
    end: { x: cardX + cardWidth - 32, y: donorBoxY + 58 },
    thickness: 0.5,
    color: innerBorder,
  });

  // Row 2: Building/Wing & Flat
  const bldgText = [data.building, data.wing].filter(Boolean).join(" - ") || clean(data.building);
  page.drawText("BUILDING / WING", { x: col1X, y: donorBoxY + 38, size: 8.5, font: bold, color: muted });
  page.drawText(fitText(bldgText, colWidth, 11.5, bold), {
    x: col1X,
    y: donorBoxY + 22,
    size: 11.5,
    font: bold,
    color: darkNavy,
  });

  page.drawText("FLAT NUMBER", { x: col2X, y: donorBoxY + 38, size: 8.5, font: bold, color: muted });
  page.drawText(fitText(clean(data.flat), colWidth, 11.5, bold), {
    x: col2X,
    y: donorBoxY + 22,
    size: 11.5,
    font: bold,
    color: darkNavy,
  });

  // 6. Payment Details Section
  const paymentSectionY = donorBoxY - 24; // ~477
  page.drawText("PAYMENT DETAILS", {
    x: cardX + 18,
    y: paymentSectionY,
    size: 11,
    font: bold,
    color: saffron,
  });
  page.drawLine({
    start: { x: cardX + 138, y: paymentSectionY + 4 },
    end: { x: cardX + cardWidth - 18, y: paymentSectionY + 4 },
    thickness: 0.75,
    color: innerBorder,
  });

  // Highlighted Payment Card Box
  const payCardHeight = 142;
  const payCardY = paymentSectionY - 10 - payCardHeight; // ~325
  page.drawRectangle({
    x: cardX + 16,
    y: payCardY,
    width: cardWidth - 32,
    height: payCardHeight,
    color: rgb(0.99, 0.975, 0.94),
    borderColor: borderGold,
    borderWidth: 1.5,
  });

  // Amount Subtitle
  drawCentered(page, "VARGANI AMOUNT", payCardY + 118, 10, bold, rgb(0.50, 0.42, 0.30));

  // Prominent Amount (Visual Focal Point)
  const formattedAmt = `₹${data.amount.toLocaleString("en-IN", {
    minimumFractionDigits: data.amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
  drawCentered(page, formattedAmt, payCardY + 84, 28, bold, darkNavy);

  // Amount in Words
  const wordsText = fitText(amountInWords(data.amount), cardWidth - 64, 10.5, regular);
  drawCentered(page, wordsText, payCardY + 62, 10.5, regular, ink);

  // Inner Divider in Payment Card
  page.drawLine({
    start: { x: cardX + 48, y: payCardY + 46 },
    end: { x: cardX + cardWidth - 48, y: payCardY + 46 },
    thickness: 0.5,
    color: borderGold,
  });

  // Payment Method Pill
  const methodLabel = `Payment Method: ${clean(data.paymentMethod).replace(/_/g, " ").toUpperCase()}`;
  const methodPillWidth = Math.min(cardWidth - 80, regular.widthOfTextAtSize(methodLabel, 10) + 32);
  const methodPillX = (pageWidth - methodPillWidth) / 2;
  page.drawRectangle({
    x: methodPillX,
    y: payCardY + 14,
    width: methodPillWidth,
    height: 22,
    color: rgb(0.92, 0.97, 0.94),
    borderColor: emeraldGreen,
    borderWidth: 1,
  });
  drawCentered(page, methodLabel, payCardY + 20.5, 9.5, bold, emeraldGreen);

  // 7. Collected By Section (NO SIGNATURE, NO SIGNATURE LINE, NO AUTHORIZED PERSON)
  const collectedBoxHeight = 40;
  const collectedBoxY = payCardY - 20 - collectedBoxHeight; // ~265
  page.drawRectangle({
    x: cardX + 16,
    y: collectedBoxY,
    width: cardWidth - 32,
    height: collectedBoxHeight,
    color: rgb(0.98, 0.985, 0.99),
    borderColor: innerBorder,
    borderWidth: 1,
  });

  page.drawText("Collected By:", {
    x: cardX + 32,
    y: collectedBoxY + 14,
    size: 10.5,
    font: bold,
    color: muted,
  });
  page.drawText(fitText(clean(data.collectedBy), 240, 12, bold), {
    x: cardX + 115,
    y: collectedBoxY + 13.5,
    size: 12,
    font: bold,
    color: darkNavy,
  });

  // Paid Verification Tag on Right
  const verifiedText = "STATUS: PAID ✓";
  const verifiedWidth = bold.widthOfTextAtSize(verifiedText, 9.5) + 20;
  page.drawRectangle({
    x: cardX + cardWidth - 32 - verifiedWidth,
    y: collectedBoxY + 9,
    width: verifiedWidth,
    height: 22,
    color: rgb(0.90, 0.96, 0.92),
    borderColor: emeraldGreen,
    borderWidth: 1,
  });
  page.drawText(verifiedText, {
    x: cardX + cardWidth - 22 - verifiedWidth,
    y: collectedBoxY + 15,
    size: 9.5,
    font: bold,
    color: emeraldGreen,
  });

  // 8. Footer Section
  const footerDividerY = collectedBoxY - 20; // ~245
  page.drawLine({
    start: { x: cardX + 16, y: footerDividerY },
    end: { x: cardX + cardWidth - 16, y: footerDividerY },
    thickness: 1,
    color: innerBorder,
  });

  drawCentered(
    page,
    "Thank you for your valuable contribution.",
    footerDividerY - 22,
    10.5,
    regular,
    muted
  );
  drawCentered(
    page,
    "Ganpati Bappa Morya! 🙏",
    footerDividerY - 42,
    13,
    bold,
    saffron
  );
  drawCentered(
    page,
    "Official Mandal Vargani Receipt • Meditiya Sathi",
    cardY + 18,
    8.5,
    regular,
    rgb(0.60, 0.63, 0.68)
  );

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

