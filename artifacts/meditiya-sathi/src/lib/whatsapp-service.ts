/**
 * WhatsApp Service - Send donation notifications & receipts via WhatsApp.
 *
 * Supports WhatsApp Business Cloud API (Server-side) and direct WhatsApp App deep link fallback.
 *
 * @module whatsapp-service
 */

// ── Types ────────────────────────────────────────────────────────────────────

import { getReceiptPdfUrl, getPublicAppBaseUrl } from "./app-url";
import { getApiUrl } from "./utils";

export interface WhatsAppDonationData {
  residentName: string;
  residentMobile: string;
  flatNo?: string | null;
  buildingName?: string | null;
  wingName?: string | null;
  amount: number | null;
  paymentMethod?: string | null;
  paymentDate?: string | null;
  receiptNumber?: string | null;
  collectedByAdminName?: string | null;
  pendingReason?: string | null;
  paymentStatus?: "paid" | "pending";
  pdfUrl?: string | null;
}

export interface WhatsAppFestivalData {
  name: string;
  year?: number | null;
  societyName?: string;
  contactInfo?: string;
}

export type WhatsAppMessageType = "receipt" | "pending_reminder";

// ── Helper Functions ─────────────────────────────────────────────────────────

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Normalizes an Indian phone number to valid international WhatsApp format (91XXXXXXXXXX)
 */
