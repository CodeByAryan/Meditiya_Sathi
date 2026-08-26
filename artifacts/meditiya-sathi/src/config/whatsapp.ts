/**
 * Mandal WhatsApp Contact Configuration
 *
 * Single source of truth for the Mandal's public WhatsApp contact information.
 * This is used strictly for visitor-to-Mandal public communication and does
 * NOT interact with backend APIs or WhatsApp Cloud API.
 */

/**
 * The Mandal's official WhatsApp contact number.
 *
 * The number format required by wa.me:
 * - Includes country code (91 for India)
 * - Digits only (no '+', spaces, dashes, or brackets)
 * - Example: "919876543210"
 *
 * Can be overridden via Vite environment variable `VITE_WHATSAPP_CONTACT_NUMBER`.
 */
export const WHATSAPP_CONTACT_NUMBER =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WHATSAPP_CONTACT_NUMBER
    ? String(import.meta.env.VITE_WHATSAPP_CONTACT_NUMBER).replace(/\D/g, "")
    : "") || "918108388000";

/**
 * Default pre-filled message when visitors start a chat with the Mandal.
 */
export const WHATSAPP_DEFAULT_MESSAGE = "Hello Meditiya Sathi, I have a query.";

/**
 * Normalizes any phone number into wa.me click-to-chat format:
 * - Digits only
 * - Adds 91 country code for 10-digit Indian numbers
 * - Handles leading zeros
 */
export function normalizeWhatsAppNumber(rawNumber: string): string {
  const digits = (rawNumber || "").replace(/\D/g, "");
  if (!digits) return WHATSAPP_CONTACT_NUMBER;

  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Generates the canonical WhatsApp click-to-chat URL.
 *
 * Format:
 * https://wa.me/<PHONE_NUMBER>?text=<ENCODED_MESSAGE>
 *
 * @param phoneNumber - Optional override for WhatsApp phone number
 * @param message - Optional override for pre-filled chat message
 * @returns Fully formed WhatsApp click-to-chat URL
 */
export function getWhatsAppClickToChatUrl(
  phoneNumber: string = WHATSAPP_CONTACT_NUMBER,
  message: string = WHATSAPP_DEFAULT_MESSAGE
): string {
  const normalizedNumber = normalizeWhatsAppNumber(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedNumber}?text=${encodedMessage}`;
}
