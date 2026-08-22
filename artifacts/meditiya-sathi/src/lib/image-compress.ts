/**
 * Utility to compress and resize images on the client before upload.
 * - Max dimension: 1200x1200px
 * - Target format: JPEG
 * - Quality: 0.82 (ideal balance between visual fidelity and small payload < 150KB)
 */
export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  sizeBytes: number;
}

export async function compressVolunteerPhoto(file: File): Promise<CompressedImageResult> {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image file (JPG, PNG, or WEBP).");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Unable to read the chosen image. Please choose another photo."));
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("Unable to process this image. Please choose another photo."));
      };

      img.onload = () => {
        try {
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          // Scale dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context is not available for image processing."));
            return;
          }

          // High quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Output format and quality
          const mimeType = "image/jpeg";
          const quality = 0.82;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Unable to compress this image. Please choose another photo."));
                return;
              }

              // Create clean, compressed File
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const compressedFile = new File([blob], `${baseName}.jpg`, {
                type: mimeType,
                lastModified: Date.now(),
              });

              const previewUrl = URL.createObjectURL(blob);

              resolve({
                file: compressedFile,
                previewUrl,
                sizeBytes: blob.size,
              });
            },
            mimeType,
            quality
          );
        } catch (err) {
          reject(new Error("Unable to process this image. Please choose another photo."));
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
