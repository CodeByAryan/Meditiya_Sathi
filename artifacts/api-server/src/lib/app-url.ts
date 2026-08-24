/**
 * Application URL and Endpoint Resolution (Backend)
 *
 * Ensures production URLs NEVER contain localhost, 127.0.0.1, or development ports.
 */

export function getPublicAppBaseUrl(): string {
  const isProd = process.env.NODE_ENV === "production";

  const envUrl =
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_PUBLIC_APP_URL ||
    process.env.WEB_APP_URL ||
    process.env.FRONTEND_URL;

  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    if (isProd) {
      if (
        !trimmed.includes("localhost") &&
        !trimmed.includes("127.0.0.1") &&
        !trimmed.includes(":8080") &&
        !trimmed.includes(":5173") &&
        !trimmed.includes(":3000")
      ) {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  return isProd
    ? "https://meditiya-sathi.vercel.app"
    : "http://localhost:5173";
}

/**
 * Direct public HTTPS URL for a Vargani receipt PDF
 */
export function getReceiptPdfUrl(receiptNumber: string): string {
  const baseUrl = getPublicAppBaseUrl();
  const cleanReceipt = String(receiptNumber || "").trim().replace(/\.pdf$/i, "");
  return `${baseUrl}/api/vargani-pdf/${encodeURIComponent(cleanReceipt)}.pdf`;
}

/**
 * Shareable receipt link for WhatsApp and public viewers
 */
export function getReceiptShareUrl(receiptNumber: string): string {
  return getReceiptPdfUrl(receiptNumber);
}

/**
 * Canonical scanner QR URL for T-shirt collection
 */
export function getTshirtScannerUrl(tshirtId: string | number): string {
  const baseUrl = getPublicAppBaseUrl();
  const cleanId = String(tshirtId).trim();
  return `${baseUrl}/tshirt-collection-cash/${encodeURIComponent(cleanId)}`;
}

/**
 * Direct public URL for T-shirt collection PDF pass
 */
export function getTshirtPdfUrl(collectionId: string | number): string {
  const baseUrl = getPublicAppBaseUrl();
  const cleanId = String(collectionId).trim().replace(/\.pdf$/i, "");
  return `${baseUrl}/api/tshirt-pdf/${encodeURIComponent(cleanId)}.pdf`;
}
