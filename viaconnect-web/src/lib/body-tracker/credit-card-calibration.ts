// Body Scanner: Credit-card calibration and user-height fallback (§14).
//
// Uses OpenCV.js WASM for contour detection. The runtime (browser) loads the
// WASM module. Tests mock the cv namespace.
//
// Memory hygiene: every cv.Mat allocated in this file is deleted in a
// try/finally block. Leaking a Mat causes WASM heap exhaustion over time.

import { CREDIT_CARD_DIMENSIONS_MM } from '@/lib/body-tracker/scan-constants';
import type { CalibrationResult } from '@/lib/body-tracker/scan-types';

// ---------------------------------------------------------------------------
// OpenCV.js type shim
// ---------------------------------------------------------------------------

// OpenCV.js is loaded as a global (window.cv) by the browser. We declare a
// minimal interface here so TypeScript is satisfied without importing a full
// type package. The actual object is accessed via the cvGlobal() helper which
// falls back to a mock in test environments.
declare global {
  // eslint-disable-next-line no-var
  var cv: OpenCvNamespace | undefined;
}

interface OpenCvMat {
  rows:  number;
  cols:  number;
  data:  Uint8Array;
  data32S: Int32Array;
  delete(): void;
}

interface OpenCvMatVector {
  size():                  number;
  get(index: number):      OpenCvMat;
  delete():                void;
}

interface OpenCvPoint {
  x: number;
  y: number;
}

interface OpenCvNamespace {
  Mat:             new (...args: unknown[]) => OpenCvMat;
  MatVector:       new () => OpenCvMatVector;
  Scalar:          new (v0: number, v1?: number, v2?: number, v3?: number) => unknown;
  cvtColor(src: OpenCvMat, dst: OpenCvMat, code: number):          void;
  Canny(image: OpenCvMat, edges: OpenCvMat, t1: number, t2: number): void;
  findContours(
    image:    OpenCvMat,
    contours: OpenCvMatVector,
    hierarchy: OpenCvMat,
    mode:     number,
    method:   number,
  ):                                                                 void;
  approxPolyDP(
    curve:    OpenCvMat,
    approxCurve: OpenCvMat,
    epsilon:  number,
    closed:   boolean,
  ):                                                                 void;
  arcLength(curve: OpenCvMat, closed: boolean):                     number;
  contourArea(contour: OpenCvMat):                                   number;
  COLOR_RGBA2GRAY: number;
  RETR_LIST:       number;
  CHAIN_APPROX_SIMPLE: number;
}

/**
 * Returns the cv namespace from the global, or null if not available.
 * Tests inject a mock by assigning global.cv before calling detection functions.
 */
function cvGlobal(): OpenCvNamespace | null {
  if (typeof globalThis !== 'undefined' && (globalThis as { cv?: OpenCvNamespace }).cv) {
    return (globalThis as { cv: OpenCvNamespace }).cv;
  }
  return null;
}

// ---------------------------------------------------------------------------
// ISO 7810 ID-1 credit card geometry constants
// ---------------------------------------------------------------------------

// Card long side in cm (85.60 mm = 8.560 cm).
const CARD_LONG_SIDE_CM = CREDIT_CARD_DIMENSIONS_MM.width / 10;

// Aspect ratio of ISO 7810 ID-1: 85.60 / 53.98 = ~1.586.
const CARD_ASPECT_RATIO = CREDIT_CARD_DIMENSIONS_MM.width / CREDIT_CARD_DIMENSIONS_MM.height;

// Relative (percentage) tolerance, not absolute: actual permitted aspect-ratio
// deviation is ASPECT_RATIO_TOLERANCE * CARD_ASPECT_RATIO = 0.05 * 1.586 ~ about +/-0.0793.
const ASPECT_RATIO_TOLERANCE = 0.05;

// Minimum pixel area for a credit card to be considered a valid detection.
// Corresponds roughly to a card 8 feet from the camera occupying ~50 x 32 px.
const MIN_CARD_AREA_PX = 50 * 32;

// ---------------------------------------------------------------------------
// detectCreditCardAndComputeScale
// ---------------------------------------------------------------------------

