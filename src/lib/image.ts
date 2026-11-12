"use client";

/**
 * Turns almost any image the browser can open (JPG, PNG, HEIC on iPhone Safari, WebP, AVIF, BMP, huge photos)
 * into a square, 512px WebP (or JPEG) ready to upload. Small GIFs are kept as-is so they stay animated.
 */
export async function prepareAvatar(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  if (file.type === "image/gif" && file.size <= 5 * 1024 * 1024) return { blob: file, ext: "gif", type: "image/gif" };

  const bitmap = await decode(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("decode");
  ctx.imageSmoothingQuality = "high";
  // Center-crop to a square.
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);

  const webp = await toBlob(canvas, "image/webp", 0.88);
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", type: "image/webp" };
  const jpeg = await toBlob(canvas, "image/jpeg", 0.9);
  if (!jpeg) throw new Error("decode");
  return { blob: jpeg, ext: "jpg", type: "image/jpeg" };
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      /* fall back to <img>, which some browsers decode more formats with */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode"));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
