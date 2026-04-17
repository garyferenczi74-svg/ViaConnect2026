'use client';

// Silhouette extraction pipeline (client-side only).
// Uses MediaPipe Selfie Segmentation via @tensorflow-models/body-segmentation
// to produce a binary body mask, then traces the contour. The mask + landmarks
// from landmarkDetector together give us geometric measurements without ever
// sending the photo off device.

import type { Point2D, PoseSilhouette, LandmarkMap, PoseId } from './types';

// Lazy-load tf and body-segmentation so the SSR bundle stays lean.
let modelPromise: Promise<{
  tf: typeof import('@tensorflow/tfjs');
  bodySeg: typeof import('@tensorflow-models/body-segmentation');
  segmenter: import('@tensorflow-models/body-segmentation').BodySegmenter;
}> | null = null;

async function getSegmenter() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await import('@tensorflow/tfjs-backend-webgl').catch(() => {});
      await tf.ready();
      const bodySeg = await import('@tensorflow-models/body-segmentation');
      const segmenter = await bodySeg.createSegmenter(
        bodySeg.SupportedModels.MediaPipeSelfieSegmentation,
        { runtime: 'tfjs', modelType: 'general' } as never,
      );
      return { tf, bodySeg, segmenter };
    })();
  }
  return modelPromise;
}

/** Extract silhouette + landmarks from a single photo. */
export async function processSilhouette(params: {
  blob: Blob;
  poseId: PoseId;
  userHeightCm: number | null;
  landmarks: LandmarkMap;
}): Promise<PoseSilhouette> {
  const { blob, poseId, userHeightCm, landmarks } = params;
  const bitmap = await createImageBitmap(blob);
  const { segmenter, bodySeg } = await getSegmenter();
  const canvas = offscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.drawImage(bitmap, 0, 0);

  const segmentation = await segmenter.segmentPeople(canvas as unknown as HTMLCanvasElement, {
    multiSegmentation: false,
    segmentBodyParts: false,
  });

  const maskImage = await bodySeg.toBinaryMask(
    segmentation,
    { r: 0, g: 0, b: 0, a: 0 },
    { r: 255, g: 255, b: 255, a: 255 },
    false,
    0.5,
  );

  const contour = extractContour(maskImage, bitmap.width, bitmap.height);
  const scale = computeScale(landmarks, userHeightCm, bitmap.height);

  if ('close' in bitmap) bitmap.close();

  return {
    poseId,
    imageWidth: bitmap.width,
    imageHeight: bitmap.height,
    contour,
    landmarks,
    scaleCmPerPx: scale,
    maskDimensions: { width: bitmap.width, height: bitmap.height },
    qualityScore: 0,
    qualityIssues: [],
  };
}

function offscreenCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** March-squares-lite contour trace: walks perimeter of the binary mask
 *  and returns a downsampled list of boundary points. */
function extractContour(mask: ImageData, width: number, height: number): Point2D[] {
  const data = mask.data;
  const inside = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return data[(y * width + x) * 4] > 127; // R channel
  };
  // Collect boundary cells: inside pixels with at least one outside neighbour
  const points: Point2D[] = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (!inside(x, y)) continue;
      if (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1)) {
        points.push({ x, y });
      }
    }
  }
  return downsample(points, 600);
}

function downsample(points: Point2D[], maxN: number): Point2D[] {
  if (points.length <= maxN) return points;
  const stride = Math.ceil(points.length / maxN);
  const out: Point2D[] = [];
  for (let i = 0; i < points.length; i += stride) out.push(points[i]);
  return out;
}

function computeScale(
  landmarks: LandmarkMap,
  heightCm: number | null,
  imageHeight: number,
): number | null {
  if (!heightCm || heightCm <= 0) return null;
  const topY = landmarks.nose?.y;
  const ankleLY = landmarks.left_ankle?.y;
  const ankleRY = landmarks.right_ankle?.y;
  const bottomY =
    ankleLY !== undefined && ankleRY !== undefined
      ? (ankleLY + ankleRY) / 2
      : (ankleLY ?? ankleRY);
  if (topY === undefined || bottomY === undefined) return null;
  // Nose-to-ankle is ~90 percent of full standing height. Scale accordingly.
  const pixelSpan = Math.abs(bottomY - topY);
  if (pixelSpan <= 0) return null;
  const estimatedTotalPx = pixelSpan / 0.9;
  // Sanity check: should not exceed image height by more than 10%
  if (estimatedTotalPx > imageHeight * 1.1) return null;
  return heightCm / estimatedTotalPx;
}

/** Compute the width of the silhouette at a given Y coordinate.
 *  Used to derive landmark-height widths from the contour. */
export function widthAtY(silhouette: PoseSilhouette, y: number, tolerance = 3): number | null {
  const row = silhouette.contour.filter((p) => Math.abs(p.y - y) <= tolerance);
  if (row.length < 2) return null;
  const xs = row.map((p) => p.x);
  const w = Math.max(...xs) - Math.min(...xs);
  if (w <= 0) return null;
  return w;
}