/**
 * Detect a credit card in the floor plane of an image using OpenCV.js contour
 * finding and compute the pixels-per-cm scale factor.
 *
 * Returns null if:
 *   - OpenCV.js is not available (cv namespace not loaded)
 *   - No card-shaped quadrilateral is found
 *
 * Memory hygiene: all cv.Mat and cv.MatVector allocations are deleted in
 * try/finally blocks before return.
 *
 * Algorithm:
 *   1. Convert RGBA to grayscale.
 *   2. Apply Canny edge detection.
 *   3. Find external contours.
 *   4. For each contour, approximate to a polygon (approxPolyDP).
 *   5. Filter by: 4 vertices, aspect ratio within 5% of 1.586, area >= MIN.
 *   6. Among survivors, pick the largest by area.
 *   7. Compute px-per-cm from the longest edge / 8.56 cm.
 *   8. Compute floor plane inclination from the card's long edge angle vs horizontal.
 */
export async function detectCreditCardAndComputeScale(
  rgbImage: ImageData,
): Promise<{
  scaleFactorPxPerCm: number;
  floorPlaneInclinationDeg: number;
  detectedCardCorners: Array<{ x: number; y: number }>;
} | null> {
  const cv = cvGlobal();
  if (!cv) return null;

  // Build a cv.Mat from the ImageData RGBA buffer.
  const src = matFromImageData(cv, rgbImage);
  if (!src) return null;

  const gray      = new cv.Mat();
  const edges     = new cv.Mat();
  const contours  = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.Canny(gray, edges, 50, 150);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let bestContour: OpenCvMat | null = null;
    let bestArea = 0;
    let bestCorners: Array<{ x: number; y: number }> = [];

    const approxCurve = new cv.Mat();
    try {
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const perimeter = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approxCurve, 0.02 * perimeter, true);

        // Must be a quadrilateral.
        if (approxCurve.rows !== 4) continue;

        const area = cv.contourArea(approxCurve);
        if (area < MIN_CARD_AREA_PX) continue;

        // Extract corners.
        const corners = extractQuadCorners(approxCurve);

        // Validate aspect ratio.
        if (!isCardAspectRatio(corners)) continue;

        if (area > bestArea) {
          bestArea    = area;
          bestCorners = corners;
          bestContour = contour;
        }
      }
    } finally {
      approxCurve.delete();
    }

    if (bestContour === null || bestCorners.length !== 4) return null;

    // Compute pixels-per-cm from the longest detected edge.
    const longestEdgePx = longestEdgeLength(bestCorners);
    const scaleFactorPxPerCm = longestEdgePx / CARD_LONG_SIDE_CM;

    // Floor plane inclination: angle of the card's long edge vs horizontal.
    const floorPlaneInclinationDeg = cardLongEdgeAngleDeg(bestCorners);

    return {
      scaleFactorPxPerCm,
      floorPlaneInclinationDeg,
      detectedCardCorners: bestCorners,
    };
  } finally {
    src.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }
}

// ---------------------------------------------------------------------------
// Internal geometry helpers
// ---------------------------------------------------------------------------

/**
 * Create a cv.Mat from an ImageData object.
 * Returns null if cv is unavailable.
 */
function matFromImageData(cv: OpenCvNamespace, imageData: ImageData): OpenCvMat | null {
  try {
    const mat = new cv.Mat(imageData.height, imageData.width, 24 /* CV_8UC4 */);
    mat.data.set(imageData.data);
    return mat;
  } catch {
    return null;
  }
}

/**
 * Extract the four corner points from a 4-row approxPolyDP result Mat.
 * OpenCV stores points as interleaved int32 pairs in data32S.
 */
function extractQuadCorners(
  mat: OpenCvMat,
): Array<{ x: number; y: number }> {
  const corners: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 4; i++) {
    corners.push({
      x: mat.data32S[i * 2],
      y: mat.data32S[i * 2 + 1],
    });
  }
  return corners;
}

/**
 * Validate that a quadrilateral has an aspect ratio matching ISO 7810 ID-1
 * within ASPECT_RATIO_TOLERANCE.
 */
