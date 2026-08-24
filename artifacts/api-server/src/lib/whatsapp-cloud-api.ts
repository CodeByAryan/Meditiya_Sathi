import { logger } from "./logger";

export interface WhatsAppSendDocumentOptions {
  to: string;
  filename: string;
  pdfBuffer?: Buffer;
  pdfUrl?: string;
  caption?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  configured?: boolean;
}

/**
 * Normalizes an Indian or international phone number for WhatsApp.
 * - Strips all non-digit characters
 * - Converts 10-digit Indian numbers (e.g. 9876543210) to 919876543210
 * - Handles leading zeros (e.g. 09876543210 -> 919876543210)
 * - Removes accidental double country codes (e.g. 91919876543210 -> 919876543210)
 * - Validates length and format
 */
export function normalizePhoneNumber(raw: string | null | undefined): {
  isValid: boolean;
  normalized: string;
  error?: string;
} {
  if (!raw) {
    return { isValid: false, normalized: "", error: "Mobile number is required" };
  }

  let digits = String(raw).replace(/\D/g, "");

  if (!digits) {
    return { isValid: false, normalized: "", error: "Mobile number contains no valid digits" };
  }

  // Handle accidental double 91 prefix (e.g., 91919876543210 -> 919876543210)
  if (digits.startsWith("9191") && digits.length === 14) {
    digits = digits.slice(2);
  }

  // If 11 digits starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `91${digits.slice(1)}`;
  } else if (digits.length === 10) {
    // 10-digit Indian mobile
    digits = `91${digits}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    // Already in 91XXXXXXXXXX format
    digits = digits;
  } else if (digits.length > 12 && digits.startsWith("91")) {
    // Check if extra prefix was attached
    const last10 = digits.slice(-10);
    digits = `91${last10}`;
  }

  // Validation: Indian number should be 12 digits starting with 91
  if (digits.startsWith("91")) {
    const subscriber = digits.slice(2);
    if (subscriber.length !== 10) {
      return {
        isValid: false,
        normalized: digits,
        error: "Indian mobile number must be exactly 10 digits",
      };
    }
    return { isValid: true, normalized: digits };
  }

  // For international numbers, require 10-15 digits
  if (digits.length >= 10 && digits.length <= 15) {
    return { isValid: true, normalized: digits };
  }

  return {
    isValid: false,
    normalized: digits,
    error: "Invalid phone number length (must be 10-15 digits)",
  };
}

/**
 * Checks if WhatsApp Cloud API credentials are configured server-side.
 */
export function isWhatsAppCloudApiConfigured(): boolean {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return Boolean(token && phoneId);
}

/**
 * Sends a PDF document via WhatsApp Business Cloud API.
 * 1. Attempts direct media upload if pdfBuffer is provided
 * 2. Falls back to public link document delivery
 * 3. Never exposes secrets or access tokens in client error responses
 */
export async function sendWhatsAppDocument(
  options: WhatsAppSendDocumentOptions
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneId) {
    return {
      success: false,
      configured: false,
      error: "WhatsApp Cloud API is not configured. Please configure WhatsApp Business API credentials.",
    };
  }

  const phoneNorm = normalizePhoneNumber(options.to);
  if (!phoneNorm.isValid) {
    return {
      success: false,
      configured: true,
      error: phoneNorm.error || "Invalid mobile number for WhatsApp delivery.",
    };
  }

  const recipient = phoneNorm.normalized;
  const filename = options.filename.endsWith(".pdf")
    ? options.filename
    : `${options.filename}.pdf`;

  try {
    let mediaId: string | null = null;

    // 1. Try uploading binary buffer directly to Meta WhatsApp media endpoint if buffer is available
    if (options.pdfBuffer && options.pdfBuffer.length > 0) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(options.pdfBuffer)], { type: "application/pdf" });
        formData.append("file", blob, filename);
        formData.append("type", "application/pdf");
        formData.append("messaging_product", "whatsapp");

        const uploadRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneId}/media`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (uploadRes.ok) {
          const uploadData = (await uploadRes.json()) as any;
          if (uploadData?.id) {
            mediaId = uploadData.id;
          }
        } else {
          const errText = await uploadRes.text();
          logger.warn(
            { status: uploadRes.status, err: errText },
            "[WhatsApp Cloud API] Media upload failed, falling back to link document payload"
          );
        }
      } catch (uploadErr) {
        logger.warn(
          { err: uploadErr },
          "[WhatsApp Cloud API] Media upload exception, falling back to link"
        );
      }
    }

    // 2. Build document payload: use media ID if uploaded, otherwise use HTTPS link
    const documentPayload: Record<string, any> = {
      filename,
    };

    if (mediaId) {
      documentPayload.id = mediaId;
    } else if (options.pdfUrl && options.pdfUrl.startsWith("https://")) {
      documentPayload.link = options.pdfUrl;
    } else if (options.pdfUrl && !options.pdfUrl.includes("localhost") && !options.pdfUrl.includes("127.0.0.1")) {
      documentPayload.link = options.pdfUrl;
    } else {
      if (!mediaId) {
        return {
          success: false,
          configured: true,
          error: "Unable to attach PDF document. Both media upload and valid public HTTPS link were unavailable.",
        };
      }
    }

    if (options.caption) {
      documentPayload.caption = options.caption.slice(0, 1024);
    }

    const messageBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "document",
      document: documentPayload,
    };

    const sendRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageBody),
      }
    );

    const data = (await sendRes.json()) as any;

    if (!sendRes.ok) {
      const errorObj = data?.error;
      logger.error(
        { status: sendRes.status, metaError: errorObj },
        "[WhatsApp Cloud API] Meta API returned error"
      );

      let userMsg = "Failed to send WhatsApp document via Meta Cloud API.";
      if (errorObj?.code === 190) {
        userMsg = "WhatsApp access token is invalid or expired. Please update WHATSAPP_ACCESS_TOKEN.";
      } else if (errorObj?.code === 100) {
        userMsg = errorObj.message || "Invalid WhatsApp request parameter.";
      } else if (errorObj?.message) {
        userMsg = errorObj.message;
      }

      return {
        success: false,
        configured: true,
        error: userMsg,
      };
    }

    const messageId = data?.messages?.[0]?.id || "sent";
    logger.info(
      { messageId, recipient, filename },
      "[WhatsApp Cloud API] PDF document sent successfully"
    );

    return {
      success: true,
      configured: true,
      messageId,
    };
  } catch (err: any) {
    logger.error({ err }, "[WhatsApp Cloud API] Unexpected error sending document");
    return {
      success: false,
      configured: true,
      error: err?.message || "Internal network error communicating with WhatsApp Cloud API.",
    };
  }
}

