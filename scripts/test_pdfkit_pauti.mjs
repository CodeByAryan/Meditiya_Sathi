import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
const PDFDocument = req(req.resolve("pdfkit", { paths: ["./artifacts/api-server"] }));
import { createWriteStream, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const getMarathiNumberWords = (n) => {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const num = Math.floor(n);
  const units = {
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

  const parts = [];
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
  if (rem > 0) parts.push(units[rem] || rem);

  const words = parts.join(" ").trim();
  return words ? `रुपये ${words} फक्त` : "रुपये शून्य फक्त";
};

function underHundred(n) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 20) return ones[n] || "";
  return `${tens[Math.floor(n / 10)] || ""}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
}

function underThousand(n) {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  return [hundreds ? `${underHundred(hundreds)} Hundred` : "", remainder ? underHundred(remainder) : ""].filter(Boolean).join(" ");
}

export function amountInWords(value) {
  if (!Number.isFinite(value) || value < 0) return "—";
  const rupees = Math.floor(value + 1e-9);
  const paise = Math.round((value - rupees) * 100);
  const parts = [];
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

function drawDiamond(doc, x, y, size = 4, color = "#D4A638") {
  doc.save();
  doc.fillColor(color);
  doc.moveTo(x, y - size)
     .lineTo(x + size, y)
     .lineTo(x, y + size)
     .lineTo(x - size, y)
     .closePath()
     .fill();
  doc.restore();
}

function drawCheckmark(doc, x, y, size = 6, color = "#2E7D32") {
  doc.save();
  doc.strokeColor(color).lineWidth(1.2).lineCap("round").lineJoin("round");
  doc.moveTo(x, y + size * 0.5)
     .lineTo(x + size * 0.4, y + size * 0.9)
     .lineTo(x + size, y)
     .stroke();
  doc.restore();
}

function generateReceiptPdfKit(data, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Vargani Receipt - ${data.receiptNumber}`,
        Author: "मेड़तिया मित्र मंडळ",
        Subject: "Donation Receipt / पावती",
      },
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    const fontBold = path.resolve("artifacts/api-server/fonts/Mukta-Bold.ttf");
    const fontReg = path.resolve("artifacts/api-server/fonts/Mukta-Regular.ttf");
    const logoPath = path.resolve("artifacts/meditiya-sathi/public/logo.png");

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 20;
    const cardWidth = pageWidth - margin * 2; // 555.28
    const cardHeight = pageHeight - margin * 2; // 801.89
    const cardX = margin;
    const cardY = margin;

    // 1. Page Background (Cream)
    doc.rect(0, 0, pageWidth, pageHeight).fill("#FAF8F5");

    // 2. Outer Card Frame with Double Gold Border
    doc.rect(cardX, cardY, cardWidth, cardHeight).fillAndStroke("#FFFFFF", "#D4A638").lineWidth(2.5);
    doc.rect(cardX + 3.5, cardY + 3.5, cardWidth - 7, cardHeight - 7).stroke("#E0D4BD").lineWidth(0.75);

    // 3. Header Section (Dark Banner)
    const headerH = 106;
    doc.rect(cardX, cardY, cardWidth, headerH).fill("#11141A");
    doc.rect(cardX, cardY, cardWidth, 4).fill("#E0660F"); // Top Saffron line
    doc.rect(cardX, cardY + headerH - 2, cardWidth, 2).fill("#D4A638"); // Bottom Gold line
    doc.rect(cardX, cardY + headerH, cardWidth, 1.5).fill("#E0660F"); // Sub-line

    // Logo on Left
    if (existsSync(logoPath)) {
      doc.image(logoPath, cardX + 18, cardY + 16, { fit: [74, 74], align: "center", valign: "center" });
    }

    // Header Text
    const headerCenterX = cardX + 90;
    const headerContentW = cardWidth - 105;

    doc.font(fontBold).fontSize(20).fillColor("#FFF9EA")
      .text("मेड़तिया मित्र मंडळ", headerCenterX, cardY + 16, { width: headerContentW, align: "center" });

    doc.font(fontBold).fontSize(9.5).fillColor("#F5D173")
      .text("MEDITIYA MITRA MANDAL", headerCenterX, cardY + 42, { width: headerContentW, align: "center", characterSpacing: 1.5 });

    doc.font(fontReg).fontSize(9).fillColor("#E5E7EB")
      .text("मेड़तिया नगर, कांदिवली (पूर्व), मुंबई – 400101", headerCenterX, cardY + 58, { width: headerContentW, align: "center" });

    doc.font(fontReg).fontSize(8.5).fillColor("#EA9A4E")
      .text("सार्वजनिक गणेशोत्सव मंडळ • स्थापना: २००१", headerCenterX, cardY + 74, { width: headerContentW, align: "center" });

    // 4. Title Section ("पावती")
    const titleY = cardY + headerH + 16;
    doc.font(fontBold).fontSize(22).fillColor("#11141A")
      .text("पावती", cardX, titleY, { width: cardWidth, align: "center" });

    // Decorative Gold Lines & Diamonds on both sides of "पावती"
    const titleTextW = doc.widthOfString("पावती");
    const titleCenterX = cardX + cardWidth / 2;
    const lineW = 75;
    const lineGap = 16;

    // Left line + diamond
    const leftLineEnd = titleCenterX - titleTextW / 2 - lineGap;
    doc.moveTo(leftLineEnd - lineW, titleY + 14).lineTo(leftLineEnd, titleY + 14).strokeColor("#D4A638").lineWidth(1).stroke();
    drawDiamond(doc, leftLineEnd + 7, titleY + 14, 3.5, "#E0660F");

    // Right line + diamond
    const rightLineStart = titleCenterX + titleTextW / 2 + lineGap;
    drawDiamond(doc, rightLineStart - 7, titleY + 14, 3.5, "#E0660F");
    doc.moveTo(rightLineStart, titleY + 14).lineTo(rightLineStart + lineW, titleY + 14).strokeColor("#D4A638").lineWidth(1).stroke();

    doc.font(fontBold).fontSize(10).fillColor("#E0660F")
      .text("DONATION RECEIPT", cardX, titleY + 28, { width: cardWidth, align: "center", characterSpacing: 1.5 });

    // 5. Receipt Meta Information Panel (3 Columns)
    const metaY = titleY + 46;
    const metaH = 44;
    const contentPad = 22;
    const contentX = cardX + contentPad;
    const contentW = cardWidth - contentPad * 2; // 511.28

    doc.rect(contentX, metaY, contentW, metaH).fillAndStroke("#FDFBF7", "#DFD7C7").lineWidth(1);

    const colW = contentW / 3;
    // Col 1: Receipt Number
    doc.font(fontBold).fontSize(7.5).fillColor("#6B7280").text("पावती क्रमांक / RECEIPT NO.", contentX + 12, metaY + 8);
    doc.font(fontBold).fontSize(11).fillColor("#11141A").text(data.receiptNumber || "—", contentX + 12, metaY + 22);

    // Div 1
    doc.moveTo(contentX + colW, metaY + 5).lineTo(contentX + colW, metaY + metaH - 5).strokeColor("#EAE3D5").lineWidth(1).stroke();

    // Col 2: Date
    doc.font(fontBold).fontSize(7.5).fillColor("#6B7280").text("दिनांक / DATE", contentX + colW + 12, metaY + 8);
    doc.font(fontBold).fontSize(11).fillColor("#11141A").text(data.donationDate || "—", contentX + colW + 12, metaY + 22);

    // Div 2
    doc.moveTo(contentX + colW * 2, metaY + 5).lineTo(contentX + colW * 2, metaY + metaH - 5).strokeColor("#EAE3D5").lineWidth(1).stroke();

    // Col 3: Festival
    const festTitle = `${data.festivalName || "गणेश उत्सव"}${data.festivalYear ? ` ${data.festivalYear}` : ""}`;
    doc.font(fontBold).fontSize(7.5).fillColor("#6B7280").text("उत्सव / FESTIVAL", contentX + colW * 2 + 12, metaY + 8);
    doc.font(fontBold).fontSize(11).fillColor("#D97706").text(festTitle, contentX + colW * 2 + 12, metaY + 22);

    // 6. Donor Information Box
    const donorY = metaY + metaH + 14;
    const donorH = 102;
    doc.rect(contentX, donorY, contentW, donorH).fillAndStroke("#FFFFFF", "#DCD3C1").lineWidth(1);

    // Donor Tab
    const tabW = 205;
    const tabH = 18;
    doc.rect(contentX, donorY, tabW, tabH).fill("#E0660F");
    doc.font(fontBold).fontSize(8).fillColor("#FFFFFF").text("दात्याची माहिती / DONOR INFORMATION", contentX + 10, donorY + 5);

    const dColW = (contentW - 32) / 2;
    // Row 1: Name & Mobile
    doc.font(fontBold).fontSize(7.5).fillColor("#6B7280").text("दात्याचे नाव / Donor Name", contentX + 14, donorY + 28);
    doc.font(fontBold).fontSize(11).fillColor("#11141A").text(data.name || "—", contentX + 14, donorY + 41, { width: dColW, ellipsis: true });

    doc.font(fontBold).fontSize(7.5).fillColor("#6B7280").text("मोबाईल क्रमांक / Mobile No.", contentX + contentW / 2 + 8, donorY + 28);
    doc.font(fontBold).fontSize(11).fillColor("#11141A").text(data.mobile || "—", contentX + contentW / 2 + 8, donorY + 41);

    // Divider Line
    doc.moveTo(contentX + 14, donorY + 62).lineTo(contentX + contentW - 14, donorY + 62).strokeColor("#F3EDE2").lineWidth(0.75).stroke();

    // Row 2: Building & Flat
    const bldgWing = [data.building, data.wing].filter(Boolean).join(" - ") || data.building || "—";
    doc.font(fontBold).fontSize(7.5).fillColor("#6B7280").text("इमारत व विंग / Building & Wing", contentX + 14, donorY + 68);
    doc.font(fontBold).fontSize(10.5).fillColor("#11141A").text(bldgWing, contentX + 14, donorY + 81, { width: dColW, ellipsis: true });

    doc.font(fontBold).fontSize(7.5).fillColor("#6B7280").text("फ्लॅट क्रमांक / Flat No.", contentX + contentW / 2 + 8, donorY + 68);
    doc.font(fontBold).fontSize(10.5).fillColor("#11141A").text(data.flat || "—", contentX + contentW / 2 + 8, donorY + 81);

    // 7. Donation Details Box
    const payY = donorY + donorH + 14;
    const payH = 138;
    doc.rect(contentX, payY, contentW, payH).fillAndStroke("#FDFCF9", "#D4A638").lineWidth(1.5);

    // Pay Tab
    doc.rect(contentX, payY, tabW, tabH).fill("#1F242E");
    doc.font(fontBold).fontSize(8).fillColor("#F5D173").text("देणगी तपशील / DONATION DETAILS", contentX + 10, payY + 5);

    // Prominent Donation Amount
    doc.font(fontBold).fontSize(9.5).fillColor("#E0660F").text("देणगी रक्कम / Donation Amount", contentX, payY + 26, { width: contentW, align: "center" });

    const formattedAmount = `₹ ${Number(data.amount).toLocaleString("en-IN")}/-`;
    doc.font(fontBold).fontSize(28).fillColor("#11141A").text(formattedAmount, contentX, payY + 40, { width: contentW, align: "center" });

    // Amount in Words Box
    const wordsMar = getMarathiNumberWords(data.amount);
    const wordsEng = amountInWords(data.amount);
    const wordsCombined = `रक्कमेचे शब्दांत / Amount in Words : ${wordsMar} (${wordsEng})`;

    const wordsBoxW = contentW - 28;
    const wordsBoxX = contentX + 14;
    const wordsBoxY = payY + 76;
    doc.rect(wordsBoxX, wordsBoxY, wordsBoxW, 20).fillAndStroke("#F3EDE2", "#E5DCCE").lineWidth(0.75);
    doc.font(fontReg).fontSize(8.5).fillColor("#334155").text(wordsCombined, wordsBoxX + 6, wordsBoxY + 5.5, { width: wordsBoxW - 12, align: "center", ellipsis: true });

    // Pay Meta Line
    doc.moveTo(contentX + 14, payY + 104).lineTo(contentX + contentW - 14, payY + 104).strokeColor("#EAE2D3").lineWidth(0.75).stroke();

    const methodText = (data.paymentMethod || "CASH").toUpperCase().replace(/_/g, " ");
    doc.font(fontBold).fontSize(8).fillColor("#6B7280").text("पेमेंट पद्धत / Method:", contentX + 16, payY + 115);

    // Emerald Pill
    const pillX = contentX + 120;
    const pillW = 65;
    doc.rect(pillX, payY + 110, pillW, 18).fillAndStroke("#EDF7ED", "#2E7D32").lineWidth(1);
    doc.font(fontBold).fontSize(8.5).fillColor("#1E4620").text(methodText, pillX, payY + 114.5, { width: pillW, align: "center" });

    doc.font(fontBold).fontSize(8).fillColor("#6B7280").text("पेमेंट दिनांक / Date:", contentX + contentW / 2 + 20, payY + 115);
    doc.font(fontBold).fontSize(9.5).fillColor("#11141A").text(data.donationDate || "—", contentX + contentW / 2 + 115, payY + 114);

    // 8. Thank You & Received By Section
    const thankY = payY + payH + 14;
    const thankH = 74;
    doc.rect(contentX, thankY, contentW, thankH).fillAndStroke("#FFFFFF", "#DFD7C7").lineWidth(1);

    const recW = 155;
    const thankW = contentW - recW;

    doc.font(fontBold).fontSize(9.5).fillColor("#E0660F").text("आपल्या मौल्यवान देणगीबद्दल मनःपूर्वक धन्यवाद !", contentX + 14, thankY + 12);
    doc.font(fontReg).fontSize(8).fillColor("#64748B").text("Thank you for your valuable contribution and support.", contentX + 14, thankY + 28);
    doc.font(fontBold).fontSize(9).fillColor("#B45309").text("॥ गणपती बाप्पा मोरया, मंगलमूर्ती मोरया ॥", contentX + 14, thankY + 46);

    // Vertical Divider
    doc.moveTo(contentX + thankW, thankY + 6).lineTo(contentX + thankW, thankY + thankH - 6).strokeColor("#EAE2D3").lineWidth(0.75).stroke();

    // Received by (Right)
    const recX = contentX + thankW + 10;
    doc.font(fontBold).fontSize(7.5).fillColor("#6B7280").text("प्राप्तकर्ता / RECEIVED BY", recX, thankY + 12, { width: recW - 20, align: "center" });
    doc.font(fontBold).fontSize(10).fillColor("#11141A").text(data.collectedBy || "Admin (Authorized)", recX, thankY + 27, { width: recW - 20, align: "center", ellipsis: true });

    // Green Verified Stamp
    const stampW = 100;
    const stampX = recX + (recW - 20 - stampW) / 2;
    doc.rect(stampX, thankY + 46, stampW, 16).fillAndStroke("#EDF7ED", "#2E7D32").lineWidth(0.75);
    drawCheckmark(doc, stampX + 8, thankY + 50, 6, "#2E7D32");
    doc.font(fontBold).fontSize(7.5).fillColor("#1E4620").text("VERIFIED RECEIPT", stampX + 16, thankY + 50, { width: stampW - 20, align: "center" });

    // 9. Footer Section (Dark Banner)
    const footerH = 74;
    const footerY = cardY + cardHeight - footerH;

    doc.rect(cardX, footerY, cardWidth, footerH).fill("#11141A");
    doc.rect(cardX, footerY, cardWidth, 2).fill("#D4A638");
    doc.rect(cardX, footerY - 2, cardWidth, 1.5).fill("#E0660F");

    // "मेड़तियाचा राजा" with flanking vector diamonds
    const rajaText = "मेड़तियाचा राजा";
    doc.font(fontBold).fontSize(17).fillColor("#F5D173")
      .text(rajaText, cardX, footerY + 14, { width: cardWidth, align: "center", characterSpacing: 1 });

    const rajaTextW = doc.widthOfString(rajaText);
    const rajaCenterX = cardX + cardWidth / 2;
    drawDiamond(doc, rajaCenterX - rajaTextW / 2 - 14, footerY + 22, 3.5, "#F5D173");
    drawDiamond(doc, rajaCenterX + rajaTextW / 2 + 14, footerY + 22, 3.5, "#F5D173");

    doc.font(fontReg).fontSize(8.5).fillColor("#D1D5DB")
      .text("मेड़तिया मित्र मंडळ • कांदिवली (पूर्व), मुंबई – ४००१०१", cardX, footerY + 37, { width: cardWidth, align: "center" });

    doc.font(fontReg).fontSize(7).fillColor("#9CA3AF")
      .text("ही संगणकीय पावती असल्याने स्वाक्षरीची आवश्यकता नाही • Official Computer Generated Receipt", cardX, footerY + 53, { width: cardWidth, align: "center" });

    doc.end();

    stream.on("finish", () => resolve(outputPath));
    stream.on("error", (err) => reject(err));
  });
}

async function run() {
  console.log("Generating test-pdfkit-pauti-full.pdf...");
  await generateReceiptPdfKit({
    receiptNumber: "REC/2026/000123",
    donationDate: "18/05/2026",
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
  }, "test-pdfkit-pauti-full.pdf");

  console.log("Rendering to PNG...");
  execSync(`python -c "import pymupdf; doc = pymupdf.open('test-pdfkit-pauti-full.pdf'); doc[0].get_pixmap(dpi=150).save('test-pdfkit-pauti-full.png')"`);
  console.log("Saved test-pdfkit-pauti-full.png!");
}

run().catch(console.error);
