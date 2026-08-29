// Prompt 231: client-side thumbnail generation for captured scan frames.
// persist.ts does not generate thumbnails itself; this module is what
// supplies the real thumbBlob persist.ts uploads alongside each frame's
// full-resolution blob. computeThumbDimensions is pure and unit-tested
// directly; generateThumbnail wraps it with canvas/createImageBitmap
// (DOM-only - no jsdom in this repo, so its own behavior is exercised via
// Playwright/device matrix, not vitest).

/**
 * Scales (width, height) down so its longer edge is at most maxEdge,
 * preserving aspect ratio, rounded to whole pixels. Already-small input is
 * returned unchanged (rounded only) - this never upscales. A zero/negative
 * input (should never happen for a real captured still) falls back to a
 * square maxEdge x maxEdge box rather than producing a zero-size canvas.
 */
export function computeThumbDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) {
    return { width: maxEdge, height: maxEdge };
  }
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

type Drawable = HTMLCanvasElement | ImageBitmap;

const THUMBNAIL_MIME = 'image/jpeg';

/**
 * Downscales a captured still to a small JPEG thumbnail, entirely client
 * side (canvas + createImageBitmap; no server round trip - the resulting
 * Blob is what the caller hands to persistScan as thumbBlob). `source` can
 * be the raw captured Blob (the common case), or an already-decoded
 * HTMLCanvasElement/ImageBitmap for a caller that has already paid the
 * decode cost (e.g. QA's blobToCanvas) and does not want to decode twice.
 */
export async function generateThumbnail(
  source: Blob | Drawable,
  maxEdge = 256,
  quality = 0.7,
): Promise<Blob> {
  let drawable: Drawable;
  let ownsBitmap = false;
  if (source instanceof Blob) {
    drawable = await createImageBitmap(source);
    ownsBitmap = true;
  } else {
    drawable = source;
  }

  try {
    const { width, height } = computeThumbDimensions(drawable.width, drawable.height, maxEdge);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('scan.thumbnail: 2d context unavailable');
    ctx.drawImage(drawable, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('scan.thumbnail: toBlob returned null'))),
        THUMBNAIL_MIME,
        quality,
      );
    });
  } finally {
    if (ownsBitmap) (drawable as ImageBitmap).close();
  }
}
