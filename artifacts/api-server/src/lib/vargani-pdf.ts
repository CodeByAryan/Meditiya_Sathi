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

function amountInWords(value: number): string {
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

  const rupees = Math.floor(value);

  if (rupees === 0) {
    return "Rupees Zero Only";
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
/* Decorative helpers                                     */
/* ------------------------------------------------------- */

function roundedBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 8,
  fill = "#FFFFFF",
  stroke = "#D69B27",
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
  width = 1
) {
  doc
    .moveTo(x1, y)
    .lineTo(x2, y)
    .strokeColor("#D99A24")
    .lineWidth(width)
    .stroke();
}

function diamond(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size = 4
) {
  doc.save();

  doc
    .fillColor("#D99A24")
    .moveTo(x, y - size)
    .lineTo(x + size, y)
    .lineTo(x, y + size)
    .lineTo(x - size, y)
    .closePath()
    .fill();

  doc.restore();
}

function sectionHeader(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  text: string,
  fontBold: string
) {
  const tabWidth = Math.min(width * 0.55, 230);
  const tabHeight = 25;
  const tabX = x + (width - tabWidth) / 2;

  doc
    .roundedRect(tabX, y, tabWidth, tabHeight, 8)
    .fill("#D78D09");

  doc
    .font(fontBold)
    .fontSize(10)
    .fillColor("#FFFFFF")
    .text(text, tabX, y + 6, {
      width: tabWidth,
      align: "center",
    });
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
       * A4
       */
      const pageWidth = 595.28;
      const pageHeight = 841.89;
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

      const BLACK = "#0B0B0B";
      const GOLD = "#D89A22";
      const SAFFRON = "#F07A00";
      const CREAM = "#FBF9F5";
      const BORDER = "#D9A13A";
      const TEXT = "#241C14";
      const MUTED = "#6B6259";

      /* ------------------------------------------------ */
      /* BACKGROUND                                       */
      /* ------------------------------------------------ */

      doc.rect(
        0,
        0,
        pageWidth,
        pageHeight
      ).fill(CREAM);

      /*
       * Outer border
       */
      doc
        .roundedRect(
          12,
          12,
          pageWidth - 24,
          pageHeight - 24,
          12
        )
        .lineWidth(2)
        .strokeColor(GOLD)
        .stroke();

      doc
        .roundedRect(
          17,
          17,
          pageWidth - 34,
          pageHeight - 34,
          10
        )
        .lineWidth(0.7)
        .strokeColor("#E5D7BA")
        .stroke();

      /* ------------------------------------------------ */
      /* HEADER                                           */
      /* ------------------------------------------------ */

      const headerY = 18;
      const headerH = 132;

      doc
        .rect(
          18,
          headerY,
          pageWidth - 36,
          headerH
        )
        .fill(BLACK);

      /*
       * Header gold curved-looking separator
       */
      doc
        .moveTo(18, headerY + headerH)
        .lineTo(pageWidth - 18, headerY + headerH)
        .lineWidth(4)
        .strokeColor(GOLD)
        .stroke();

      doc
        .moveTo(18, headerY + headerH + 4)
        .lineTo(pageWidth - 18, headerY + headerH + 4)
        .lineWidth(2)
        .strokeColor(SAFFRON)
        .stroke();

      /* Logo */

      doc.image(
        logoPath,
        34,
        34,
        {
          fit: [90, 90],
          align: "center",
          valign: "center",
        }
      );

      /*
       * Mandal name
       */

      doc
        .font(fontBold)
        .fontSize(25)
        .fillColor("#FFFFFF")
        .text(
          "मेड़तिया मित्र मंडळ",
          125,
          42,
          {
            width: 430,
            align: "center",
          }
        );

      goldLine(
        doc,
          220,
        78,
        385,
        1.2
      );

      diamond(
        doc,
        300,
        78,
        3
      );

      diamond(
        doc,
        305,
        78,
        5
      );

      diamond(
        doc,
        310,
        78,
        3
      );

      doc
        .font(fontRegular)
        .fontSize(11)
        .fillColor("#FFFFFF")
        .text(
          CONFIG.locationMarathi,
          125,
          88,
          {
            width: 430,
            align: "center",
          }
        );

      /*
       * ACTUAL ADDRESS
       */

      doc
        .font(fontRegular)
        .fontSize(7.5)
        .fillColor("#E8D9BA")
        .text(
          CONFIG.addressLine1,
          125,
          107,
          {
            width: 430,
            align: "center",
          }
        );

      doc
        .font(fontRegular)
        .fontSize(7.5)
        .fillColor("#E8D9BA")
        .text(
          CONFIG.addressLine2,
          125,
          118,
          {
            width: 430,
            align: "center",
          }
        );

      /* ------------------------------------------------ */
      /* TITLE                                           */
      /* ------------------------------------------------ */

      const titleY = 166;

      doc
        .font(fontBold)
        .fontSize(33)
        .fillColor(TEXT)
        .text(
          "पावती",
          0,
          titleY,
          {
            width: pageWidth,
            align: "center",
          }
        );

      const titleWidth =
        doc.widthOfString("पावती");

      const center = pageWidth / 2;

      goldLine(
        doc,
        center - titleWidth / 2 - 70,
        titleY + 22,
        center - titleWidth / 2 - 12
      );

      goldLine(
        doc,
        center + titleWidth / 2 + 12,
        titleY + 22,
        center + titleWidth / 2 + 70
      );

      diamond(
        doc,
        center - titleWidth / 2 - 5,
        titleY + 22,
        4
      );

      diamond(
        doc,
        center + titleWidth / 2 + 5,
        titleY + 22,
        4
      );

      doc
        .font(fontRegular)
        .fontSize(12)
        .fillColor(TEXT)
        .text(
          "DONATION RECEIPT",
          0,
          titleY + 39,
          {
            width: pageWidth,
            align: "center",
            characterSpacing: 2,
          }
        );

      /* ------------------------------------------------ */
      /* META INFORMATION                                 */
      /* ------------------------------------------------ */

      const contentX = 38;
      const contentW = pageWidth - 76;

      const metaY = 226;
      const metaH = 63;

      roundedBox(
        doc,
        contentX,
        metaY,
        contentW,
        metaH,
        9,
        "#FFFFFF",
        GOLD,
        1
      );

      const metaCol = contentW / 3;

      /*
       * separators
       */

      doc
        .moveTo(
          contentX + metaCol,
          metaY + 10
        )
        .lineTo(
          contentX + metaCol,
          metaY + metaH - 10
        )
        .strokeColor("#DDCFAE")
        .lineWidth(1)
        .stroke();

      doc
        .moveTo(
          contentX + metaCol * 2,
          metaY + 10
        )
        .lineTo(
          contentX + metaCol * 2,
          metaY + metaH - 10
        )
        .strokeColor("#DDCFAE")
        .lineWidth(1)
        .stroke();

      /*
       * Receipt
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "पावती क्रमांक / Receipt No.",
          contentX + 14,
          metaY + 12,
        );

      doc
        .font(fontBold)
        .fontSize(11)
        .fillColor(TEXT)
        .text(
          receiptNumber,
          contentX + 14,
          metaY + 32,
        );

      /*
       * Date
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "दिनांक / Date",
          contentX + metaCol + 14,
          metaY + 12,
        );

      doc
        .font(fontBold)
        .fontSize(11)
        .fillColor(TEXT)
        .text(
          donationDate,
          contentX + metaCol + 14,
          metaY + 32,
        );

      /*
       * Festival
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "उत्सव / Festival",
          contentX + metaCol * 2 + 14,
          metaY + 12,
        );

      doc
        .font(fontBold)
        .fontSize(10)
        .fillColor(SAFFRON)
        .text(
          `${festivalName} ${festivalYear}`,
          contentX + metaCol * 2 + 14,
          metaY + 32,
        );

      /* ------------------------------------------------ */
      /* DONOR INFORMATION                                */
      /* ------------------------------------------------ */

      const donorY = 306;
      const donorH = 150;

      roundedBox(
        doc,
        contentX,
        donorY,
        contentW,
        donorH,
        9,
        "#FFFFFF",
        BORDER,
        1
      );

      sectionHeader(
        doc,
        contentX,
        donorY - 10,
        contentW,
        "दात्याची माहिती / DONOR INFORMATION",
        fontBold
      );

      const leftX = contentX + 20;
      const rightX = contentX + contentW / 2 + 8;

      /*
       * Name
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "दात्याचे नाव / Donor Name",
          leftX,
          donorY + 25
        );

      doc
        .font(fontBold)
        .fontSize(12)
        .fillColor(TEXT)
        .text(
          donorName,
          leftX,
          donorY + 42,
          {
            width: 225,
            ellipsis: true,
          }
        );

      /*
       * Mobile
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "मोबाईल क्रमांक / Mobile No.",
          rightX,
          donorY + 25
        );

      doc
        .font(fontBold)
        .fontSize(12)
        .fillColor(TEXT)
        .text(
          mobile,
          rightX,
          donorY + 42
        );

      /*
       * divider
       */

      doc
        .moveTo(
          contentX + 15,
          donorY + 67
        )
        .lineTo(
          contentX + contentW - 15,
          donorY + 67
        )
        .strokeColor("#E8DECB")
        .lineWidth(0.8)
        .stroke();

      /*
       * Building
       */

      const buildingText =
        wing && wing !== "—"
          ? `${building} - ${wing}`
          : building;

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "इमारत / विंग / Building & Wing",
          leftX,
          donorY + 79
        );

      doc
        .font(fontBold)
        .fontSize(12)
        .fillColor(TEXT)
        .text(
          buildingText,
          leftX,
          donorY + 96,
          {
            width: 225,
            ellipsis: true,
          }
        );

      /*
       * Flat
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "फ्लॅट क्रमांक / Flat No.",
          rightX,
          donorY + 79
        );

      doc
        .font(fontBold)
        .fontSize(12)
        .fillColor(TEXT)
        .text(
          flat,
          rightX,
          donorY + 96
        );

      /* ------------------------------------------------ */
      /* DONATION DETAILS                                 */
      /* ------------------------------------------------ */

      const donationY = 475;
      const donationH = 154;


      roundedBox(
        doc,
        contentX,
        donationY,
        contentW,
        donationH,
        9,
        "#FFFDF9",
        BORDER,
        1
      );

      sectionHeader(
        doc,
        contentX,
        donationY - 10,
        contentW,
        "देणगी तपशील / DONATION DETAILS",
        fontBold
      );

      /*
       * Amount
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "देणगी रक्कम / Donation Amount",
          contentX,
          donationY + 28,
          { width: contentW, align: "center" }
        );

      const formattedAmount =
        `₹ ${amount.toLocaleString("en-IN")}/-`;

      doc
        .font(fontBold)
        .fontSize(29)
        .fillColor(TEXT)
        .text(
          formattedAmount,
          contentX,
          donationY + 47,
          { width: contentW, align: "center" }
        );

      /*
       * Amount box
       */

      doc
        .roundedRect(
          contentX + contentW / 2 + 12,
          donationY + 22,
          contentW / 2 - 32,
          55,
          8
        )
        .fillAndStroke(
          "#FFF6DF",
          GOLD
        )
        .lineWidth(1);

      doc
        .font(fontBold)
        .fontSize(25)
        .fillColor("#25170D")
        .text(
          formattedAmount,
          contentX + contentW / 2 + 12,
          donationY + 35,
          {
            width: contentW / 2 - 32,
            align: "center",
          }
        );

      /*
       * Payment method
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "पेमेंट पद्धत / Payment Method",
          contentX + 20,
          donationY + 91
        );

      doc
        .font(fontBold)
        .fontSize(11)
        .fillColor(TEXT)
        .text(
          paymentMethod,
          contentX + 20,
          donationY + 108
        );

      /*
       * Payment date
       */

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "पेमेंट दिनांक / Payment Date",
          contentX + 205,
          donationY + 91
        );

      doc
        .font(fontBold)
        .fontSize(11)
        .fillColor(TEXT)
        .text(
          donationDate,
          contentX + 205,
          donationY + 108
        );

      /*
       * Amount in words
       */

      doc
        .roundedRect(
          contentX + 14,
          donationY + 127,
          contentW - 28,
          20,
          5
        )
        .fill("#FFF4DC");

      doc
        .font(fontRegular)
        .fontSize(7.2)
        .fillColor(TEXT)
        .text(
          `रक्कमेचे शब्दांत / Amount in Words : ${amountInWords(amount)}`,
          contentX + 20,
          donationY + 133,
          {
            width: contentW - 40,
            align: "center",
            ellipsis: true,
          }
        );

      /* ------------------------------------------------ */
      /* THANK YOU SECTION                                */
      /* ------------------------------------------------ */

      const thankY = 648;
      const thankH = 70;

      roundedBox(
        doc,
        contentX,
        thankY,
        contentW,
        thankH,
        8,
        "#FFFFFF",
        "#DFD5C1",
        1
      );

      doc
        .font(fontBold)
        .fontSize(10)
        .fillColor("#7B241C")
        .text(
          "आपल्या मौल्यवान देणगीबद्दल मनःपूर्वक धन्यवाद !",
          contentX + 16,
          thankY + 12
        );

      doc
        .font(fontRegular)
        .fontSize(8)
        .fillColor(TEXT)
        .text(
          "Thank you for your valuable contribution and support.",
          contentX + 16,
          thankY + 31
        );

      /*
       * Received by
       */

      doc
        .moveTo(
          contentX + contentW - 170,
          thankY + 8
        )
        .lineTo(
          contentX + contentW - 170,
          thankY + thankH - 8
        )
        .strokeColor("#DDD1BA")
        .lineWidth(0.8)
        .stroke();

      doc
        .font(fontBold)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "प्राप्तकर्ता / RECEIVED BY",
          contentX + contentW - 155,
          thankY + 13,
          {
            width: 135,
            align: "center",
          }
        );

      doc
        .font(fontBold)
        .fontSize(10)
        .fillColor(TEXT)
        .text(
          collectedBy,
          contentX + contentW - 155,
          thankY + 31,
          {
            width: 135,
            align: "center",
            ellipsis: true,
          }
        );

      /* ------------------------------------------------ */
      /* FOOTER                                           */
      /* ------------------------------------------------ */

      const footerY = 727;
      const footerH = 96;

      doc
        .rect(
          18,
          footerY,
          pageWidth - 36,
          footerH
        )
        .fill(BLACK);

      doc
        .rect(
          18,
          footerY,
          pageWidth - 36,
          3
        )
        .fill(GOLD);

      /*
       * Raja image
       */

      doc
        .font(fontBold)
        .fontSize(22)
        .fillColor("#F4C84A")
        .text(
          CONFIG.footerRajaMarathi,
          0,
          footerY + 22,
          {
            width: pageWidth,
            align: "center",
          }
        );

      /*
       * Footer address
       */

      doc
        .font(fontRegular)
        .fontSize(7.5)
        .fillColor("#D8D1C3")
        .text(
          CONFIG.addressLine1,
          30,
          footerY + 67,
          {
            width: pageWidth - 60,
            align: "center",
          }
        );

      doc
        .font(fontRegular)
        .fontSize(7.5)
        .fillColor("#D8D1C3")
        .text(
          CONFIG.addressLine2,
          30,
          footerY + 78,
          {
            width: pageWidth - 60,
            align: "center",
          }
        );

      /*
       * Computer generated note
       */

      doc
        .font(fontRegular)
        .fontSize(6.5)
        .fillColor("#918A7C")
        .text(
          "Official Computer Generated Donation Receipt",
          0,
          footerY + 88,
          {
            width: pageWidth,
            align: "center",
          }
        );

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