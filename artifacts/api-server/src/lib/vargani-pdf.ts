import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger";
import { VARGANI_RECEIPT_CONFIG as CONFIG } from "./vargani-receipt-config";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

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

  if (
    !text ||
    text === "null" ||
    text === "undefined" ||
    text === "[object Object]"
  ) {
    return fallback;
  }

  return text;
};

function resolveAsset(
  assetName: string,
  type: "font" | "image"
): string {
  const candidates =
    type === "font"
      ? [
          path.resolve(currentDir, "fonts", assetName),
          path.resolve(currentDir, assetName),
          path.resolve(
            process.cwd(),
            "artifacts/api-server/dist/fonts",
            assetName
          ),
          path.resolve(
            process.cwd(),
            "artifacts/api-server/fonts",
            assetName
          ),
          path.resolve(process.cwd(), "fonts", assetName),
        ]
      : [
          path.resolve(currentDir, assetName),
          path.resolve(
            process.cwd(),
            "artifacts/api-server/dist",
            assetName
          ),
          path.resolve(
            process.cwd(),
            "artifacts/meditiya-sathi/public",
            assetName
          ),
          path.resolve(process.cwd(), "public", assetName),
        ];

  const found = candidates.find((p) => existsSync(p));

  if (!found) {
    logger.error(
      {
        assetName,
        type,
        candidates,
      },
      "Vargani PDF asset not found"
    );

    throw new Error(`Missing PDF asset: ${assetName}`);
  }

  return found;
}

function formatDate(value: string | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const getMarathiNumberWords = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const num = Math.floor(n);
  const units: Record<number, string> = {
    0: "", 1: "एक", 2: "दोन", 3: "तीन", 4: "चार", 5: "पाच", 6: "सहा", 7: "सात", 8: "आठ", 9: "नऊ",
    10: "दहा", 11: "अकरा", 12: "बारा", 13: "तेरा", 14: "चौदा", 15: "पंधरा", 16: "सोळा", 17: "सतरा", 18: "अठरा", 19: "एकोणीस",
    20: "वीस", 21: "एकवीस", 22: "बावीस", 23: "तेवीस", 24: "चोवीस", 25: "पंचवीस", 26: "सव्वीस", 27: "सत्तावीस", 28: "अठ्ठावीस", 29: "एकोणतीस",
    30: "तीस", 31: "एकतीस", 32: "बत्तीस", 33: "तेहेतीस", 34: "चौतीस", 35: "पस्तीस", 36: "छत्तीस", 37: "सदतीस", 38: "अडतीस", 39: "एकोणचाळीस",
    40: "चाळीस", 41: "एक्केचाळीस", 42: "बेचाळीस", 43: "त्रेचाळीस", 44: "चव्वेचाळीस", 45: "पंचेचाळीस", 46: "शेहेचाळीस", 47: "सत्तेचाळीस", 48: "अठ्ठेचाळीस", 49: "एकोणपन्नास",
    50: "पन्नास", 51: "एकावन्न", 52: "बावन्न", 53: "त्रेपन्न", 54: "चौपन्न", 55: "पंचावन्न", 56: "छपन्न", 57: "सत्तावन्न", 58: "अठ्ठावन्न", 59: "एकोणसाठ",
    60: "साठ", 61: "एकसष्ठ", 62: "बासष्ठ", 63: "त्रेसष्ठ", 64: "चौसष्ठ", 65: "पासष्ठ", 66: "सहासष्ठ", 67: "सदुसष्ठ", 68: "अडुसष्ठ", 69: "एकोणसत्तर",
    70: "सत्तर", 71: "एकाहत्तर", 72: "बाहत्तर", 73: "त्र्याहत्तर", 74: "चौऱ्याहत्तर", 75: "पंच्याहत्तर", 76: "शहात्तर", 77: "सत्त्याहत्तर", 78: "अठ्ठ्याहत्तर", 79: "एकोणऐंशी",
    80: "ऐंशी", 81: "एक्याऐंशी", 82: "ब्याऐंशी", 83: "त्र्याऐंशी", 84: "चौऱ्याऐंशी", 85: "पंच्याऐंशी", 86: "शहाऐंशी", 87: "सत्त्याऐंशी", 88: "अठ्ठ्याऐंशी", 89: "एकोणनव्वद",
    90: "नव्वद", 91: "एक्याण्णव", 92: "ब्याण्णव", 93: "त्र्याण्णव", 94: "चौऱ्याण्णव", 95: "पंच्याण्णव", 96: "शहाण्णव", 97: "सत्त्याण्णव", 98: "अठ्ठ्याण्णव", 99: "नव्याण्णव"
  };

  const parts: string[] = [];
  let rem = num;
  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundred = Math.floor(rem / 100);
  rem %= 100;

  if (crore > 0) parts.push(`${units[crore] || crore} कोटी`);
  if (lakh > 0) parts.push(`${units[lakh] || lakh} लाख`);
  if (thousand > 0) parts.push(`${units[thousand] || thousand} हजार`);
  if (hundred > 0) parts.push(`${units[hundred] || hundred} शे`);
  if (rem > 0) parts.push(units[rem] || String(rem));

  const words = parts.join(" ").trim();
  return words ? `रुपये ${words} फक्त` : "रुपये शून्य फक्त";
};

