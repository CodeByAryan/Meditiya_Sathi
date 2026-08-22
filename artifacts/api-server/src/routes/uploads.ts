import { Router, type IRouter } from "express";
import multer from "multer";
import { requireRole } from "../middlewares/requireRole";
import { cloudinary, isCloudinaryConfigured } from "../lib/cloudinary";

const router: IRouter = Router();
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("INVALID_FILE_TYPE"));
    }
  },
});

function uploadToCloudinary(buffer: Buffer, folder = "meditiya-sathi/events") {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "webp",
        transformation: [
          { width: 1600, height: 1200, crop: "limit" },
          { quality: "auto:good" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary did not return an upload result"));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

router.post("/admin/uploads/volunteer-photo", requireRole("Super Admin", "Admin"), (req, res) => {
  upload.single("image")(req, res, async (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "Image size must be less than 5 MB." });
        return;
      }
      res.status(400).json({ error: error.message || "Invalid file upload." });
      return;
    }
    if (error) {
      res.status(400).json({ error: "Please upload a JPG, PNG, or WEBP image." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Please upload a JPG, PNG, or WEBP image." });
      return;
    }

    if (!isCloudinaryConfigured) {
      // Safe base64 data URL fallback for local development without Cloudinary credentials
      const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      res.status(201).json({
        secureUrl: base64Data,
        publicId: `local-volunteer-${Date.now()}`,
        secure_url: base64Data,
        public_id: `local-volunteer-${Date.now()}`,
      });
      return;
    }

    try {
      const image = await uploadToCloudinary(req.file.buffer, "meditiya-sathi/volunteers");
      res.status(201).json({
        secureUrl: image.secure_url,
        publicId: image.public_id,
        secure_url: image.secure_url,
        public_id: image.public_id,
      });
    } catch (uploadError: any) {
      const errorMsg = uploadError?.message || String(uploadError);
      res.status(502).json({
        error: errorMsg || "Unable to upload the volunteer photo. Please try again.",
      });
    }
  });
});

router.post("/admin/uploads/event-image", requireRole("Super Admin", "Admin"), (req, res) => {
  upload.single("image")(req, res, async (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "Image size must be less than 5 MB." });
        return;
      }
      res.status(400).json({ error: error.message || "Invalid file upload." });
      return;
    }
    if (error) {
      res.status(400).json({ error: "Please upload a JPG, PNG, or WEBP image." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Please upload a JPG, PNG, or WEBP image." });
      return;
    }
    if (!isCloudinaryConfigured) {
      res.status(503).json({
        error: "Image uploads are not configured. Please set Cloudinary server credentials.",
      });
      return;
    }

    try {
      const image = await uploadToCloudinary(req.file.buffer);
      res.status(201).json({
        secureUrl: image.secure_url,
        publicId: image.public_id,
        secure_url: image.secure_url,
        public_id: image.public_id,
      });
    } catch (uploadError: any) {
      const errorMsg = uploadError?.message || String(uploadError);
      const httpCode =
        uploadError?.http_code || uploadError?.status || uploadError?.statusCode;
      const errorName = uploadError?.name || "CloudinaryUploadError";

      req.log?.error(
        {
          errorName,
          errorMsg,
          httpCode,
          cloudinaryError: uploadError,
        },
        "Cloudinary event image upload failed",
      );

      if (
        httpCode === 401 ||
        httpCode === 403 ||
        /auth|key|secret|credential|invalid/i.test(errorMsg)
      ) {
        res.status(502).json({
          error:
            "Cloudinary authentication failed. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
        });
        return;
      }

      res.status(502).json({
        error: "Unable to upload the event image. Please try again.",
      });
    }
  });
});

export default router;
