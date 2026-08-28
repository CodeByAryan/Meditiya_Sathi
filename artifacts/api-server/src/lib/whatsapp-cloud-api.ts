import { logger } from "./logger";

export interface WhatsAppSendDocumentOptions {
  to: string;
  filename: string;
  pdfBuffer?: Buffer;
  /** Deprecated compatibility field; binary pdfBuffer is required for receipts. */
  pdfUrl?: string;
  caption?: string;
  donationId?: number | string;
}

export interface MetaErrorPayload {
  code?: number;
  subcode?: number;
  error_subcode?: number;
  type?: string;
  message?: string;
  error_data?: any;
  fbtrace_id?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  message?: string;
  code?: string;
  metaError?: MetaErrorPayload;
  configured?: boolean;
  httpStatus?: number;
  stage?: "configuration" | "recipient_validation" | "media_upload" | "message_send";
}

/**
 * Safely masks a phone number for backend logging (e.g., "9189****1297").
 */
export function maskPhoneNumber(raw: string | null | undefined): string {
  if (!raw) return "***";
  const str = String(raw).trim();
  if (str.length <= 4) return "***";
  if (str.length <= 8) return `${str.slice(0, 2)}****${str.slice(-2)}`;
  return `${str.slice(0, 4)}****${str.slice(-4)}`;
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
 * Returns WhatsApp Cloud API configuration loaded from environment variables.
 */
export function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";
  // WHATSAPP_PHONE_NUMBER_ID is deliberately separate from the WABA ID. The
  // former is the Graph API node used for both /media and /messages.
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
  const businessAccountId =
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || process.env.WABA_ID?.trim() || "";
  let apiVersion =
    process.env.WHATSAPP_API_VERSION?.trim() || process.env.META_GRAPH_API_VERSION?.trim() || "v26.0";
  if (!apiVersion.startsWith("v")) {
    apiVersion = `v${apiVersion}`;
  }

  const isConfigured = Boolean(token && phoneId && businessAccountId && apiVersion);

  return {
    token,
    phoneId,
    businessAccountId,
    apiVersion,
    isConfigured,
  };
}

/**
 * Checks if WhatsApp Cloud API credentials are configured server-side.
 */
export function getWhatsAppConfigurationStatus() {
  const config = getWhatsAppConfig();
  return {
    configured: config.isConfigured,
    tokenConfigured: Boolean(config.token),
    phoneNumberIdConfigured: Boolean(config.phoneId),
    businessAccountIdConfigured: Boolean(config.businessAccountId),
    apiVersionConfigured: Boolean(config.apiVersion),
    phoneNumberId: config.phoneId,
    businessAccountId: config.businessAccountId,
    apiVersion: config.apiVersion,
  };
}

export function isWhatsAppCloudApiConfigured(): boolean {
  return getWhatsAppConfig().isConfigured;
}

function redactToken(value: unknown, token = ""): unknown {
  return typeof value === "string" && token ? value.replaceAll(token, "[REDACTED]") : value;
}

function metaErrorDetails(errorObj: any, token = ""): MetaErrorPayload {
  return {
    code: errorObj?.code,
    subcode: errorObj?.error_subcode,
    error_subcode: errorObj?.error_subcode,
    type: errorObj?.type,
    message: redactToken(errorObj?.message, token) as string | undefined,
    fbtrace_id: errorObj?.fbtrace_id,
  };
}

function metaResponseMessage(errorObj: any, classifiedMessage: string, token = ""): string {
  const message = typeof errorObj?.message === "string" && errorObj.message.trim()
    ? errorObj.message.trim()
    : classifiedMessage;
  return redactToken(message, token) as string;
}

