/**
 * WhatsApp Service - Send donation notifications via WhatsApp.
 *
 * This module provides a clean interface for sending WhatsApp messages.
 * Currently uses WhatsApp Web (wa.me links) as the transport layer.
 * Designed to be easily swapped with WhatsApp Business API or Twilio
 * without changing the calling UI components.
 *
 * @module whatsapp-service
 */

// ── Types ────────────────────────────────────────────────────────────────────

import { getPublicAppBaseUrl } from "./tshirt-url";

export interface WhatsAppDonationData {
  residentName: string;
  residentMobile: string;
  flatNo: string;
  buildingName: string;
  wingName: string;
  amount: number | null;
  paymentMethod: string;
  paymentDate: string | null;
  receiptNumber: string | null;
  collectedByAdminName: string;
  pendingReason: string | null;
  paymentStatus: "paid" | "pending";
  pdfUrl?: string | null;
}

export interface WhatsAppFestivalData {
  name: string;
  year: number;
  societyName?: string;
  contactInfo?: string;
}

export type WhatsAppMessageType = "receipt" | "pending_reminder";

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SOCIETY_NAME = "Meditiya Sathi";

// ── Helper Functions ─────────────────────────────────────────────────────────

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function cleanMobile(mobile: string): string {
  return mobile.replace(/[^0-9]/g, "");
}

// ── Message Builders ─────────────────────────────────────────────────────────

/**
 * Build the WhatsApp message text for a given donation and purpose.
 *
 * @param donation - Donation data
 * @param festival - Festival data
 * @param type - Message type: 'receipt' for paid, 'pending_reminder' for pending
 * @returns The pre-formatted message string (URL-encoded for wa.me links)
 */
export function buildWhatsAppMessage(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData,
  type: WhatsAppMessageType
): string {
  const societyName = festival.societyName || DEFAULT_SOCIETY_NAME;

  if (type === "receipt") {
    return buildReceiptMessage(donation, festival, societyName);
  }

  return buildPendingReminderMessage(donation, festival, societyName);
}

function buildReceiptMessage(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData,
  societyName: string
): string {
  const lines = [
    `🏡 *${societyName}*`,
    "",
    "*🧾 Donation Receipt*",
    "",
    `*Festival:* ${festival.name} ${festival.year}`,
    `*Resident:* ${donation.residentName}`,
    `*Building:* ${donation.buildingName || "—"}`,
    `*Wing:* ${donation.wingName || "NA"}`,
    `*Flat:* ${donation.flatNo}`,
    `*Amount Received:* ${formatCurrency(donation.amount)}`,
    `*Payment Method:* ${donation.paymentMethod
      ? donation.paymentMethod.charAt(0).toUpperCase() +
        donation.paymentMethod.slice(1).replace("_", " ")
      : "—"}`,
    `*Date:* ${formatDate(donation.paymentDate)}`,
    `*Receipt No:* ${donation.receiptNumber || "—"}`,
    `*Collected By:* ${donation.collectedByAdminName}`,
    ...(donation.pdfUrl || donation.receiptNumber
      ? [
          "",
          "📄 *Your Vargani Receipt PDF:*",
          donation.pdfUrl ||
            `${getPublicAppBaseUrl()}/api/vargani-pdf/${encodeURIComponent(donation.receiptNumber!)}.pdf`,
        ]
      : []),
    "",
    "✅ *Thank you for your contribution!* 🙏",
  ];

  if (festival.contactInfo) {
    lines.push("", `📞 *Contact:* ${festival.contactInfo}`);
  }

  return encodeURIComponent(lines.join("\n"));
}

function buildPendingReminderMessage(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData,
  societyName: string
): string {
  const lines = [
    `🏡 *${societyName}*`,
    "",
    "*⏳ Donation Reminder*",
    "",
    `Dear *${donation.residentName}*,`,
    "",
    `This is a friendly reminder that your donation for *${festival.name} ${festival.year}* is currently marked as *Pending*.`,
    "",
  ];

  if (donation.pendingReason) {
    lines.push(`Reason: ${donation.pendingReason}`, "");
  }

  lines.push(
    "We kindly request you to complete your donation at your earliest convenience.",
    "",
    "Your contribution helps make our community festivals special! 🎉",
    "",
    `_${societyName}_`,
  );

  if (festival.contactInfo) {
    lines.push("", `📞 *Contact:* ${festival.contactInfo}`);
  }

  return encodeURIComponent(lines.join("\n"));
}

// ── Send Function ────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message to a resident.
 *
 * Current implementation opens WhatsApp Web with a pre-filled message.
 * To replace with WhatsApp Business API / Twilio, update only this function.
 *
 * @param mobile - Resident's mobile number
 * @param message - The pre-encoded message text (from buildWhatsAppMessage)
 * @returns true if the message was "sent" (WhatsApp web opened), false on error
 */
export function sendWhatsApp(mobile: string, message: string): boolean {
  const cleaned = cleanMobile(mobile);

  if (cleaned.length < 10) {
    console.error(
      `[WhatsApp Service] Invalid mobile number: ${mobile} (cleaned: ${cleaned})`
    );
    return false;
  }

  try {
    // Using Indian country code by default
    const url = `https://wa.me/91${cleaned}?text=${message}`;
    window.open(url, "_blank");
    return true;
  } catch (error) {
    console.error("[WhatsApp Service] Failed to open WhatsApp:", error);
    return false;
  }
}

/**
 * Convenience function to send a donation receipt via WhatsApp.
 *
 * @param donation - Donation data
 * @param festival - Festival data
 * @returns true if WhatsApp was opened, false on error
 */
export function sendReceiptViaWhatsApp(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData
): boolean {
  const message = buildWhatsAppMessage(donation, festival, "receipt");
  return sendWhatsApp(donation.residentMobile, message);
}

/**
 * Convenience function to send a pending donation reminder via WhatsApp.
 *
 * @param donation - Donation data
 * @param festival - Festival data
 * @returns true if WhatsApp was opened, false on error
 */
export function sendPendingReminderViaWhatsApp(
  donation: WhatsAppDonationData,
  festival: WhatsAppFestivalData
): boolean {
  const message = buildWhatsAppMessage(donation, festival, "pending_reminder");
  return sendWhatsApp(donation.residentMobile, message);
}

