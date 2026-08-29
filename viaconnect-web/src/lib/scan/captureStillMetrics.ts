import { computeFrameMetrics, type FrameMetrics } from './frameMetrics';

/**
 * Prompt 231: DOM-side half of the weak-QA metrics pipeline. Decodes the
 * captured JPEG blob, downscales it onto a small offscreen canvas (blur and
 * exposure math do not need full resolution), and hands the raw pixels to
 * the pure computeFrameMetrics(). Not unit-testable without jsdom/canvas;
 * covered by Playwright and the device matrix, not vitest.
 */
const METRICS_MAX_DIM = 320; // downscale target; large enough for Laplacian variance to read as sharp/blurry, small enough to stay fast on-device

export async function computeWeakQaInputFromBlob(blob: Blob): Promise<FrameMetrics> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, METRICS_MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const { data } = ctx.getImageData(0, 0, width, height);
    return computeFrameMetrics(data, width, height);
  } finally {
    bitmap.close();
  }
}

/**
 * Prompt 231 Task 11b: decodes the captured JPEG blob onto a full
 * resolution offscreen canvas for the pose landmarker shot QA
 * (usePoseLandmarker.detectStill). Kept separate from
 * computeWeakQaInputFromBlob above: that one intentionally downscales for
 * blur/exposure math, this one must not, since MediaPipe landmark accuracy
 * degrades at 320px. Same not-unit-testable-without-a-DOM caveat as the
 * rest of this file.
 */
export async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}
