// Client-side photo processing: re-encode via canvas to strip EXIF and resize.
// No external dependencies; uses createImageBitmap + OffscreenCanvas when available.

export interface ProcessedPair {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

const FULL_MAX = 1080;
const THUMB_MAX = 300;
const JPEG_QUALITY_FULL  = 0.85;
const JPEG_QUALITY_THUMB = 0.70;

async function loadBitmap(file: File | Blob): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

function computeTarget(w: number, h: number, maxDim: number): { w: number; h: number } {
  if (w <= maxDim && h <= maxDim) return { w, h };
  const scale = maxDim / Math.max(w, h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

async function renderToBlob(
  bitmap: ImageBitmap,
  maxDim: number,
  quality: number,
): Promise<{ blob: Blob; w: number; h: number }> {
  const t = computeTarget(bitmap.width, bitmap.height, maxDim);
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(t.w, t.h)
      : Object.assign(document.createElement('canvas'), { width: t.w, height: t.h });

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, t.w, t.h);

  if ('convertToBlob' in canvas) {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: 'image/jpeg', quality });
    return { blob, w: t.w, h: t.h };
  }
  const blob = await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      'image/jpeg',
      quality,
    );
  });
  return { blob, w: t.w, h: t.h };
}

export async function processPhoto(file: File): Promise<ProcessedPair> {
  const bitmap = await loadBitmap(file);
  try {
    const full  = await renderToBlob(bitmap, FULL_MAX,  JPEG_QUALITY_FULL);
    const thumb = await renderToBlob(bitmap, THUMB_MAX, JPEG_QUALITY_THUMB);
    return { full: full.blob, thumb: thumb.blob, width: full.w, height: full.h };
  } finally {
    if ('close' in bitmap) bitmap.close();
  }
}
