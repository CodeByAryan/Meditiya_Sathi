export function getPublicAppBaseUrl(): string {
  const envUrl =
    (import.meta as any).env?.VITE_PUBLIC_APP_URL ||
    (import.meta as any).env?.PUBLIC_APP_URL ||
    (import.meta as any).env?.VITE_FRONTEND_URL ||
    (import.meta as any).env?.VITE_WEB_APP_URL;

  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    if (!trimmed.includes("localhost") && !trimmed.includes("127.0.0.1") && !trimmed.includes(":8080") && !trimmed.includes(":5173")) {
      return trimmed;
    }
  }

  if (typeof window !== "undefined" && window.location.origin) {
    const origin = window.location.origin.replace(/\/+$/, "");
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1") && !origin.includes(":8080") && !origin.includes(":5173")) {
      return origin;
    }
  }

  return "https://meditiya-sathi.vercel.app";
}

export function getTshirtScannerUrl(tshirtId: string | number): string {
  const baseUrl = getPublicAppBaseUrl();
  const cleanId = String(tshirtId).trim();
  return `${baseUrl}/tshirt-collection-cash/${encodeURIComponent(cleanId)}`;
}
