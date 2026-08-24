import "regenerator-runtime/runtime.js";
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
  collectedBy?: string | null;
}

const clean = (value: unknown, fallback = "—"): string => {
  const text = String(value ?? "").trim();
  return text && text !== "null" && text !== "undefined" && text !== "[object Object]" ? text : fallback;
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
  if (!Number.isFinite(value) || value < 0) return "—";
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
    path.resolve(process.cwd(), "public", fileName),
    path.resolve(process.cwd(), "dist", fileName),
    path.resolve(process.cwd(), "artifacts/api-server/dist", fileName),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function projectFontPath(fontFileName: string): string {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/meditiya-sathi/public", fontFileName),
    path.resolve(process.cwd(), "../meditiya-sathi/public", fontFileName),
    path.resolve(process.cwd(), "node_modules/@fontsource/noto-sans/files", fontFileName),
    path.resolve(process.cwd(), "artifacts/api-server/node_modules/@fontsource/noto-sans/files", fontFileName),
    path.resolve(process.cwd(), "../../node_modules/@fontsource/noto-sans/files", fontFileName),
    path.resolve(process.cwd(), "node_modules/@fontsource/noto-serif-devanagari/files", fontFileName),
    path.resolve(process.cwd(), "artifacts/api-server/node_modules/@fontsource/noto-serif-devanagari/files", fontFileName),
    path.resolve(process.cwd(), "../../node_modules/@fontsource/noto-serif-devanagari/files", fontFileName),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function drawCentered(
  page: any,
  text: string,
  y: number,
  size: number,
  font: any,
  color: any,
  customCenterX?: number
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  const centerX = customCenterX ?? page.getWidth() / 2;
  const x = centerX - textWidth / 2;
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

function formatIndianCurrency(amount: number): string {
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `₹ ${formatted}/-`;
}

function formatDateStr(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return "—";
  const dateObj = new Date(dateVal);
  if (Number.isNaN(dateObj.getTime())) return clean(dateVal);
  return dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPaymentMethod(method: string | null | undefined): string {
  const raw = clean(method, "CASH").toUpperCase().replace(/_/g, " ");
  if (raw === "UPI") return "UPI";
  if (raw === "CASH") return "CASH";
  if (raw === "BANK TRANSFER") return "BANK TRANSFER";
  if (raw === "CHEQUE") return "CHEQUE";
  return raw;
}


export async function generateVarganiPdf(data: VarganiPdfData): Promise<Buffer> {
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("Donation amount is invalid");
  }

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Load Unicode-safe fonts supporting Marathi (Devanagari) & English typography
  let regular: any;
  let bold: any;
  let serifBold: any;

  try {
    const regFontPath = projectFontPath("noto-sans-devanagari-regular.woff");
    const boldFontPath = projectFontPath("noto-sans-devanagari-bold.woff");
    const serifFontPath = projectFontPath("noto-serif-devanagari-bold.woff");

    const regBytes = await readFile(regFontPath).catch(() =>
      readFile(projectFontPath("noto-sans-devanagari-400-normal.woff"))
    );
    const boldBytes = await readFile(boldFontPath).catch(() =>
      readFile(projectFontPath("noto-sans-devanagari-700-normal.woff"))
    );
    const serifBytes = await readFile(serifFontPath).catch(() =>
      readFile(projectFontPath("noto-serif-devanagari-devanagari-700-normal.woff")).catch(() => boldBytes)
    );

    regular = await doc.embedFont(regBytes, { subset: false });
    bold = await doc.embedFont(boldBytes, { subset: false });
    serifBold = await doc.embedFont(serifBytes, { subset: false });
  } catch (fontError) {
    throw new Error(
      `Vargani receipt fonts could not be loaded: ${fontError instanceof Error ? fontError.message : String(fontError)}`
    );
  }

  // Exactly 1 page: Standard A4 Portrait (595.28 x 841.89 pt)
  const page = doc.addPage([595.28, 841.89]);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const pageCenterX = pageWidth / 2;

  // Premium festive color palette (Black, Charcoal, Gold, Saffron, Emerald)
  const black = rgb(0.07, 0.08, 0.11);          // #12151C
  const deepCharcoal = rgb(0.12, 0.14, 0.18);   // #1F242E
  const gold = rgb(0.83, 0.65, 0.22);           // #D4A638
  const goldLight = rgb(0.96, 0.82, 0.45);      // #F5D173
  const saffron = rgb(0.88, 0.40, 0.06);        // #E0660F
  const cream = rgb(0.985, 0.98, 0.965);        // #FAF8F6
  const white = rgb(1, 1, 1);
  const darkNavy = rgb(0.08, 0.10, 0.15);       // #141A26
  const muted = rgb(0.44, 0.46, 0.50);          // #707580
  const emeraldGreen = rgb(0.06, 0.55, 0.28);   // #0F8C47
  const innerBorder = rgb(0.88, 0.83, 0.74);    // #E0D4BD
  const sectionBorder = rgb(0.85, 0.78, 0.66);  // #D9C7A8

  // 1. Page Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: cream,
  });

  // 2. Main Card Container (Single Page Guarantee)
  const margin = 28;
  const cardX = margin;
  const cardY = margin;
  const cardWidth = pageWidth - margin * 2;   // 539.28 pt
  const cardHeight = pageHeight - margin * 2; // 785.89 pt
  const contentX = cardX + 16;
  const contentW = cardWidth - 32;            // 507.28 pt

  // Outer card box with double gold border
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    color: white,
    borderColor: gold,
    borderWidth: 1.5,
  });

  // Inner subtle border
  page.drawRectangle({
    x: cardX + 3.5,
    y: cardY + 3.5,
    width: cardWidth - 7,
    height: cardHeight - 7,
    borderColor: innerBorder,
    borderWidth: 0.75,
  });

  // 3. Header Section (Premium Black Header with Gold/Orange Accents)
  const headerHeight = 108;
  const headerY = cardY + cardHeight - headerHeight;

  // Header background
  page.drawRectangle({
    x: cardX,
    y: headerY,
    width: cardWidth,
    height: headerHeight,
    color: black,
  });

  // Top saffron strip
  page.drawRectangle({
    x: cardX,
    y: cardY + cardHeight - 3,
    width: cardWidth,
    height: 3,
    color: saffron,
  });

  // Bottom gold & saffron dual accent lines
  page.drawLine({
    start: { x: cardX, y: headerY },
    end: { x: cardX + cardWidth, y: headerY },
    thickness: 1.5,
    color: gold,
  });
  page.drawLine({
    start: { x: cardX, y: headerY - 2.5 },
    end: { x: cardX + cardWidth, y: headerY - 2.5 },
    thickness: 1,
    color: saffron,
  });

  // Header Left: Embed & Draw Mandal Logo
  try {
    const logoName = (CONFIG.mandalLogo || "/logo.png").replace(/^\/+/, "");
    const logoBuffer = await readFile(projectAssetPath(logoName));
    const logoImg = await doc.embedPng(logoBuffer);
    const maxLogoW = 74;
    const maxLogoH = 74;
    const logoScale = Math.min(maxLogoW / logoImg.width, maxLogoH / logoImg.height);
    const logoW = logoImg.width * logoScale;
    const logoH = logoImg.height * logoScale;
    page.drawImage(logoImg, {
      x: cardX + 18,
      y: headerY + (headerHeight - logoH) / 2,
      width: logoW,
      height: logoH,
    });
  } catch (err) {
    console.warn("Mandal logo image unavailable:", err instanceof Error ? err.message : err);
  }

  // Header Center / Right: Mandal Typography
  const headerTextCenterX = cardX + 90 + (cardWidth - 100) / 2;
  drawCentered(page, CONFIG.mandalNameMarathi, headerY + 73, 20, serifBold, rgb(1, 0.98, 0.94), headerTextCenterX);
  drawCentered(page, CONFIG.mandalNameEnglish.toUpperCase(), headerY + 54, 9.5, bold, goldLight, headerTextCenterX);
  drawCentered(page, CONFIG.locationMarathi, headerY + 36, 9, regular, rgb(0.88, 0.88, 0.90), headerTextCenterX);
  drawCentered(page, CONFIG.subtagMarathi, headerY + 18, 8, regular, rgb(0.92, 0.65, 0.35), headerTextCenterX);

  // 4. Main Title Section ("पावती / DONATION RECEIPT")
  const titleY = headerY - 32;
  const titleText = CONFIG.receiptTitleMarathi; // "पावती"
  const titleWidth = serifBold.widthOfTextAtSize(titleText, 22);

  // Centered Title Text
  page.drawText(titleText, {
    x: pageCenterX - titleWidth / 2,
    y: titleY,
    size: 22,
    font: serifBold,
    color: darkNavy,
  });

  // Gold decorative separator bars on both sides
  const lineGap = 16;
  const leftLineEnd = pageCenterX - titleWidth / 2 - lineGap;
  const rightLineStart = pageCenterX + titleWidth / 2 + lineGap;

  page.drawLine({
    start: { x: cardX + 50, y: titleY + 7 },
    end: { x: leftLineEnd, y: titleY + 7 },
    thickness: 1,
    color: gold,
  });
  page.drawLine({
    start: { x: rightLineStart, y: titleY + 7 },
    end: { x: cardX + cardWidth - 50, y: titleY + 7 },
    thickness: 1,
    color: gold,
  });

  // Diamond ornamental accents
  page.drawText("❖", { x: leftLineEnd - 12, y: titleY + 2.5, size: 9, font: regular, color: saffron });
  page.drawText("❖", { x: rightLineStart + 3, y: titleY + 2.5, size: 9, font: regular, color: saffron });

  // English Subtitle
  drawCentered(page, CONFIG.receiptTitleEnglish, titleY - 14, 10, bold, saffron, pageCenterX);

  // 5. Receipt Summary Section (Horizontal Bar)
  const summaryBoxH = 36;
  const summaryBoxY = titleY - 58;

  page.drawRectangle({
    x: contentX,
    y: summaryBoxY,
    width: contentW,
    height: summaryBoxH,
    color: rgb(0.985, 0.975, 0.95),
    borderColor: innerBorder,
    borderWidth: 1,
  });

  const colW = contentW / 3;

  // Col 1: Receipt Number
  page.drawText("पावती क्रमांक / Receipt No.", {
    x: contentX + 12,
    y: summaryBoxY + 21,
    size: 7.5,
    font: bold,
    color: muted,
  });
  page.drawText(fitText(clean(data.receiptNumber), colW - 24, 10, bold), {
    x: contentX + 12,
    y: summaryBoxY + 8,
    size: 10,
    font: bold,
    color: darkNavy,
  });

  // Divider 1
  page.drawLine({
    start: { x: contentX + colW, y: summaryBoxY + 4 },
    end: { x: contentX + colW, y: summaryBoxY + summaryBoxH - 4 },
    thickness: 0.75,
    color: innerBorder,
  });

  // Col 2: Date
  page.drawText("दिनांक / Date", {
    x: contentX + colW + 12,
    y: summaryBoxY + 21,
    size: 7.5,
    font: bold,
    color: muted,
  });
  page.drawText(formatDateStr(data.donationDate), {
    x: contentX + colW + 12,
    y: summaryBoxY + 8,
    size: 10,
    font: bold,
    color: darkNavy,
  });

  // Divider 2
  page.drawLine({
    start: { x: contentX + colW * 2, y: summaryBoxY + 4 },
    end: { x: contentX + colW * 2, y: summaryBoxY + summaryBoxH - 4 },
    thickness: 0.75,
    color: innerBorder,
  });

  // Col 3: Festival
  const festivalTitle = data.festivalName
    ? `${data.festivalName}${data.festivalYear ? ` ${data.festivalYear}` : ""}`
    : "—";
  page.drawText("उत्सव / Festival", {
    x: contentX + colW * 2 + 12,
    y: summaryBoxY + 21,
    size: 7.5,
    font: bold,
    color: muted,
  });
  page.drawText(fitText(festivalTitle, colW - 24, 10, bold), {
    x: contentX + colW * 2 + 12,
    y: summaryBoxY + 8,
    size: 10,
    font: bold,
    color: saffron,
  });


  // 6. Donor Information Box (दात्याची माहिती / DONOR INFORMATION)
  const donorBoxH = 96;
  const donorBoxY = summaryBoxY - 14 - donorBoxH;

  page.drawRectangle({
    x: contentX,
    y: donorBoxY,
    width: contentW,
    height: donorBoxH,
    color: white,
    borderColor: sectionBorder,
    borderWidth: 1,
  });

  // Section Header Tab (Saffron / Gold Tab)
  const donorTabW = 195;
  const donorTabH = 18;
  page.drawRectangle({
    x: contentX,
    y: donorBoxY + donorBoxH - donorTabH,
    width: donorTabW,
    height: donorTabH,
    color: saffron,
  });
  page.drawText("दात्याची माहिती / DONOR INFORMATION", {
    x: contentX + 10,
    y: donorBoxY + donorBoxH - donorTabH + 4.5,
    size: 8,
    font: bold,
    color: white,
  });

  // Donor Grid Fields
  const dCol1X = contentX + 16;
  const dCol2X = contentX + contentW / 2 + 10;
  const dColW = (contentW - 60) / 2;

  // Row 1: Donor Name & Mobile Number
  page.drawText("दात्याचे नाव / Donor Name", {
    x: dCol1X,
    y: donorBoxY + 58,
    size: 7.5,
    font: bold,
    color: muted,
  });
  page.drawText(fitText(clean(data.name), dColW, 11, bold), {
    x: dCol1X,
    y: donorBoxY + 43,
    size: 11,
    font: bold,
    color: darkNavy,
  });

  page.drawText("मोबाईल क्रमांक / Mobile No.", {
    x: dCol2X,
    y: donorBoxY + 58,
    size: 7.5,
    font: bold,
    color: muted,
  });
  page.drawText(fitText(clean(data.mobile), dColW, 11, bold), {
    x: dCol2X,
    y: donorBoxY + 43,
    size: 11,
    font: bold,
    color: darkNavy,
  });

  // Horizontal divider between rows
  page.drawLine({
    start: { x: contentX + 12, y: donorBoxY + 36 },
    end: { x: contentX + contentW - 12, y: donorBoxY + 36 },
    thickness: 0.5,
    color: innerBorder,
  });

  // Row 2: Building/Wing & Flat Number
  const bldgWingParts = [data.building, data.wing].filter(Boolean);
  const bldgWingText = bldgWingParts.length > 0 ? bldgWingParts.join(" - ") : clean(data.building);

  page.drawText("इमारत व विंग / Building & Wing", {
    x: dCol1X,
    y: donorBoxY + 22,
    size: 7.5,
    font: bold,
    color: muted,
  });
  page.drawText(fitText(bldgWingText, dColW, 10.5, bold), {
    x: dCol1X,
    y: donorBoxY + 8,
    size: 10.5,
    font: bold,
    color: darkNavy,
  });

  page.drawText("फ्लॅट क्रमांक / Flat No.", {
    x: dCol2X,
    y: donorBoxY + 22,
    size: 7.5,
    font: bold,
    color: muted,
  });
  page.drawText(fitText(clean(data.flat), dColW, 10.5, bold), {
    x: dCol2X,
    y: donorBoxY + 8,
    size: 10.5,
    font: bold,
    color: darkNavy,
  });

  // 7. Donation Details Box (देणगी तपशील / DONATION DETAILS)
  const payBoxH = 135;
  const payBoxY = donorBoxY - 14 - payBoxH;

  page.drawRectangle({
    x: contentX,
    y: payBoxY,
    width: contentW,
    height: payBoxH,
    color: rgb(0.995, 0.985, 0.965),
    borderColor: gold,
    borderWidth: 1.5,
  });

  // Section Header Tab (Dark Charcoal / Gold Tab)
  const payTabW = 195;
  const payTabH = 18;
  page.drawRectangle({
    x: contentX,
    y: payBoxY + payBoxH - payTabH,
    width: payTabW,
    height: payTabH,
    color: deepCharcoal,
  });
  page.drawText("देणगी तपशील / DONATION DETAILS", {
    x: contentX + 10,
    y: payBoxY + payBoxH - payTabH + 4.5,
    size: 8,
    font: bold,
    color: goldLight,
  });

  // Amount Header Label
  drawCentered(page, "देणगी रक्कम / Donation Amount", payBoxY + 98, 9, bold, saffron, pageCenterX);

  // Prominent Amount (Visual Focal Point: e.g. ₹ 5,001/-)
  const formattedAmount = formatIndianCurrency(data.amount);
  drawCentered(page, formattedAmount, payBoxY + 70, 24, bold, darkNavy, pageCenterX);

  // Amount in Words
  const wordsStr = `रक्कमेचे शब्दांत / Amount in Words : ${amountInWords(data.amount)}`;
  const fittedWords = fitText(wordsStr, contentW - 40, 9.5, regular);
  drawCentered(page, fittedWords, payBoxY + 48, 9.5, regular, darkNavy, pageCenterX);

  // Inner Divider in Payment Box
  page.drawLine({
    start: { x: contentX + 24, y: payBoxY + 36 },
    end: { x: contentX + contentW - 24, y: payBoxY + 36 },
    thickness: 0.5,
    color: innerBorder,
  });

  // Lower Row: Payment Method & Payment Date
  const methodLabel = formatPaymentMethod(data.paymentMethod);
  page.drawText("पेमेंट पद्धत / Payment Method: ", {
    x: contentX + 24,
    y: payBoxY + 14,
    size: 8.5,
    font: bold,
    color: muted,
  });

  // Payment method pill badge
  const methodPillText = methodLabel;
  const methodPillW = bold.widthOfTextAtSize(methodPillText, 9) + 16;
  page.drawRectangle({
    x: contentX + 160,
    y: payBoxY + 9,
    width: methodPillW,
    height: 19,
    color: rgb(0.92, 0.97, 0.94),
    borderColor: emeraldGreen,
    borderWidth: 0.75,
  });
  page.drawText(methodPillText, {
    x: contentX + 168,
    y: payBoxY + 14,
    size: 9,
    font: bold,
    color: emeraldGreen,
  });

  // Payment Date on Right
  page.drawText("पेमेंट दिनांक / Payment Date: ", {
    x: contentX + contentW / 2 + 20,
    y: payBoxY + 14,
    size: 8.5,
    font: bold,
    color: muted,
  });
  page.drawText(formatDateStr(data.donationDate), {
    x: contentX + contentW / 2 + 155,
    y: payBoxY + 14,
    size: 9.5,
    font: bold,
    color: darkNavy,
  });


  // 8. Thank You & Received By Box
  const thankBoxH = 72;
  const thankBoxY = payBoxY - 14 - thankBoxH;

  page.drawRectangle({
    x: contentX,
    y: thankBoxY,
    width: contentW,
    height: thankBoxH,
    color: white,
    borderColor: innerBorder,
    borderWidth: 1,
  });

  // Thank You Message (Left Side)
  page.drawText(CONFIG.thankYouMarathi, {
    x: contentX + 16,
    y: thankBoxY + 48,
    size: 9.5,
    font: bold,
    color: saffron,
  });
  page.drawText(CONFIG.thankYouEnglish, {
    x: contentX + 16,
    y: thankBoxY + 30,
    size: 8.5,
    font: regular,
    color: muted,
  });
  page.drawText(CONFIG.blessingMarathi, {
    x: contentX + 16,
    y: thankBoxY + 12,
    size: 8.5,
    font: bold,
    color: gold,
  });

  // Vertical Divider between Thank You and Received By
  const recColX = contentX + contentW - 165;
  page.drawLine({
    start: { x: recColX - 12, y: thankBoxY + 6 },
    end: { x: recColX - 12, y: thankBoxY + thankBoxH - 6 },
    thickness: 0.5,
    color: innerBorder,
  });

  // Received By (Right Side)
  page.drawText("प्राप्तकर्ता / Received By", {
    x: recColX,
    y: thankBoxY + 48,
    size: 8,
    font: bold,
    color: muted,
  });

  const adminName = clean(data.collectedBy, CONFIG.defaultAdmin);
  page.drawText(fitText(adminName, 155, 9.5, bold), {
    x: recColX,
    y: thankBoxY + 30,
    size: 9.5,
    font: bold,
    color: darkNavy,
  });

  // Status Stamp Tag
  const stampText = "✓ VERIFIED RECEIPT";
  const stampW = bold.widthOfTextAtSize(stampText, 7.5) + 12;
  page.drawRectangle({
    x: recColX,
    y: thankBoxY + 9,
    width: stampW,
    height: 16,
    color: rgb(0.92, 0.97, 0.94),
    borderColor: emeraldGreen,
    borderWidth: 0.75,
  });
  page.drawText(stampText, {
    x: recColX + 6,
    y: thankBoxY + 13.5,
    size: 7.5,
    font: bold,
    color: emeraldGreen,
  });

  // 9. Premium Black Footer ("मेड़तियाचा राजा")
  const footerHeight = 76;
  const footerY = cardY;

  page.drawRectangle({
    x: cardX,
    y: footerY,
    width: cardWidth,
    height: footerHeight,
    color: black,
  });

  // Top gold & saffron lines on footer
  page.drawLine({
    start: { x: cardX, y: footerY + footerHeight },
    end: { x: cardX + cardWidth, y: footerY + footerHeight },
    thickness: 1.5,
    color: gold,
  });
  page.drawLine({
    start: { x: cardX, y: footerY + footerHeight + 2.5 },
    end: { x: cardX + cardWidth, y: footerY + footerHeight + 2.5 },
    thickness: 1,
    color: saffron,
  });

  // Centered Footer Heading: "✦   मेड़तियाचा राजा   ✦"
  drawCentered(
    page,
    `✦   ${CONFIG.footerRajaMarathi}   ✦`,
    footerY + 48,
    17,
    serifBold,
    goldLight,
    pageCenterX
  );

  // Centered Mandal Subtitle
  drawCentered(
    page,
    CONFIG.footerSubtext,
    footerY + 28,
    8.5,
    regular,
    rgb(0.85, 0.85, 0.88),
    pageCenterX
  );

  // Official Note
  drawCentered(
    page,
    CONFIG.computerGeneratedNote,
    footerY + 12,
    7,
    regular,
    rgb(0.60, 0.60, 0.65),
    pageCenterX
  );

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}


