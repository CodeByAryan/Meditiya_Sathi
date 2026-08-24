import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { VARGANI_RECEIPT_CONFIG as CONFIG } from "./vargani-receipt-config";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export interface VarganiPdfData {
  receiptNumber: string;
  donationDate: string | Date;
  name: string;
  mobile?: string | null;
  building?: string | null;
  wing?: string | null;
  flat?: string | null;
  amount: number;
  paymentMethod: string;
  festivalName?: string | null;
  festivalYear?: number | null;
  collectedBy?: string | null;
}

const clean = (value: unknown, fallback = "—"): string => {
  const text = String(value ?? "").trim();
  return text && text !== "null" && text !== "undefined" && text !== "[object Object]" ? text : fallback;
};

function underHundred(n: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];
  if (n < 20) return ones[n] || "";
  return `${tens[Math.floor(n / 10)] || ""}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
}

function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  return [
    hundreds ? `${underHundred(hundreds)} Hundred` : "",
    remainder ? underHundred(remainder) : "",
  ].filter(Boolean).join(" ");
}

export function amountInWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  const rupees = Math.floor(value + 1e-9);
  const paise = Math.round((value - rupees) * 100);
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  const result = parts.join(" ") || "Zero";
  return `Rupees ${result}${paise ? ` and ${underHundred(paise)} Paise` : ""} Only`;
}

function formatDateStr(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return "—";
  const dateObj = new Date(dateVal);
  if (Number.isNaN(dateObj.getTime())) return clean(dateVal);
  return dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function findPythonScriptPath(): string {
  const candidates = [
    path.resolve(currentDir, "pauti_generator.py"),
    path.resolve(process.cwd(), "artifacts/api-server/src/lib/pauti_generator.py"),
    path.resolve(process.cwd(), "src/lib/pauti_generator.py"),
    path.resolve(process.cwd(), "pauti_generator.py"),
  ];
  const found = candidates.find((c) => existsSync(c));
  if (!found) {
    throw new Error(`pauti_generator.py not found in candidate paths: ${candidates.join(", ")}`);
  }
  return found;
}

export async function generateVarganiPdf(data: VarganiPdfData): Promise<Buffer> {
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("Donation amount is invalid");
  }

  const scriptPath = findPythonScriptPath();
  const dateFormatted = formatDateStr(data.donationDate);
  const wordsEng = amountInWords(data.amount);

  const payload = {
    receiptNumber: clean(data.receiptNumber),
    donationDate: dateFormatted,
    name: clean(data.name),
    mobile: clean(data.mobile),
    building: clean(data.building),
    wing: clean(data.wing),
    flat: clean(data.flat),
    amount: Number(data.amount),
    amountInWords: wordsEng,
    paymentMethod: clean(data.paymentMethod, "CASH"),
    festivalName: clean(data.festivalName, "गणेश उत्सव"),
    festivalYear: data.festivalYear ? Number(data.festivalYear) : 2026,
    collectedBy: clean(data.collectedBy, CONFIG.defaultAdmin || "Admin (Authorized)"),
  };

  const payloadJson = JSON.stringify(payload);

  return new Promise<Buffer>((resolve, reject) => {
    const pythonCommands = [
      process.env.PYTHON_PATH || "",
      "python3",
      "python",
      "py",
    ].filter(Boolean);

    let lastError: Error | null = null;

    const tryCommand = (index: number) => {
      if (index >= pythonCommands.length) {
        reject(
          lastError ||
            new Error(
              "Failed to execute Python for Vargani PDF generation. Ensure Python 3 with PyMuPDF is installed."
            )
        );
        return;
      }

      const cmd = pythonCommands[index];
      const proc = spawn(cmd, [scriptPath, "--stdin"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      proc.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      proc.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

      proc.on("error", (err) => {
        lastError = err;
        tryCommand(index + 1);
      });

      proc.on("close", (code) => {
        if (code === 0 && stdoutChunks.length > 0) {
          const pdfBuffer = Buffer.concat(stdoutChunks);
          if (pdfBuffer.length > 100 && pdfBuffer.toString("utf8", 0, 4) === "%PDF") {
            resolve(pdfBuffer);
            return;
          }
        }
        const stderrText = Buffer.concat(stderrChunks).toString("utf8");
        lastError = new Error(`Python process exited with code ${code}: ${stderrText}`);
        tryCommand(index + 1);
      });

      proc.stdin.write(payloadJson);
      proc.stdin.end();
    };

    tryCommand(0);
  });
}