/**
 * Sends a text message via WhatsApp Business Cloud API.
 */
export async function sendWhatsAppTextMessage(options: {
  to: string;
  message: string;
}): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneId) {
    return {
      success: false,
      configured: false,
      error: "WhatsApp Cloud API is not configured. Please configure WhatsApp Business API credentials.",
    };
  }

  const phoneNorm = normalizePhoneNumber(options.to);
  if (!phoneNorm.isValid) {
    return {
      success: false,
      configured: true,
      error: phoneNorm.error || "Invalid mobile number for WhatsApp delivery.",
    };
  }

  try {
    const sendRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneNorm.normalized,
          type: "text",
          text: {
            preview_url: true,
            body: options.message,
          },
        }),
      }
    );

    const data = (await sendRes.json()) as any;
    if (!sendRes.ok) {
      const errorObj = data?.error;
      logger.error({ status: sendRes.status, metaError: errorObj }, "[WhatsApp Cloud API] Text message failed");
      return {
        success: false,
        configured: true,
        error: errorObj?.message || "Failed to send WhatsApp message.",
      };
    }

    return {
      success: true,
      configured: true,
      messageId: data?.messages?.[0]?.id || "sent",
    };
  } catch (err: any) {
    logger.error({ err }, "[WhatsApp Cloud API] Text message network exception");
    return {
      success: false,
      configured: true,
      error: err?.message || "Network error communicating with WhatsApp API.",
    };
  }
}

/**
 * Builds the standard WhatsApp caption/message for a donation receipt.
 */
export function buildVarganiCaption(data: {
  receiptNumber: string;
  festivalName?: string | null;
  donorName?: string | null;
  amount: number;
  pdfUrl?: string | null;
}): string {
  const fest = data.festivalName || "गणेश उत्सव";
  const lines = [
    "नमस्कार 🙏",
    "",
    "मेड़तिया मित्र मंडळ कडून आपल्या देणगीची पावती येथे उपलब्ध आहे.",
    "",
    `Receipt No: ${data.receiptNumber}`,
    `Festival: ${fest}`,
    `Donation Amount: ₹${data.amount.toLocaleString("en-IN")}`,
  ];

  if (data.donorName) {
    lines.push(`Donor Name: ${data.donorName}`);
  }

  if (data.pdfUrl) {
    lines.push("", "पावती:", data.pdfUrl);
  }

  lines.push("", "धन्यवाद 🙏", "मेड़तिया मित्र मंडळ");
  return lines.join("\n");
}

