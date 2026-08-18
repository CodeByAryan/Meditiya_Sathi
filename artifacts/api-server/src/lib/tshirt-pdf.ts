import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export interface TshirtPdfData {
  id: number;
  collectionId: string;
  name: string;
  mobileNumber: string;
  buildingName?: string | null;
  wingName?: string | null;
  flatNumber?: string | null;
  tShirtSize: string;
  tShirtSizeNumeric?: number | null;
  quantity: number;
  tshirtPrice?: number | null;
  totalAmount?: number | null;
  festivalName?: string | null;
  festivalYear?: number | null;
  createdAt?: string | Date | null;
  qrPayload: string;
}

export async function generateTshirtPdf(data: TshirtPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  // Standard A4 page: 595.28 x 841.89 pt
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Generate QR Code as PNG Buffer
  const qrPngDataUrl = await QRCode.toDataURL(data.qrPayload, {
    width: 400,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#1A1A1A",
      light: "#FFFFFF",
    },
  });
  const qrBase64 = qrPngDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrPngBuffer = Buffer.from(qrBase64, "base64");
  const qrImage = await pdfDoc.embedPng(qrPngBuffer);

  // Colors
  const saffron = rgb(0.92, 0.45, 0.08);     // #EA7314
  const darkNavy = rgb(0.09, 0.12, 0.18);    // #171F2E
  const darkGray = rgb(0.25, 0.28, 0.32);
  const lightGray = rgb(0.94, 0.95, 0.96);
  const borderColor = rgb(0.85, 0.87, 0.90);
  const emeraldGreen = rgb(0.06, 0.62, 0.35); // #109E59
  const white = rgb(1, 1, 1);

  // Background Fill
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.98, 0.98, 0.99),
  });

  // Top Accent Bar
  page.drawRectangle({
    x: 0,
    y: height - 12,
    width,
    height: 12,
    color: saffron,
  });

  // Main Card Container
  const margin = 36;
  const cardWidth = width - margin * 2;
  const cardHeight = height - margin * 2 - 10;
  const cardX = margin;
  const cardY = margin;

  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    color: white,
    borderColor: borderColor,
    borderWidth: 1.5,
  });

  // Header Banner inside card
  const headerHeight = 90;
  const headerY = cardY + cardHeight - headerHeight;
  page.drawRectangle({
    x: cardX,
    y: headerY,
    width: cardWidth,
    height: headerHeight,
    color: darkNavy,
  });

  // Header Titles
  const mainTitle = "MEDITIYA SATHI";
  const mainTitleWidth = fontBold.widthOfTextAtSize(mainTitle, 22);
  page.drawText(mainTitle, {
    x: cardX + (cardWidth - mainTitleWidth) / 2,
    y: headerY + 54,
    size: 22,
    font: fontBold,
    color: white,
  });

  const subTitle = "T-SHIRT COLLECTION PASS";
  const subTitleWidth = fontBold.widthOfTextAtSize(subTitle, 13);
  page.drawText(subTitle, {
    x: cardX + (cardWidth - subTitleWidth) / 2,
    y: headerY + 34,
    size: 13,
    font: fontBold,
    color: saffron,
  });

  const festName = `${data.festivalName || "Festival"} ${data.festivalYear || new Date().getFullYear()}`;
  const festWidth = fontRegular.widthOfTextAtSize(festName, 10);
  page.drawText(festName, {
    x: cardX + (cardWidth - festWidth) / 2,
    y: headerY + 16,
    size: 10,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.9),
  });

  // T-Shirt ID Highlight Ribbon
  const ribbonY = headerY - 44;
  page.drawRectangle({
    x: cardX + 24,
    y: ribbonY,
    width: cardWidth - 48,
    height: 34,
    color: lightGray,
    borderColor: borderColor,
    borderWidth: 1,
  });

  page.drawText("T-SHIRT ID:", {
    x: cardX + 36,
    y: ribbonY + 11,
    size: 11,
    font: fontBold,
    color: darkGray,
  });

  page.drawText(data.collectionId, {
    x: cardX + 120,
    y: ribbonY + 10,
    size: 14,
    font: fontBold,
    color: saffron,
  });

  // Payment Status Tag on Right of Ribbon
  const payBadgeWidth = 72;
  const payBadgeX = cardX + cardWidth - 36 - payBadgeWidth;
  page.drawRectangle({
    x: payBadgeX,
    y: ribbonY + 6,
    width: payBadgeWidth,
    height: 22,
    color: rgb(0.88, 0.96, 0.91),
    borderColor: emeraldGreen,
    borderWidth: 1,
  });

  const paidText = "PAID";
  const paidTextWidth = fontBold.widthOfTextAtSize(paidText, 10);
  page.drawText(paidText, {
    x: payBadgeX + (payBadgeWidth - paidTextWidth) / 2,
    y: ribbonY + 12,
    size: 10,
    font: fontBold,
    color: emeraldGreen,
  });

  // Details Section Grid
  const detailsY = ribbonY - 20;
  const col1X = cardX + 36;
  const col2X = cardX + cardWidth / 2 + 10;
  let currentY = detailsY;

  const drawField = (label: string, value: string, x: number, y: number) => {
    page.drawText(label.toUpperCase(), {
      x,
      y,
      size: 8.5,
      font: fontBold,
      color: rgb(0.45, 0.5, 0.56),
    });
    page.drawText(value || "—", {
      x,
      y: y - 14,
      size: 12,
      font: fontBold,
      color: darkNavy,
    });
  };

  // Row 1: Name & Mobile
  drawField("Resident Name", data.name, col1X, currentY);
  drawField("Mobile Number", data.mobileNumber, col2X, currentY);
  currentY -= 36;

  // Row 2: Building & Wing / Flat
  const bldgText = [data.buildingName, data.wingName].filter(Boolean).join(" - ") || "—";
  drawField("Building / Wing", bldgText, col1X, currentY);
  drawField("Flat Number", data.flatNumber || "—", col2X, currentY);
  currentY -= 36;

  // Row 3: T-Shirt Size & Quantity
  const sizeText = data.tShirtSizeNumeric ? `${data.tShirtSize} (${data.tShirtSizeNumeric})` : data.tShirtSize;
  drawField("T-Shirt Size", sizeText, col1X, currentY);
  drawField("Quantity", `${data.quantity} ${data.quantity === 1 ? "Piece" : "Pieces"}`, col2X, currentY);
  currentY -= 36;

  // Divider Line
  page.drawLine({
    start: { x: cardX + 24, y: currentY + 10 },
    end: { x: cardX + cardWidth - 24, y: currentY + 10 },
    thickness: 1,
    color: borderColor,
  });
  currentY -= 14;

  // QR Section
  const qrSectionTitle = "SCAN TO COLLECT / VERIFY";
  const qrTitleWidth = fontBold.widthOfTextAtSize(qrSectionTitle, 12);
  page.drawText(qrSectionTitle, {
    x: cardX + (cardWidth - qrTitleWidth) / 2,
    y: currentY,
    size: 12,
    font: fontBold,
    color: darkNavy,
  });
  currentY -= 15;

  const qrSize = 170;
  const qrX = cardX + (cardWidth - qrSize) / 2;
  const qrY = currentY - qrSize;

  // White box behind QR
  page.drawRectangle({
    x: qrX - 8,
    y: qrY - 8,
    width: qrSize + 16,
    height: qrSize + 16,
    color: white,
    borderColor: borderColor,
    borderWidth: 1,
  });

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  currentY = qrY - 22;

  // Instructions Box
  const infoBoxHeight = 84;
  const infoBoxY = currentY - infoBoxHeight;
  page.drawRectangle({
    x: cardX + 24,
    y: infoBoxY,
    width: cardWidth - 48,
    height: infoBoxHeight,
    color: rgb(0.97, 0.98, 1.0),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
  });

  const drawBullet = (text: string, y: number) => {
    page.drawText("•", {
      x: cardX + 36,
      y,
      size: 10,
      font: fontBold,
      color: saffron,
    });
    page.drawText(text, {
      x: cardX + 48,
      y,
      size: 9.5,
      font: fontRegular,
      color: darkNavy,
    });
  };

  drawBullet("Please present this QR code at the counter to collect your T-shirt.", infoBoxY + 62);
  drawBullet("This QR code is uniquely linked to your registration and order.", infoBoxY + 44);
  drawBullet("Please do not share this QR code with another person.", infoBoxY + 26);
  drawBullet("Your payment status is already recorded as PAID in our system.", infoBoxY + 8);

  // Footer inside card
  const footerText = "Meditiya Sathi • Official T-Shirt Verification Pass";
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 8.5);
  page.drawText(footerText, {
    x: cardX + (cardWidth - footerWidth) / 2,
    y: cardY + 12,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.55, 0.6, 0.65),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