export function formatWhatsAppPhone(mobile: string | null | undefined): string {
  if (!mobile) return "";
  let cleaned = String(mobile).replace(/\D/g, "");

  // Handle accidental double 91 prefix (e.g. 91919876543210 -> 919876543210)
  if (cleaned.startsWith("9191") && cleaned.length === 14) {
    cleaned = cleaned.slice(2);
  }

  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `91${cleaned.slice(1)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned;
  }
  if (cleaned.length > 12 && cleaned.startsWith("91")) {
    return `91${cleaned.slice(-10)}`;
  }
  if (cleaned.length > 10) {
    return `91${cleaned.slice(-10)}`;
  }
  return cleaned;
}

/**
 * Validate normalized Indian phone number
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  return /^91[6-9]\d{9}$/.test(phone) || (phone.length >= 10 && phone.length <= 15);
}

// ── Message Builders ─────────────────────────────────────────────────────────

/**
 * Build the standard Marathi/English donation receipt message for WhatsApp sharing.
 */
export function buildReceiptMessage(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData
): string {
  const festTitle = `${festival.name}${festival.year ? ` ${festival.year}` : ""}`.trim() || "गणेश उत्सव";
  const pdfUrl =
    donation.pdfUrl ||
    (donation.receiptNumber
      ? getReceiptPdfUrl(donation.receiptNumber)
      : null);

  const lines = [
    "नमस्कार 🙏",
    "",
    "मेड़तिया मित्र मंडळ कडून आपल्या देणगीची पावती येथे उपलब्ध आहे.",
    "",
    `Receipt No: ${donation.receiptNumber || "—"}`,
    `Festival: ${festTitle}`,
    `Donation Amount: ${formatCurrency(donation.amount)}`,
  ];

  if (donation.residentName) {
    lines.push(`Donor Name: ${donation.residentName}`);
  }

  if (pdfUrl) {
    lines.push("", "पावती:", pdfUrl);
  }

  lines.push(
    "",
    "धन्यवाद 🙏",
    "मेड़तिया मित्र मंडळ"
  );

  return lines.join("\n");
}

/**
 * Build detailed Marathi WhatsApp receipt message (with flat/building details)
 */
export function buildDetailedReceiptMessage(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData
): string {
  const festTitle = `${festival.name}${festival.year ? ` ${festival.year}` : ""}`.trim() || "गणेश उत्सव";
  const pdfUrl =
    donation.pdfUrl ||
    (donation.receiptNumber
      ? getReceiptPdfUrl(donation.receiptNumber)
      : null);

  const lines = [
    "🚩 *मेड़तिया मित्र मंडळ*",
    "*पावती / Donation Receipt*",
    "",
    `*उत्सव / Festival:* ${festTitle}`,
    `*दात्याचे नाव / Name:* ${donation.residentName || "—"}`,
  ];

  if (donation.buildingName || donation.wingName) {
    const bldg = [donation.buildingName, donation.wingName].filter(Boolean).join(" - ");
    lines.push(`*इमारत व विंग / Building:* ${bldg}`);
  }
  if (donation.flatNo) {
    lines.push(`*फ्लॅट क्रमांक / Flat No:* ${donation.flatNo}`);
  }

  lines.push(
    `*देणगी रक्कम / Amount:* ${formatCurrency(donation.amount)}`,
    `*पेमेंट पद्धत / Method:* ${(donation.paymentMethod || "CASH").toUpperCase().replace(/_/g, " ")}`,
    `*दिनांक / Date:* ${formatDate(donation.paymentDate)}`,
    `*पावती क्रमांक / Receipt No:* ${donation.receiptNumber || "—"}`
  );

  if (donation.collectedByAdminName) {
    lines.push(`*प्राप्तकर्ता / Collected By:* ${donation.collectedByAdminName}`);
  }

  if (pdfUrl) {
    lines.push("", "📄 *पावती डाउनलोड करा / Download Receipt PDF:*", pdfUrl);
  }

  lines.push(
    "",
    "आपल्या मौल्यवान देणगीबद्दल मनःपूर्वक धन्यवाद ! 🙏",
    "॥ गणपती बाप्पा मोरया, मंगलमूर्ती मोरया ॥"
  );

  if (festival.contactInfo) {
    lines.push("", `📞 *संपर्क / Contact:* ${festival.contactInfo}`);
  }

  return lines.join("\n");
}

export function buildPendingReminderMessage(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData
): string {
  const festTitle = `${festival.name}${festival.year ? ` ${festival.year}` : ""}`.trim();

  const lines = [
    "🚩 *मेड़तिया मित्र मंडळ*",
    "",
    "*⏳ देणगी स्मरणपत्र / Donation Reminder*",
    "",
    `सस्नेह नमस्कार *${donation.residentName}*,`,
    "",
    `*${festTitle}* साठी आपली वर्गणी/देणगी नोंद प्रलंबित आहे.`,
  ];

  if (donation.pendingReason) {
    lines.push(`*कारण / Reason:* ${donation.pendingReason}`);
  }

  lines.push(
    "",
    "मंडळाच्या उत्सवासाठी आपले सहकार्य अत्यंत मोलाचे आहे.",
    "कृपया आपल्या सोयीनुसार देणगी जमा करावी ही नम्र विनंती. 🙏",
    "",
    "॥ गणपती बाप्पा मोरया, मंगलमूर्ती मोरया ॥"
  );

  if (festival.contactInfo) {
    lines.push("", `📞 *संपर्क:* ${festival.contactInfo}`);
  }

  return lines.join("\n");
}

// ── Direct WhatsApp App Deep Link & Fallback ────────────────────────────────

/**
 * Opens the installed WhatsApp application using deep link (whatsapp://send?phone=...&text=...)
 * with automatic fallback to WhatsApp Web / api.whatsapp.com.
 *
 * @param mobile - Resident's mobile number
 * @param messageText - Plain text message (will be URL-encoded)
 * @returns true if WhatsApp action was initiated, false on error
 */
export function openWhatsAppDeepLink(mobile: string | null | undefined, messageText: string): boolean {
  const phone = formatWhatsAppPhone(mobile);

  if (!phone || phone.length < 10) {
    console.error(`[WhatsApp Service] Invalid mobile number: ${mobile} (formatted: ${phone})`);
    return false;
  }

  try {
    const encodedText = encodeURIComponent(messageText);
    const deepLink = `whatsapp://send?phone=${phone}&text=${encodedText}`;
    const webFallback = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;

    if (typeof window !== "undefined") {
      // Create hidden link and trigger
      const link = document.createElement("a");
      link.href = webFallback;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 500);
      return true;
    }
    return false;
  } catch (error) {
    console.error("[WhatsApp Service] Failed to open WhatsApp deep link:", error);
    return false;
  }
}

/**
 * Legacy wrapper: open WhatsApp deep link / web fallback.
 */
export function sendWhatsApp(mobile: string | null | undefined, messageText: string): boolean {
  return openWhatsAppDeepLink(mobile, messageText);
}


/**
 * Convenience function to send a donation receipt via WhatsApp.
 */
export function sendReceiptViaWhatsApp(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData
): boolean {
  const message = buildReceiptMessage(donation, festival);
  return sendWhatsApp(donation.residentMobile, message);
}

/**
 * Convenience function to send a pending donation reminder via WhatsApp.
 */
export function sendPendingReminderViaWhatsApp(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData
): boolean {
  const message = buildPendingReminderMessage(donation, festival);
  return sendWhatsApp(donation.residentMobile, message);
}