function getMissingConfiguration(config: ReturnType<typeof getWhatsAppConfig>): string[] {
  const missing: string[] = [];
  if (!config.token) missing.push("WHATSAPP_ACCESS_TOKEN");
  if (!config.phoneId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  if (!config.businessAccountId) missing.push("WHATSAPP_BUSINESS_ACCOUNT_ID");
  if (!config.apiVersion) missing.push("META_GRAPH_API_VERSION");
  return missing;
}

function safeMetaResponse(value: unknown, token: string): unknown {
  if (typeof value === "string") return redactToken(value, token);
  if (Array.isArray(value)) return value.map((item) => safeMetaResponse(item, token));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, safeMetaResponse(item, token)]));
  }
  return value;
}

async function uploadWhatsAppMedia(
  uploadUrl: string,
  token: string,
  pdfBuffer: Buffer,
  filename: string,
): Promise<{ response: Response; data: any }> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
  formData.append("file", blob, filename);
  formData.append("messaging_product", "whatsapp");

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function registerWhatsAppPhoneNumber(
  registerUrl: string,
  token: string,
  pin: string,
): Promise<{ response: Response; data: any }> {
  const response = await fetch(registerUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function diagnoseWhatsAppConfiguration(): Promise<WhatsAppSendResult & { details?: any }> {
  const config = getWhatsAppConfig();
  const missing = getMissingConfiguration(config);
  const safeConfiguration = {
    tokenConfigured: Boolean(config.token),
    phoneNumberIdConfigured: Boolean(config.phoneId),
    businessAccountIdConfigured: Boolean(config.businessAccountId),
    apiVersionConfigured: Boolean(config.apiVersion),
    phoneNumberId: config.phoneId || undefined,
    businessAccountId: config.businessAccountId || undefined,
    apiVersion: config.apiVersion || undefined,
  };
  if (missing.length) {
    logger.error({ missing }, "WhatsApp Cloud API configuration is incomplete");
    return { success: false, configured: false, code: "CONFIG_ERROR", error: `Missing WhatsApp configuration: ${missing.join(", ")}`, message: `Missing WhatsApp configuration: ${missing.join(", ")}`, details: safeConfiguration };
  }
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneId}?fields=id,display_phone_number,verified_name,whatsapp_business_account`;
  try {
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${config.token}` } });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorObj = data?.error || {};
      const classified = classifyMetaError(errorObj, "send", config.phoneId);
      logger.error({ endpoint, httpStatus: response.status, metaErrorCode: errorObj.code, metaErrorType: errorObj.type, metaErrorMessage: redactToken(errorObj.message, config.token), metaErrorSubcode: errorObj.error_subcode }, "WhatsApp configuration diagnostic failed");
      return { success: false, configured: true, code: classified.code, httpStatus: response.status, error: metaResponseMessage(errorObj, classified.message, config.token), message: metaResponseMessage(errorObj, classified.message, config.token), metaError: metaErrorDetails(errorObj, config.token), details: safeConfiguration };
    }
    const accountId = data?.whatsapp_business_account?.id;
    if (accountId && accountId !== config.businessAccountId) {
      return { success: false, configured: true, code: "WRONG_BUSINESS_ACCOUNT", error: "Configured Phone Number ID belongs to a different WhatsApp Business Account.", message: "Configured Phone Number ID belongs to a different WhatsApp Business Account.", details: { ...safeConfiguration, actualBusinessAccountId: accountId } };
    }
    return { success: true, configured: true, message: "WhatsApp Phone Number ID and token are accessible.", details: { ...safeConfiguration, wabaMatches: true, businessAccountId: accountId || config.businessAccountId } };
  } catch (err: any) {
    return { success: false, configured: true, code: "NETWORK_ERROR", error: err?.message || "Unable to verify WhatsApp configuration.", message: err?.message || "Unable to verify WhatsApp configuration." };
  }
}

/**
 * Classifies Meta Graph API errors into structured, safe error codes and human-readable messages.
 * Never leaks access tokens, secrets, or raw internal credentials.
 */