export function amountInWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  const rupees = Math.floor(value);
  if (rupees === 0) return "Rupees Zero Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function below100(n: number): string {
    if (n < 20) return ones[n];

    return (
      tens[Math.floor(n / 10)] +
      (n % 10 ? ` ${ones[n % 10]}` : "")
    );
  }

  function below1000(n: number): string {
    if (n < 100) return below100(n);

    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? ` ${below100(n % 100)}` : "")
    );
  }

  let remaining = rupees;
  const parts: string[] = [];

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundred = remaining;

  if (crore) {
    parts.push(`${below1000(crore)} Crore`);
  }

  if (lakh) {
    parts.push(`${below1000(lakh)} Lakh`);
  }

  if (thousand) {
    parts.push(`${below1000(thousand)} Thousand`);
  }

  if (hundred) {
    parts.push(below1000(hundred));
  }

  return `Rupees ${parts.join(" ")} Only`;
}

/* ------------------------------------------------------- */
/* Decorative & Layout Helpers                             */
/* ------------------------------------------------------- */

function roundedBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 6,
  fill = "#FFFFFF",
  stroke = "#DCD3C1",
  lineWidth = 1
) {
  doc
    .roundedRect(x, y, w, h, radius)
    .fillAndStroke(fill, stroke)
    .lineWidth(lineWidth);
}

function goldLine(
  doc: PDFKit.PDFDocument,
  x1: number,
  y: number,
  x2: number,
  width = 1,
  color = "#D4A638"
) {
  doc
    .moveTo(x1, y)
    .lineTo(x2, y)
    .strokeColor(color)
    .lineWidth(width)
    .stroke();
}

function diamond(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size = 4,
  color = "#D4A638"
) {
  doc.save();
  doc
    .fillColor(color)
    .moveTo(x, y - size)
    .lineTo(x + size, y)
    .lineTo(x, y + size)
    .lineTo(x - size, y)
    .closePath()
    .fill();
  doc.restore();
}

function drawCheckmark(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size = 5,
  color = "#2E7D32"
) {
  doc.save();
  doc
    .strokeColor(color)
    .lineWidth(1.2)
    .lineCap("round")
    .lineJoin("round");
  doc
    .moveTo(x, y + size * 0.5)
    .lineTo(x + size * 0.4, y + size * 0.9)
    .lineTo(x + size, y)
    .stroke();
  doc.restore();
}

function sectionHeaderTab(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  text: string,
  fontBold: string,
  fill = "#E0660F",
  textColor = "#FFFFFF",
  width = 210,
  height = 20
) {
  doc
    .roundedRect(x, y, width, height, 4)
    .fill(fill);
  doc
    .font(fontBold)
    .fontSize(8.5)
    .fillColor(textColor)
    .text(text, x + 10, y + 5.5, {
      width: width - 20,
      lineBreak: false,
    });
}