function isCardAspectRatio(corners: Array<{ x: number; y: number }>): boolean {
  if (corners.length !== 4) return false;

  // Compute all 4 edge lengths.
  const edges: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    edges.push(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2));
  }
  edges.sort((a, b) => a - b);

  // Two short edges and two long edges; their ratio should match the card.
  const shortEdge = (edges[0] + edges[1]) / 2;
  const longEdge  = (edges[2] + edges[3]) / 2;
  if (shortEdge <= 0) return false;

  const ratio = longEdge / shortEdge;
  return Math.abs(ratio - CARD_ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE * CARD_ASPECT_RATIO;
}

/**
 * Return the length of the longest edge in a quad.
 */
function longestEdgeLength(corners: Array<{ x: number; y: number }>): number {
  let max = 0;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const len = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    if (len > max) max = len;
  }
  return max;
}

/**
 * Compute floor plane inclination from the card's longest edge.
 * Returns degrees in [-90, 90]: positive means edge tilts upward left-to-right,
 * negative means downward. Sign-symmetrized to be independent of polygon
 * winding order.
 *
 * Math.atan2 returns values in [-180, 180] whose sign depends on which vertex
 * approxPolyDP lists first (i.e. winding order). Normalizing to [-90, 90]
 * collapses a 175 degree result (same physical edge as -5 degrees) to -5,
 * ensuring the output is stable regardless of contour traversal direction.
 */
function cardLongEdgeAngleDeg(corners: Array<{ x: number; y: number }>): number {
  // Find the longest edge.
  let maxLen = 0;
  let rawAngle = 0;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const len = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    if (len > maxLen) {
      maxLen = len;
      rawAngle = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
    }
  }
  // Normalize to [-90, 90]: a 175 degree result is the same physical
  // orientation as -5 degrees.
  let angle = rawAngle;
  while (angle > 90) angle -= 180;
  while (angle < -90) angle += 180;
  return angle;
}

// ---------------------------------------------------------------------------
// computeUserHeightScale
// ---------------------------------------------------------------------------

/**
 * Fallback calibration using the user's self-reported height from the CAQ.
 *
 * Computes scale = (ankle midpoint y - head crown y) pixels / caqHeightCm.
 * This assumes the body is roughly vertical in the frame.
 */
export function computeUserHeightScale(
  headCrownPx: { x: number; y: number },
  ankleMidpointPx: { x: number; y: number },
  caqHeightCm: number,
): { scaleFactorPxPerCm: number } {
  if (caqHeightCm <= 0) {
    throw new RangeError('caqHeightCm must be greater than 0');
  }
  const pixelSpan = Math.abs(ankleMidpointPx.y - headCrownPx.y);
  const scaleFactorPxPerCm = pixelSpan / caqHeightCm;
  return { scaleFactorPxPerCm };
}

// ---------------------------------------------------------------------------
// calibrateScan
// ---------------------------------------------------------------------------

/**
 * Top-level calibration helper. Attempts credit-card detection first, falls
 * back to user-height calibration if no card is found.
 *
 * Returns a CalibrationResult indicating the source used, the scale factor,
 * and the floor plane inclination (null when using user-height fallback).
 */
export async function calibrateScan(inputs: {
  rgbImage: ImageData;
  headCrownPx: { x: number; y: number };
  ankleMidpointPx: { x: number; y: number };
  caqHeightCm: number;
}): Promise<CalibrationResult> {
  const cardResult = await detectCreditCardAndComputeScale(inputs.rgbImage);

  if (cardResult !== null) {
    return {
      source:                   'credit_card',
      scaleFactorPxPerCm:       cardResult.scaleFactorPxPerCm,
      floorPlaneInclinationDeg: cardResult.floorPlaneInclinationDeg,
    };
  }

  // Fall back to user-height calibration.
  const { scaleFactorPxPerCm } = computeUserHeightScale(
    inputs.headCrownPx,
    inputs.ankleMidpointPx,
    inputs.caqHeightCm,
  );

  return {
    source:                   'user_height',
    scaleFactorPxPerCm,
    floorPlaneInclinationDeg: null,
  };
}
