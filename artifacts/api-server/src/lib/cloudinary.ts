import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const isCloudinaryConfigured = Boolean(
  cloudName && apiKey && apiSecret
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string = "meditiya-sathi",
  options: Record<string, any> = {}
): Promise<{ secure_url: string; public_id: string }> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured");
  }

  const rawPublicId = options.public_id || `tshirt-${Date.now()}`;
  // Ensure raw/pdf files have .pdf extension in public_id so Cloudinary sets Content-Type: application/pdf
  const publicId = options.format === "pdf" && !rawPublicId.endsWith(".pdf")
    ? `${rawPublicId}.pdf`
    : rawPublicId;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: options.resource_type || "raw",
        public_id: publicId,
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        ...options,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload to Cloudinary failed"));
        } else {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );
    stream.end(buffer);
  });
}

export { cloudinary };
