import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { VARGANI_RECEIPT_CONFIG as CONFIG } from "./vargani-receipt-config.js";

export interface VarganiPdfData {
  receiptNumber: string; donationDate: string | Date; name: string; mobile?: string | null;
  building?: string | null; wing?: string | null; flat?: string | null; amount: number;
  paymentMethod: string; festivalName?: string | null; festivalYear?: number | null;
  collectedBy: string;
}

const clean = (value: unknown, fallback = "—") => {
  const text = String(value ?? "").trim();
  return text && text !== "null" && text !== "undefined" ? text : fallback;
};

function underHundred(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 20) return ones[n] || "";
  return `${tens[Math.floor(n / 10)] || ""}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
}

function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  return [hundreds ? `${underHundred(hundreds)} Hundred` : "", remainder ? underHundred(remainder) : ""].filter(Boolean).join(" ");
}

export function amountInWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid donation amount");
  const rupees = Math.floor(value + 1e-9); const paise = Math.round((value - rupees) * 100);
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000); const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000); const rest = rupees % 1000;
  if (crore) parts.push(`${underThousand(crore)} Crore`); if (lakh) parts.push(`${underThousand(lakh)} Lakh`); if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  const result = parts.join(" ") || "Zero";
  return `Rupees ${result}${paise ? ` and ${underHundred(paise)} Paise` : ""} Only`;
}

function drawCentered(page: any, text: string, y: number, size: number, font: any, color: any) {
  const x = (page.getWidth() - font.widthOfTextAtSize(text, size)) / 2; page.drawText(text, { x, y, size, font, color });
}

function projectAssetPath(fileName: string): string {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/meditiya-sathi/public", fileName),
    path.resolve(process.cwd(), "../meditiya-sathi/public", fileName),
    path.resolve(process.cwd(), "../../artifacts/meditiya-sathi/public", fileName),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

export async function generateVarganiPdf(data: VarganiPdfData): Promise<Buffer> {
  if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error("Donation amount is invalid");
  const doc = await PDFDocument.create();
  // Standard Helvetica is WinAnsi-only and throws when drawing the INR symbol (₹).
  // Embed the same Noto Sans asset used by the application so PDF generation is Unicode-safe.
  doc.registerFontkit(fontkit);
  const fontPath = projectAssetPath("noto-sans-regular.woff");
  const boldFontPath = projectAssetPath("noto-sans-bold.woff");
  let regular: any; let bold: any;
  try {
    regular = await doc.embedFont(await readFile(fontPath), { subset: false });
    bold = await doc.embedFont(await readFile(boldFontPath), { subset: false });
  } catch (fontError) {
    throw new Error(`Vargani receipt font could not be loaded: ${fontError instanceof Error ? fontError.message : String(fontError)}`);
  }
  const page = doc.addPage([595.28, 841.89]);
  const navy = rgb(.10, .12, .18), saffron = rgb(.88, .38, .04), ink = rgb(.18, .2, .24), muted = rgb(.4, .43, .47), border = rgb(.86, .82, .72), cream = rgb(1, .98, .93), white = rgb(1, 1, 1);
  const margin = 34, width = page.getWidth() - margin * 2;
  page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: rgb(.98, .97, .94) });
  page.drawRectangle({ x: 0, y: page.getHeight() - 14, width: page.getWidth(), height: 14, color: saffron });
  page.drawRectangle({ x: margin, y: margin, width, height: page.getHeight() - margin * 2, color: white, borderColor: border, borderWidth: 2 });
  try {
    const assetName = CONFIG.ganpatiImage.replace(/^\/+/, "");
    const asset = await readFile(projectAssetPath(assetName));
    const image = await doc.embedPng(asset);
    const scale = Math.min(56 / image.width, 56 / image.height);
    page.drawImage(image, { x: (page.getWidth() - image.width * scale) / 2, y: page.getHeight() - margin - 84, width: image.width * scale, height: image.height * scale });
  } catch (assetError) { console.warn("Vargani receipt branding image unavailable; continuing without it:", assetError instanceof Error ? assetError.message : assetError); }
  const top = page.getHeight() - margin - 24;
  // Public assets are intentionally configurable; missing assets never prevent receipt generation.
  drawCentered(page, CONFIG.mandalName, top - 24, 20, bold, navy);
  drawCentered(page, CONFIG.location, top - 44, 11, regular, muted);
  drawCentered(page, `${data.festivalName || CONFIG.festivalName} ${data.festivalYear || CONFIG.festivalYear}`, top - 61, 11, regular, saffron);
  drawCentered(page, CONFIG.receiptTitle, top - 95, 17, bold, saffron);
  page.drawLine({ start: { x: margin + 20, y: top - 112 }, end: { x: margin + width - 20, y: top - 112 }, thickness: 1.5, color: border });
  const y0 = top - 140;
  page.drawRectangle({ x: margin + 20, y: y0 - 12, width: width - 40, height: 34, color: cream, borderColor: border, borderWidth: 1 });
  page.drawText(`Slip No: ${clean(data.receiptNumber)}`, { x: margin + 32, y: y0, size: 11, font: bold, color: navy });
  const date = new Date(data.donationDate); const dateText = Number.isNaN(date.getTime()) ? clean(data.donationDate) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  page.drawText(`Date: ${dateText}`, { x: margin + width - 180, y: y0, size: 11, font: bold, color: navy });
  let y = y0 - 55; page.drawText("DONOR DETAILS", { x: margin + 30, y, size: 12, font: bold, color: saffron }); y -= 24;
  const field = (label: string, value: unknown) => { page.drawText(label, { x: margin + 30, y, size: 10, font: bold, color: muted }); page.drawText(clean(value), { x: margin + 142, y, size: 11, font: regular, color: ink }); y -= 23; };
  field("Name:", data.name); field("Building:", data.building); field("Wing:", data.wing); field("Flat Number:", data.flat); field("Mobile:", data.mobile);
  y -= 5; page.drawLine({ start: { x: margin + 20, y }, end: { x: margin + width - 20, y }, thickness: 1, color: border }); y -= 30;
  page.drawText("PAYMENT DETAILS", { x: margin + 30, y, size: 12, font: bold, color: saffron }); y -= 32;
  drawCentered(page, "VARGANI AMOUNT", y, 10, bold, muted); y -= 34;
  drawCentered(page, `₹${data.amount.toLocaleString("en-IN", { minimumFractionDigits: data.amount % 1 ? 2 : 0 })}`, y, 29, bold, navy); y -= 25;
  drawCentered(page, amountInWords(data.amount), y, 11, regular, ink); y -= 28;
  drawCentered(page, `Payment Method: ${clean(data.paymentMethod).replace("_", " ").toUpperCase()}`, y, 11, bold, ink);
  y -= 45; page.drawLine({ start: { x: margin + 20, y }, end: { x: margin + width - 20, y }, thickness: 1, color: border }); y -= 38;
  page.drawText(`Collected By: ${clean(data.collectedBy)}`, { x: margin + 30, y, size: 11, font: bold, color: navy });
  page.drawLine({ start: { x: margin + width - 205, y: y - 20 }, end: { x: margin + width - 35, y: y - 20 }, thickness: 1, color: ink });
  page.drawText(CONFIG.signatureLabel, { x: margin + width - 205, y: y - 35, size: 9, font: regular, color: muted });
  const footerLines = CONFIG.footer.split("\\n"); footerLines.forEach((line, i) => drawCentered(page, line, margin + 38 - i * 14, i ? 10 : 9, i ? bold : regular, i ? saffron : muted));
  return Buffer.from(await doc.save());
}