function fitText(
  doc: PDFKit.PDFDocument,
  text: string,
  maxWidth: number
): string {
  if (!text || doc.widthOfString(text) <= maxWidth) {
    return text;
  }
  let truncated = text;
  while (truncated.length > 0 && doc.widthOfString(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated.trim()}…`;
}

/* ------------------------------------------------------- */
/* MAIN PDF                                                */
/* ------------------------------------------------------- */

export async function generateVarganiPdf(
  data: VarganiPdfData
): Promise<Buffer> {
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("Donation amount is invalid");
  }

  const fontRegular = resolveAsset("Mukta-Regular.ttf", "font");
  const fontBold = resolveAsset("Mukta-Bold.ttf", "font");
  const logoPath = resolveAsset("logo.png", "image");

  const receiptNumber = clean(
    data.receiptNumber,
    "—"
  );

  const donorName = clean(data.name);
  const mobile = clean(data.mobile);
  const building = clean(data.building);
  const wing = clean(data.wing);
  const flat = clean(data.flat);

  const festivalName = clean(
    data.festivalName,
    "गणेश उत्सव"
  );

  const festivalYear =
    data.festivalYear || 2026;

  const donationDate = formatDate(
    data.donationDate
  );

  const amount = Number(data.amount);

  const paymentMethod = clean(
    data.paymentMethod,
    "CASH"
  )
    .replace(/_/g, " ")
    .toUpperCase();

  const collectedBy = clean(
    data.collectedBy,
    "Admin"
  );

  logger.info(
    {
      donationId: data.receiptNumber,
      receiptNumber,
    },
    "Starting Vargani PDF generation"
  );

  return new Promise<Buffer>((resolve, reject) => {
    try {
      /*
       * A4 Fixed Coordinate System
       */
      const PAGE_WIDTH = 595.28;
      const PAGE_HEIGHT = 841.89;

      const OUTER_MARGIN = 20;
      const CONTENT_PADDING = 22;

      const CARD_X = OUTER_MARGIN;
      const CARD_Y = OUTER_MARGIN;
      const CARD_WIDTH = PAGE_WIDTH - OUTER_MARGIN * 2; // 555.28
      const CARD_HEIGHT = PAGE_HEIGHT - OUTER_MARGIN * 2; // 801.89

      const CONTENT_X = CARD_X + CONTENT_PADDING; // 42
      const CONTENT_WIDTH = CARD_WIDTH - CONTENT_PADDING * 2; // 511.28

      const SECTION_GAP = 18;

      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        autoFirstPage: true,
        info: {
          Title: `Donation Receipt - ${receiptNumber}`,
          Author: "मेड़तिया मित्र मंडळ",
          Subject: "Donation Receipt",
        },
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      /* ------------------------------------------------ */
      /* COLORS                                           */
      /* ------------------------------------------------ */

      const BLACK = "#11141A";
      const GOLD = "#D4A638";
      const SAFFRON = "#E0660F";
      const CREAM = "#FAF8F5";
      const CARD_BG = "#FFFFFF";
      const INNER_BORDER = "#E0D4BD";
      const BORDER = "#DCD3C1";
      const TEXT = "#11141A";
      const MUTED = "#6B7280";
      const AMBER_DARK = "#B45309";
      const GREEN_BG = "#EDF7ED";
      const GREEN_TEXT = "#1E4620";
      const GREEN_BORDER = "#2E7D32";

      /* ------------------------------------------------ */
      /* BACKGROUND & DOUBLE BORDER CARD                  */
      /* ------------------------------------------------ */

      // 1. Page background (Cream)
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(CREAM);

      // 2. Outer card frame with double border
      doc
        .rect(CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT)
        .fillAndStroke(CARD_BG, GOLD)
        .lineWidth(2.5);

      doc
        .rect(
          CARD_X + 3.5,
          CARD_Y + 3.5,
          CARD_WIDTH - 7,
          CARD_HEIGHT - 7
        )
        .stroke(INNER_BORDER)
        .lineWidth(0.75);

      /* ------------------------------------------------ */
      /* 1. HEADER (Dark Banner)                          */
      /* ------------------------------------------------ */

      const headerH = 126;
      const headerY = CARD_Y;

      doc.rect(CARD_X, headerY, CARD_WIDTH, headerH).fill(BLACK);
      doc.rect(CARD_X, headerY, CARD_WIDTH, 3.5).fill(SAFFRON);
      doc.rect(CARD_X, headerY + headerH - 2.5, CARD_WIDTH, 2.5).fill(GOLD);
      doc.rect(CARD_X, headerY + headerH, CARD_WIDTH, 1.5).fill(SAFFRON);

      // Logo on Left - vertically centered
      const logoSize = 80;
      const logoX = CARD_X + 16;
      const logoY = headerY + (headerH - logoSize) / 2;

      if (existsSync(logoPath)) {
        doc.image(logoPath, logoX, logoY, {
          fit: [logoSize, logoSize],
          align: "center",
          valign: "center",
        });
      }

      // Text block centered in remaining header area
      const headerTextX = logoX + logoSize + 12;
      const headerTextW = CARD_X + CARD_WIDTH - 16 - headerTextX;
      const headerTextCenterX = headerTextX + headerTextW / 2;

      // 1. Marathi Mandal Name
      doc
        .font(fontBold)
        .fontSize(21)
        .fillColor("#FFF9EA")
        .text(CONFIG.mandalNameMarathi, headerTextX, headerY + 12, {
          width: headerTextW,
          align: "center",
        });

      // Symmetrical decorative line & diamonds
      const headerDecY = headerY + 38;
      goldLine(doc, headerTextCenterX - 110, headerDecY, headerTextCenterX - 15, 1, GOLD);
      diamond(doc, headerTextCenterX - 8, headerDecY, 2.5, GOLD);
      diamond(doc, headerTextCenterX, headerDecY, 3.5, SAFFRON);
      diamond(doc, headerTextCenterX + 8, headerDecY, 2.5, GOLD);
      goldLine(doc, headerTextCenterX + 15, headerDecY, headerTextCenterX + 110, 1, GOLD);

      // 2. English Mandal Name
      doc
        .font(fontBold)
        .fontSize(9.5)
        .fillColor("#F5D173")
        .text(CONFIG.mandalNameEnglish.toUpperCase(), headerTextX, headerY + 45, {
          width: headerTextW,
          align: "center",
          characterSpacing: 1.5,
        });

      // 3. Exact Address (natural wrapping, fixed width, no overlap)
      const headerAddress =
        "Omkareshwar Mandir, Medtiya Nagar, Opp. Seven Square School,\nDeepak Hospital Lane, Mira Road, Mumbai, Maharashtra 401107";

      doc
        .font(fontRegular)
        .fontSize(8)
        .fillColor("#E5E7EB")
        .text(headerAddress, headerTextX, headerY + 62, {
          width: headerTextW,
          align: "center",
          lineGap: 2,
        });

      // 4. Establishment / Subtitle
      doc
        .font(fontBold)
        .fontSize(8.5)
        .fillColor("#EA9A4E")
        .text(CONFIG.subtagMarathi, headerTextX, headerY + 98, {
          width: headerTextW,
          align: "center",
        });

      /* ------------------------------------------------ */
      /* 2. "पावती" TITLE SECTION                          */
      /* ------------------------------------------------ */

      const titleY = headerY + headerH + SECTION_GAP;
      const titleH = 46;

      // Marathi Title
      doc
        .font(fontBold)
        .fontSize(23)
        .fillColor(TEXT)
        .text(CONFIG.receiptTitleMarathi, CARD_X, titleY, {
          width: CARD_WIDTH,
          align: "center",
        });

      // Symmetrical decorative lines & diamonds calculated from centerX
      const titleCenterX = CARD_X + CARD_WIDTH / 2;
      const titleTextWidth = doc.widthOfString(CONFIG.receiptTitleMarathi);
      const titleLineW = 75;
      const titleLineGap = 16;
      const titleLineY = titleY + 14;

      const leftLineEnd = titleCenterX - titleTextWidth / 2 - titleLineGap;
      const leftLineStart = leftLineEnd - titleLineW;
      goldLine(doc, leftLineStart, titleLineY, leftLineEnd, 1, GOLD);
      diamond(doc, leftLineEnd + 7, titleLineY, 3.5, SAFFRON);

      const rightLineStart = titleCenterX + titleTextWidth / 2 + titleLineGap;
      const rightLineEnd = rightLineStart + titleLineW;
      diamond(doc, rightLineStart - 7, titleLineY, 3.5, SAFFRON);
      goldLine(doc, rightLineStart, titleLineY, rightLineEnd, 1, GOLD);

      // English Title
      doc
        .font(fontBold)
        .fontSize(10.5)
        .fillColor(SAFFRON)
        .text(CONFIG.receiptTitleEnglish, CARD_X, titleY + 29, {
          width: CARD_WIDTH,
          align: "center",
          characterSpacing: 2,
        });

      /* ------------------------------------------------ */
      /* 3. RECEIPT METADATA (3 Equal Columns)            */
      /* ------------------------------------------------ */

      const metaY = titleY + titleH + SECTION_GAP;
      const metaH = 52;

      roundedBox(
        doc,
        CONTENT_X,
        metaY,
        CONTENT_WIDTH,
        metaH,
        6,
        "#FDFBF7",
        "#DFD7C7",
        1
      );

      const metaColWidth = CONTENT_WIDTH / 3;

      // Col 1: Receipt Number
      const col0X = CONTENT_X;
      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("पावती क्रमांक / RECEIPT NO.", col0X + 12, metaY + 10, {
          width: metaColWidth - 24,
          lineBreak: false,
        });

      doc.font(fontBold).fontSize(10.5).fillColor(TEXT);
      const fittedReceiptNo = fitText(doc, receiptNumber, metaColWidth - 24);
      doc.text(fittedReceiptNo, col0X + 12, metaY + 26, { lineBreak: false });

      // Divider 1
      doc
        .moveTo(CONTENT_X + metaColWidth, metaY + 7)
        .lineTo(CONTENT_X + metaColWidth, metaY + metaH - 7)
        .strokeColor("#EAE3D5")
        .lineWidth(1)
        .stroke();

      // Col 2: Date
      const col1X = CONTENT_X + metaColWidth;
      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("दिनांक / DATE", col1X + 12, metaY + 10, {
          width: metaColWidth - 24,
          lineBreak: false,
        });

      doc.font(fontBold).fontSize(10.5).fillColor(TEXT);
      const fittedDate = fitText(doc, donationDate, metaColWidth - 24);
      doc.text(fittedDate, col1X + 12, metaY + 26, { lineBreak: false });

      // Divider 2
      doc
        .moveTo(CONTENT_X + metaColWidth * 2, metaY + 7)
        .lineTo(CONTENT_X + metaColWidth * 2, metaY + metaH - 7)
        .strokeColor("#EAE3D5")
        .lineWidth(1)
        .stroke();

      // Col 3: Festival
      const col2X = CONTENT_X + metaColWidth * 2;
      const festivalText = `${festivalName} ${festivalYear}`;
      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("उत्सव / FESTIVAL", col2X + 12, metaY + 10, {
          width: metaColWidth - 24,
          lineBreak: false,
        });

      doc.font(fontBold).fontSize(10).fillColor("#D97706");
      const fittedFestival = fitText(doc, festivalText, metaColWidth - 24);
      doc.text(fittedFestival, col2X + 12, metaY + 26, { lineBreak: false });

      /* ------------------------------------------------ */
      /* 4. DONOR INFORMATION                             */
      /* ------------------------------------------------ */

      const donorY = metaY + metaH + SECTION_GAP;
      const donorH = 130;

      roundedBox(
        doc,
        CONTENT_X,
        donorY,
        CONTENT_WIDTH,
        donorH,
        6,
        "#FFFFFF",
        BORDER,
        1
      );

      sectionHeaderTab(
        doc,
        CONTENT_X,
        donorY,
        "दात्याची माहिती / DONOR INFORMATION",
        fontBold,
        SAFFRON,
        "#FFFFFF",
        210,
        20
      );

      const donorColW = (CONTENT_WIDTH - 32) / 2;
      const donorLeftX = CONTENT_X + 14;
      const donorRightX = CONTENT_X + CONTENT_WIDTH / 2 + 8;

      // Row 1: Name & Mobile (perfect baseline alignment)
      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("दात्याचे नाव / Donor Name", donorLeftX, donorY + 31, {
          width: donorColW,
          lineBreak: false,
        });

      doc.font(fontBold).fontSize(11).fillColor(TEXT);
      const fittedDonorName = fitText(doc, donorName, donorColW);
      doc.text(fittedDonorName, donorLeftX, donorY + 45, { lineBreak: false });

      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("मोबाईल क्रमांक / Mobile No.", donorRightX, donorY + 31, {
          width: donorColW,
          lineBreak: false,
        });

      doc.font(fontBold).fontSize(11).fillColor(TEXT);
      const fittedMobile = fitText(doc, mobile, donorColW);
      doc.text(fittedMobile, donorRightX, donorY + 45, { lineBreak: false });

      // Divider line
      const donorDivY = donorY + 72;
      doc
        .moveTo(CONTENT_X + 14, donorDivY)
        .lineTo(CONTENT_X + CONTENT_WIDTH - 14, donorDivY)
        .strokeColor("#F3EDE2")
        .lineWidth(0.75)
        .stroke();

      // Row 2: Building & Flat (perfect baseline alignment)
      const buildingWing = [
        building !== "—" ? building : "",
        wing !== "—" ? wing : "",
      ]
        .filter(Boolean)
        .join(" - ") || building;

      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("इमारत व विंग / Building & Wing", donorLeftX, donorY + 80, {
          width: donorColW,
          lineBreak: false,
        });

      doc.font(fontBold).fontSize(10.5).fillColor(TEXT);
      const fittedBuilding = fitText(doc, buildingWing, donorColW);
      doc.text(fittedBuilding, donorLeftX, donorY + 94, { lineBreak: false });

      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("फ्लॅट क्रमांक / Flat No.", donorRightX, donorY + 80, {
          width: donorColW,
          lineBreak: false,
        });

      doc.font(fontBold).fontSize(10.5).fillColor(TEXT);
      const fittedFlat = fitText(doc, flat, donorColW);
      doc.text(fittedFlat, donorRightX, donorY + 94, { lineBreak: false });

      /* ------------------------------------------------ */
      /* 5. DONATION DETAILS                              */
      /* ------------------------------------------------ */

      const donationY = donorY + donorH + SECTION_GAP;
      const donationH = 168;

      roundedBox(
        doc,
        CONTENT_X,
        donationY,
        CONTENT_WIDTH,
        donationH,
        6,
        "#FDFCF9",
        GOLD,
        1.5
      );

      sectionHeaderTab(
        doc,
        CONTENT_X,
        donationY,
        "देणगी तपशील / DONATION DETAILS",
        fontBold,
        "#1F242E",
        "#F5D173",
        210,
        20
      );

      // Amount Header & Value (Centered relative to the entire donation details box)
      doc
        .font(fontBold)
        .fontSize(9.5)
        .fillColor(SAFFRON)
        .text("देणगी रक्कम / Donation Amount", CONTENT_X, donationY + 28, {
          width: CONTENT_WIDTH,
          align: "center",
        });

      const formattedAmount = `₹ ${Number(amount).toLocaleString("en-IN")}/-`;
      doc
        .font(fontBold)
        .fontSize(29)
        .fillColor(TEXT)
        .text(formattedAmount, CONTENT_X, donationY + 44, {
          width: CONTENT_WIDTH,
          align: "center",
        });

      // Amount in Words Box (Equal left/right margins, vertically centered text)
      const wordsBoxMargin = 14;
      const wordsBoxX = CONTENT_X + wordsBoxMargin;
      const wordsBoxW = CONTENT_WIDTH - wordsBoxMargin * 2;
      const wordsBoxH = 24;
      const wordsBoxY = donationY + 88;

      roundedBox(
        doc,
        wordsBoxX,
        wordsBoxY,
        wordsBoxW,
        wordsBoxH,
        4,
        "#F3EDE2",
        "#E5DCCE",
        0.75
      );

      const wordsMar = getMarathiNumberWords(amount);
      const wordsEng = amountInWords(amount);
      const wordsCombined = `रक्कमेचे शब्दांत / Amount in Words : ${wordsMar} (${wordsEng})`;

      doc.font(fontRegular).fontSize(8.5).fillColor(TEXT);
      const fittedWords = fitText(doc, wordsCombined, wordsBoxW - 12);
      doc.text(fittedWords, wordsBoxX + 6, wordsBoxY + 6.5, {
        width: wordsBoxW - 12,
        align: "center",
        lineBreak: false,
      });

      // Divider line
      const payDivY = donationY + 124;
      doc
        .moveTo(CONTENT_X + 14, payDivY)
        .lineTo(CONTENT_X + CONTENT_WIDTH - 14, payDivY)
        .strokeColor("#EAE2D3")
        .lineWidth(0.75)
        .stroke();

      // Payment Row (Proper two-column grid layout)
      const payLeftX = CONTENT_X + 16;
      const payRightX = CONTENT_X + CONTENT_WIDTH / 2 + 16;
      const payColW = CONTENT_WIDTH / 2 - 32;

      // Left column: Payment Method
      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("पेमेंट पद्धत / Method:", payLeftX, donationY + 137, { lineBreak: false });

      const pillX = payLeftX + 90;
      const pillW = Math.min(payColW - 90, 80);
      const pillH = 18;
      roundedBox(
        doc,
        pillX,
        donationY + 132,
        pillW,
        pillH,
        4,
        GREEN_BG,
        GREEN_BORDER,
        0.75
      );

      doc.font(fontBold).fontSize(8).fillColor(GREEN_TEXT);
      const fittedMethod = fitText(doc, paymentMethod, pillW - 8);
      doc.text(fittedMethod, pillX, donationY + 136.5, {
        width: pillW,
        align: "center",
        lineBreak: false,
      });

      // Right column: Payment Date
      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("पेमेंट दिनांक / Date:", payRightX, donationY + 137, { lineBreak: false });

      doc.font(fontBold).fontSize(9.5).fillColor(TEXT);
      const fittedPayDate = fitText(doc, donationDate, payColW - 90);
      doc.text(fittedPayDate, payRightX + 90, donationY + 136, { lineBreak: false });

      /* ------------------------------------------------ */
      /* 6. THANK YOU SECTION                             */
      /* ------------------------------------------------ */

      const thankY = donationY + donationH + SECTION_GAP;
      const thankH = 84;

      roundedBox(
        doc,
        CONTENT_X,
        thankY,
        CONTENT_WIDTH,
        thankH,
        6,
        "#FFFFFF",
        "#DFD7C7",
        1
      );

      const recW = 160;
      const thankW = CONTENT_WIDTH - recW;

      // Left Section: Thank-you message
      const thankLeftX = CONTENT_X + 14;
      const thankContentW = thankW - 24;

      doc
        .font(fontBold)
        .fontSize(9.5)
        .fillColor(SAFFRON)
        .text(CONFIG.thankYouMarathi, thankLeftX, thankY + 13, {
          width: thankContentW,
          ellipsis: true,
        });

      doc
        .font(fontRegular)
        .fontSize(8)
        .fillColor("#64748B")
        .text(CONFIG.thankYouEnglish, thankLeftX, thankY + 31, {
          width: thankContentW,
          ellipsis: true,
        });

      doc
        .font(fontBold)
        .fontSize(9)
        .fillColor(AMBER_DARK)
        .text(CONFIG.blessingMarathi, thankLeftX, thankY + 51, {
          width: thankContentW,
          ellipsis: true,
        });

      // Vertical Divider
      const thankDivX = CONTENT_X + thankW;
      doc
        .moveTo(thankDivX, thankY + 8)
        .lineTo(thankDivX, thankY + thankH - 8)
        .strokeColor("#EAE2D3")
        .lineWidth(0.8)
        .stroke();

      // Right Section: Received By & Verified Badge
      const recX = thankDivX;
      const recContentW = recW;

      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text("प्राप्तकर्ता / RECEIVED BY", recX, thankY + 12, {
          width: recContentW,
          align: "center",
        });

      doc.font(fontBold).fontSize(9.5).fillColor(TEXT);
      const fittedCollector = fitText(doc, collectedBy, recContentW - 16);
      doc.text(fittedCollector, recX + 8, thankY + 28, {
        width: recContentW - 16,
        align: "center",
        lineBreak: false,
      });

      const stampW = 112;
      const stampH = 18;
      const stampX = recX + (recContentW - stampW) / 2;
      const stampY = thankY + 50;

      roundedBox(
        doc,
        stampX,
        stampY,
        stampW,
        stampH,
        3,
        GREEN_BG,
        GREEN_BORDER,
        0.75
      );
      drawCheckmark(doc, stampX + 8, stampY + 5, 5, GREEN_BORDER);
      doc
        .font(fontBold)
        .fontSize(7.5)
        .fillColor(GREEN_TEXT)
        .text("VERIFIED RECEIPT", stampX + 16, stampY + 5.5, {
          width: stampW - 22,
          align: "center",
        });

      /* ------------------------------------------------ */
      /* 7. FOOTER (Fixed to Bottom of Card)              */
      /* ------------------------------------------------ */

      const footerY = thankY + thankH + SECTION_GAP;
      const footerH = CARD_Y + CARD_HEIGHT - footerY;

      doc.rect(CARD_X, footerY, CARD_WIDTH, footerH).fill(BLACK);
      doc.rect(CARD_X, footerY, CARD_WIDTH, 2).fill(GOLD);
      doc.rect(CARD_X, footerY - 2, CARD_WIDTH, 1.5).fill(SAFFRON);

      // "मेड़तियाचा राजा" with flanking symmetric diamonds
      const rajaText = CONFIG.footerRajaMarathi;
      doc
        .font(fontBold)
        .fontSize(17)
        .fillColor("#F5D173")
        .text(rajaText, CARD_X, footerY + 15, {
          width: CARD_WIDTH,
          align: "center",
          characterSpacing: 1,
        });

      const rajaTextW = doc.widthOfString(rajaText);
      const rajaCenterX = CARD_X + CARD_WIDTH / 2;
      diamond(doc, rajaCenterX - rajaTextW / 2 - 14, footerY + 23, 3.5, "#F5D173");
      diamond(doc, rajaCenterX + rajaTextW / 2 + 14, footerY + 23, 3.5, "#F5D173");

      // Subtitle
      doc
        .font(fontRegular)
        .fontSize(8.5)
        .fillColor("#D1D5DB")
        .text(CONFIG.footerSubtext, CARD_X, footerY + 39, {
          width: CARD_WIDTH,
          align: "center",
        });

      // Official note
      doc
        .font(fontRegular)
        .fontSize(7)
        .fillColor("#9CA3AF")
        .text(CONFIG.computerGeneratedNote, CARD_X, footerY + 56, {
          width: CARD_WIDTH,
          align: "center",
        });

      /*
       * END
       */

      doc.end();

    } catch (error) {
      logger.error(
        {
          err: error,
          receiptNumber: data.receiptNumber,
        },
        "Vargani PDF rendering failed"
      );

      reject(error);
    }
  });
}