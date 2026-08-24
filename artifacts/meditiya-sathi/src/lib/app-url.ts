/**
 * Frontend Application URL and Endpoint Resolution
 *
 * Ensures production URLs NEVER contain localhost, 127.0.0.1, or development ports.
 */

export function getPublicAppBaseUrl(): string {
  const isProd = Boolean(
    (typeof import.meta !== "undefined" && (import.meta as any).env?.PROD) ||
    process.env.NODE_ENV === "production"
  );

  const envUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PUBLIC_APP_URL) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.PUBLIC_APP_URL) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FRONTEND_URL) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WEB_APP_URL);

  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
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

  if (typeof window !== "undefined" && window.location.origin) {
    const origin = window.location.origin.replace(/\/+$/, "");
    if (isProd) {
      if (
        !origin.includes("localhost") &&
        !origin.includes("127.0.0.1") &&
        !origin.includes(":8080") &&
        !origin.includes(":5173") &&
        !origin.includes(":3000")
      ) {
        return origin;
      }
    } else {
      return origin;
    }
  }

  return isProd
    ? "https://meditiya-sathi.vercel.app"
    : (typeof window !== "undefined" && window.location.origin ? window.location.origin.replace(/\/+$/, "") : "http://localhost:5173");
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