export function classifyMetaError(
  errorObj: any,
  context: "upload" | "send" | "text" = "send",
  phoneId?: string
): { code: string; message: string; subcode?: number } {
  const code = errorObj?.code;
  const subcode = errorObj?.error_subcode;
  const rawMsg = errorObj?.message || "";

  // 1. Invalid or expired token
  if (code === 190) {
    return {
      code: "INVALID_ACCESS_TOKEN",
      message: "WhatsApp access token is invalid or expired. Please update the WHATSAPP_ACCESS_TOKEN credential.",
      subcode,
    };
  }

  // 2. Missing permissions / Asset not assigned in Meta Business Manager (code 100, subcode 33)
  if (
    subcode === 33 ||
    /does not exist|missing permissions|cannot be loaded due to missing permissions|Object with ID/i.test(rawMsg)
  ) {
    return {
      code: "PERMISSION_OR_ASSET_UNASSIGNED",
      message: phoneId
        ? `WhatsApp Phone Number ID (${phoneId}) is not accessible. Please ensure the System User has Full Control of the WhatsApp Account asset in Meta Business Suite.`
        : "WhatsApp Phone Number ID is not accessible. Please ensure the System User has Full Control of the WhatsApp Account asset in Meta Business Suite.",
      subcode,
    };
  }

  // 3. Invalid Phone Number ID
  if (code === 100 && /phone.?number.?id|phone number not found/i.test(rawMsg)) {
    return {
      code: "INVALID_PHONE_NUMBER_ID",
      message: "The configured WhatsApp Business Phone Number ID is invalid.",
      subcode,
    };
  }

  // 4. Invalid recipient / phone number
  if (
    code === 131000 ||
    code === 131030 ||
    (code === 100 && /recipient|phone number/i.test(rawMsg))
  ) {
    return {
      code: "INVALID_RECIPIENT",
      message: "The donor's mobile number is not valid for WhatsApp delivery.",
      subcode,
    };
  }

  // 5. Recipient not on WhatsApp
  if (
    code === 131026 ||
    /not on WhatsApp|no WhatsApp account/i.test(rawMsg)
  ) {
    return {
      code: "RECIPIENT_NOT_ON_WHATSAPP",
      message: "This donor mobile number does not have an active WhatsApp account.",
      subcode,
    };
  }

  // 6. Template required / Outside 24-hour customer service window
  if (
    code === 131047 ||
    /24.?hour|customer.?service window|template/i.test(rawMsg)
  ) {
    return {
      code: "TEMPLATE_REQUIRED",
      message: "An approved WhatsApp template is required because the 24-hour customer-service window is closed.",
      subcode,
    };
  }

  // 7. Media error
  if (
    code === 131051 ||
    code === 131052 ||
    code === 131053 ||
    /media/i.test(rawMsg) ||
    context === "upload"
  ) {
    return {
      code: "MEDIA_UPLOAD_FAILED",
      message: rawMsg
        ? `WhatsApp media upload failed: ${rawMsg}`
        : "Failed to upload receipt PDF to WhatsApp media server.",
      subcode,
    };
  }

  // 8. Rate limit
  if (
    code === 130429 ||
    code === 131048 ||
    code === 80007 ||
    code === 4 ||
    /rate limit|spam/i.test(rawMsg)
  ) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      message: "WhatsApp API rate limit reached. Please try again in a few minutes.",
      subcode,
    };
  }

  // 9. Missing scopes / permissions
  if (code === 200 || code === 10 || /permission|scope/i.test(rawMsg)) {
    return {
      code: "MISSING_PERMISSIONS",
      message: "WhatsApp access token lacks required permissions (whatsapp_business_messaging, whatsapp_business_management).",
      subcode,
    };
  }

  // Generic fallback
  return {
    code: "META_API_ERROR",
    message: rawMsg
      ? `WhatsApp Cloud API error: ${rawMsg}${code ? ` (Code: ${code}${subcode ? `, Subcode: ${subcode}` : ""})` : ""}`
      : "WhatsApp Cloud API request failed.",
    subcode,
  };
}

/**
 * Sends a PDF document via WhatsApp Business Cloud API.
 * Uploads the freshly generated PDF as WhatsApp media and sends it by media ID.
 * Public links are deliberately not used: the receipt must be the generated binary.
 */
