/**
 * WhatsApp Service - Send donation notifications via WhatsApp.
 *
 * This module provides a clean interface for sending WhatsApp messages.
 * Supports reliable opening on Desktop Web, WhatsApp App, and Mobile browsers.
 *
 * @module whatsapp-service
 */

// ── Types ────────────────────────────────────────────────────────────────────

import { getPublicAppBaseUrl } from "./tshirt-url";

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

  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `91${cleaned.slice(1)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned;
  }
  if (cleaned.length > 10 && cleaned.startsWith("91")) {
    return cleaned;
  }
  if (cleaned.length > 10) {
    return `91${cleaned.slice(-10)}`;
  }
  return cleaned;
}

// ── Message Builders ─────────────────────────────────────────────────────────

/**
 * Build the WhatsApp message text for a given donation and purpose.
 */
export function buildWhatsAppMessage(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData,
  type: WhatsAppMessageType
): string {
  if (type === "receipt") {
    return buildReceiptMessage(donation, festival);
  }
  return buildPendingReminderMessage(donation, festival);
}

export function buildReceiptMessage(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData
): string {
  const festTitle = `${festival.name}${festival.year ? ` ${festival.year}` : ""}`.trim();
  const pdfUrl =
    donation.pdfUrl ||
    (donation.receiptNumber
      ? `${getPublicAppBaseUrl()}/api/vargani-pdf/${encodeURIComponent(donation.receiptNumber)}.pdf`
      : null);

  const lines = [
    "🚩 *मेड़तिया मित्र मंडळ*",
    "*पावती / Donation Receipt*",
    "",
    `*उत्सव / Festival:* ${festTitle || "गणेश उत्सव"}`,
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

function buildPendingReminderMessage(
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

// ── Send Function ────────────────────────────────────────────────────────────

/**
 * Open WhatsApp with reliable cross-browser popup and mobile handling.
 *
 * @param mobile - Resident's mobile number
 * @param messageText - Plain text message (will be URL-encoded)
 * @returns true if WhatsApp action was initiated, false on error
 */
export function sendWhatsApp(mobile: string | null | undefined, messageText: string): boolean {
  const phone = formatWhatsAppPhone(mobile);

  if (!phone || phone.length < 10) {
    console.error(`[WhatsApp Service] Invalid mobile number: ${mobile} (formatted: ${phone})`);
    return false;
  }

  try {
    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;

    // Reliable navigation method to avoid browser popup blockers after async calls
    if (typeof window !== "undefined") {
      const link = document.createElement("a");
      link.href = waUrl;
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
    console.error("[WhatsApp Service] Failed to open WhatsApp:", error);
    return false;
  }
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


