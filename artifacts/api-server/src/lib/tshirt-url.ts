export function getPublicAppBaseUrl(): string {
  const envUrl =
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_PUBLIC_APP_URL ||
    process.env.WEB_APP_URL ||
    process.env.FRONTEND_URL;

  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    if (process.env.NODE_ENV === "production") {
      // In production, NEVER use localhost or local loopback IPs
      if (
        !trimmed.includes("localhost") &&
        !trimmed.includes("127.0.0.1") &&
        !trimmed.includes(":8080") &&
        !trimmed.includes(":5173")
      ) {
        return trimmed;
      }
    } else {
      // In local development, use the configured URL
      return trimmed;
    }
  }

  return process.env.NODE_ENV === "production"
    ? "https://meditiya-sathi.vercel.app"
    : "http://localhost:5173";
}

export function getTshirtScannerUrl(tshirtId: string | number): string {
  const baseUrl = getPublicAppBaseUrl();
  const cleanId = String(tshirtId).trim();
  return `${baseUrl}/tshirt-collection-cash/${encodeURIComponent(cleanId)}`;
}