export async function sendWhatsAppDocument(
  options: WhatsAppSendDocumentOptions
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  const missingConfiguration = getMissingConfiguration(config);
  logger.info({
    "WHATSAPP_PHONE_NUMBER_ID configured": Boolean(config.phoneId),
    "WHATSAPP_BUSINESS_ACCOUNT_ID configured": Boolean(config.businessAccountId),
    "WHATSAPP_API_VERSION configured": Boolean(config.apiVersion),
    "WHATSAPP_ACCESS_TOKEN configured": Boolean(config.token),
    donationId: options.donationId,
  }, "WhatsApp Cloud API configuration status before request");

  if (!config.isConfigured) {
    const message = `Missing WhatsApp configuration: ${missingConfiguration.join(", ")}`;
    logger.error({ missing: getMissingConfiguration(config) }, "WhatsApp Cloud API configuration is incomplete");
    return { success: false, configured: false, code: "CONFIG_ERROR", stage: "configuration", error: message, message };
  }

  const phoneNorm = normalizePhoneNumber(options.to);
  if (!phoneNorm.isValid) {
    return {
      success: false,
      configured: true,
      code: "INVALID_RECIPIENT",
      stage: "recipient_validation",
      error: phoneNorm.error || "Invalid mobile number for WhatsApp delivery.",
      message: phoneNorm.error || "Invalid mobile number for WhatsApp delivery.",
    };
  }

  const recipient = phoneNorm.normalized;
  const maskedPhone = maskPhoneNumber(recipient);
  const filename = options.filename.endsWith(".pdf")
    ? options.filename
    : `${options.filename}.pdf`;

  const { token, phoneId, apiVersion } = config;

  try {
    let mediaId: string | null = null;

    // Step 8: Upload the binary PDF directly to /{PHONE_NUMBER_ID}/media
    if (options.pdfBuffer && options.pdfBuffer.length > 0) {
      const uploadUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/media`;

      try {
        let { response: uploadRes, data: uploadData } = await uploadWhatsAppMedia(
          uploadUrl,
          token,
          options.pdfBuffer,
          filename,
        );

        // Meta error 133010 means this Cloud API phone node is not registered.
        // Registration is retried once only when the server has the phone's
        // existing two-step verification PIN; no PIN is ever logged or returned.
        if (!uploadRes.ok && uploadData?.error?.code === 133010) {
          const registrationPin = process.env.WHATSAPP_PHONE_NUMBER_PIN?.trim() || "";
          const registerUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/register`;
          if (registrationPin) {
            logger.warn({ donationId: options.donationId, phoneId, endpoint: registerUrl }, "WhatsApp phone registration required; attempting registration");
            const registration = await registerWhatsAppPhoneNumber(registerUrl, token, registrationPin);
            const registrationError = registration.data?.error;
            if (!registration.response.ok) {
              logger.error({ donationId: options.donationId, phoneId, endpoint: registerUrl, httpStatus: registration.response.status, metaErrorResponse: safeMetaResponse(registration.data, token) }, "WhatsApp phone registration failed");
            } else {
              logger.info({ donationId: options.donationId, phoneId, endpoint: registerUrl }, "WhatsApp phone registration succeeded; retrying media upload");
              ({ response: uploadRes, data: uploadData } = await uploadWhatsAppMedia(uploadUrl, token, options.pdfBuffer, filename));
            }
            if (registrationError && !registration.response.ok) {
              uploadData = registration.data;
            }
          } else {
            logger.error({ donationId: options.donationId, phoneId, endpoint: uploadUrl, metaErrorResponse: safeMetaResponse(uploadData, token), registrationRequired: true, registrationPinConfigured: false }, "WhatsApp phone is not registered; registration PIN is not configured");
          }
        }

        if (uploadRes.ok && uploadData?.id) {
          mediaId = uploadData.id;
          logger.info(
            {
              donationId: options.donationId,
              recipient: maskedPhone,
              phoneId,
              mediaId,
              filename,
            },
            "[WhatsApp Cloud API] Media upload successful"
          );
        } else {
          const errorObj = uploadData?.error || {};
          const classified = classifyMetaError(errorObj, "upload", phoneId);

          logger.error(
            {
              donationId: options.donationId,
              recipient: maskedPhone,
              phoneId,
              endpoint: uploadUrl,
              httpStatus: uploadRes.status,
              metaErrorCode: errorObj.code,
              metaErrorSubcode: errorObj.error_subcode,
              metaErrorType: errorObj.type,
              metaErrorMessage: redactToken(errorObj.message, token),
              fbtraceId: errorObj.fbtrace_id,
              metaErrorResponse: safeMetaResponse(uploadData, token),
            },
            "[WhatsApp Cloud API] Media upload failed"
          );

          return {
            success: false,
            configured: true,
            code: classified.code,
            stage: "media_upload",
            error: metaResponseMessage(errorObj, classified.message, config.token),
            message: metaResponseMessage(errorObj, classified.message, config.token),
            httpStatus: uploadRes.status,
            metaError: metaErrorDetails(errorObj, config.token),
          };
        }
      } catch (uploadErr: any) {
        logger.error(
          {
            err: uploadErr?.message || uploadErr,
            donationId: options.donationId,
            recipient: maskedPhone,
            phoneId,
            endpoint: uploadUrl,
          },
          "[WhatsApp Cloud API] Media upload network exception"
        );
        return {
          success: false,
          configured: true,
          code: "MEDIA_NETWORK_ERROR",
          stage: "media_upload",
          error: "Unable to upload receipt PDF to WhatsApp media server.",
          message: "Unable to upload receipt PDF to WhatsApp media server.",
        };
      }
    }

    if (!mediaId) {
      return {
        success: false,
        configured: true,
        code: "MEDIA_ATTACH_ERROR",
        stage: "media_upload",
        error: "Unable to attach generated PDF receipt to WhatsApp.",
        message: "Unable to attach generated PDF receipt to WhatsApp.",
      };
    }

    // Step 9: Send the document message via /{PHONE_NUMBER_ID}/messages
    const sendUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
    const documentPayload: Record<string, any> = {
      filename,
      id: mediaId,
    };

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

    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageBody),
    });

    let sendData: any = null;
    try {
      sendData = await sendRes.json();
    } catch {
      // Non-JSON response
    }

    if (!sendRes.ok) {
      const errorObj = sendData?.error || {};
      const classified = classifyMetaError(errorObj, "send", phoneId);

      logger.error(
        {
          donationId: options.donationId,
          recipient: maskedPhone,
          phoneId,
          endpoint: sendUrl,
          httpStatus: sendRes.status,
          metaErrorCode: errorObj.code,
          metaErrorSubcode: errorObj.error_subcode,
          metaErrorType: errorObj.type,
          metaErrorMessage: errorObj.message,
          metaErrorData: errorObj.error_data,
          fbtraceId: errorObj.fbtrace_id,
        },
        "[WhatsApp Cloud API] Send message failed"
      );

      return {
        success: false,
        configured: true,
        code: classified.code,
        stage: "message_send",
        error: metaResponseMessage(errorObj, classified.message, config.token),
        message: metaResponseMessage(errorObj, classified.message, config.token),
        httpStatus: sendRes.status,
        metaError: metaErrorDetails(errorObj, config.token),
      };
    }

    const messageId = sendData?.messages?.[0]?.id || "sent";
    logger.info(
      {
        donationId: options.donationId,
        recipient: maskedPhone,
        phoneId,
        messageId,
        filename,
      },
      "[WhatsApp Cloud API] PDF document sent successfully"
    );

    return {
      success: true,
      configured: true,
      messageId,
      message: "WhatsApp receipt sent successfully.",
    };
  } catch (err: any) {
    logger.error(
      {
        err: err?.message || err,
        donationId: options.donationId,
        recipient: maskedPhone,
        phoneId,
      },
      "[WhatsApp Cloud API] Unexpected error sending document"
    );
    return {
      success: false,
      configured: true,
      code: "NETWORK_ERROR",
      error: "Unable to communicate with WhatsApp Business API. Please try again.",
      message: "Unable to communicate with WhatsApp Business API. Please try again.",
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
  const config = getWhatsAppConfig();

  if (!config.isConfigured) {
    const message = `Missing WhatsApp configuration: ${getMissingConfiguration(config).join(", ")}`;
    logger.error({ missing: getMissingConfiguration(config) }, "WhatsApp Cloud API configuration is incomplete");
    return { success: false, configured: false, code: "CONFIG_ERROR", stage: "configuration", error: message, message };
  }

  const phoneNorm = normalizePhoneNumber(options.to);
  if (!phoneNorm.isValid) {
    return {
      success: false,
      configured: true,
      code: "INVALID_RECIPIENT",
      stage: "recipient_validation",
      error: phoneNorm.error || "Invalid mobile number for WhatsApp delivery.",
      message: phoneNorm.error || "Invalid mobile number for WhatsApp delivery.",
    };
  }

  const { token, phoneId, apiVersion } = config;
  const recipient = phoneNorm.normalized;
  const maskedPhone = maskPhoneNumber(recipient);
  const sendUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;

  try {
    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: true,
          body: options.message,
        },
      }),
    });

    let data: any = null;
    try {
      data = await sendRes.json();
    } catch {
      //
    }

    if (!sendRes.ok) {
      const errorObj = data?.error || {};
      const classified = classifyMetaError(errorObj, "text", phoneId);

      logger.error(
        {
          recipient: maskedPhone,
          phoneId,
          endpoint: sendUrl,
          httpStatus: sendRes.status,
          metaErrorCode: errorObj.code,
          metaErrorSubcode: errorObj.error_subcode,
          metaErrorType: errorObj.type,
          metaErrorMessage: errorObj.message,
          metaErrorData: errorObj.error_data,
          fbtraceId: errorObj.fbtrace_id,
        },
        "[WhatsApp Cloud API] Text message failed"
      );

      return {
        success: false,
        configured: true,
        code: classified.code,
        error: classified.message,
        message: classified.message,
        metaError: {
          code: errorObj.code,
          subcode: errorObj.error_subcode,
          type: errorObj.type,
          message: errorObj.message,
          error_data: errorObj.error_data,
          fbtrace_id: errorObj.fbtrace_id,
        },
      };
    }

    return {
      success: true,
      configured: true,
      messageId: data?.messages?.[0]?.id || "sent",
      message: "WhatsApp text message sent successfully.",
    };
  } catch (err: any) {
    logger.error(
      { err: err?.message || err, recipient: maskedPhone, phoneId },
      "[WhatsApp Cloud API] Text message network exception"
    );
    return {
      success: false,
      configured: true,
      code: "NETWORK_ERROR",
      error: err?.message || "Network error communicating with WhatsApp API.",
      message: err?.message || "Network error communicating with WhatsApp API.",
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
  const fest = data.festivalName || "उत्सव";
  const lines = [
    "🙏 नमस्कार!",
    "",
    "आपली देणगी पावती जोडलेली आहे.",
    "",
    `गणपती उत्सव / Festival: ${fest} साठी आपल्या मौल्यवान योगदानाबद्दल मेड़तिया मित्र मंडळातर्फे मनःपूर्वक धन्यवाद.`,
    `Receipt No: ${data.receiptNumber}`,
    `Donation Amount: ₹${data.amount.toLocaleString("en-IN")}`,
  ];

  if (data.donorName) {
    lines.push(`Donor Name: ${data.donorName}`);
  }

  if (data.pdfUrl) {
    lines.push(`Receipt Link: ${data.pdfUrl}`);
  }

  lines.push("", "धन्यवाद 🙏", "मेड़तिया मित्र मंडळ");
  return lines.join("\n");
}


