import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function redact(value, token) {
  if (typeof value === "string") return token ? value.replaceAll(token, "[REDACTED]") : value;
  if (Array.isArray(value)) return value.map((item) => redact(item, token));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item, token)]));
  }
  return value;
}

loadDotEnv();
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
const pin = process.env.WHATSAPP_PHONE_NUMBER_PIN?.trim() || "";
const apiVersion = process.env.WHATSAPP_REGISTRATION_API_VERSION?.trim() || "v21.0";
const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/register`;

if (!token || !phoneNumberId || !pin) {
  console.error("Missing WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, or WHATSAPP_PHONE_NUMBER_PIN.");
  process.exit(1);
}

if (!/^\d{6}$/.test(pin)) {
  console.error("WHATSAPP_PHONE_NUMBER_PIN must be exactly 6 digits.");
  process.exit(1);
}

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
  const data = await response.json().catch(() => ({}));
  const safeData = redact(data, token);

  if (response.ok && data?.success === true) {
    console.log(`WhatsApp phone registration succeeded for ${phoneNumberId}.`);
    process.exit(0);
  }

  console.error(`WhatsApp phone registration failed (HTTP ${response.status}).`);
  console.error(JSON.stringify(safeData, null, 2));
  process.exit(1);
} catch (error) {
  console.error("WhatsApp phone registration request failed.");
  console.error(JSON.stringify(redact({ message: error?.message || String(error) }, token), null, 2));
  process.exit(1);
}
