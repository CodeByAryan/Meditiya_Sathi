/**
 * Application URL and Endpoint Resolution (Backend)
 *
 * Ensures production URLs NEVER contain localhost, 127.0.0.1, or development ports.
 */

export function getPublicAppBaseUrl(): string {
  // Render may not set NODE_ENV explicitly. Treat its deployment markers as
  // production too, so a stale localhost value can never leak into a receipt.
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    Boolean(process.env.RENDER_EXTERNAL_URL);

  const envUrl =
    process.env.PDF_API_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.WEB_APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.VITE_PUBLIC_APP_URL;

  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    const isLocalUrl = /(?:localhost|127\.0\.1)(?::\d+)?/i.test(trimmed);
    const isDevelopmentPort = /:(?:3000|5173|8080)(?:$|\/)/.test(trimmed);
    if (!isProd || (!isLocalUrl && !isDevelopmentPort)) {
      return trimmed;
    }
  }

  return isProd ? "https://meditiya-sathi.onrender.com" : "http://localhost:5173";
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
