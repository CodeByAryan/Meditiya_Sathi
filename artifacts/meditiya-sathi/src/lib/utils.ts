import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Get the base API URL for backend calls.
 * Reads VITE_API_URL environment variable, falls back to the Render deployment URL.
 * All admin pages must use this to avoid 404s in production (Vercel → Render).
 */
export function getApiUrl(): string {
  // In browser: import.meta.env.VITE_API_URL
  // In test/SSR: process.env.VITE_API_URL
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");
  }
  return "https://meditiya-sathi.onrender.com";
}
