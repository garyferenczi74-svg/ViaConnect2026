// Task 14 (Prompt 210c) - Pure functions for ARKit/ARCore depth-derived breadth.
//
// Converts native depth frame data (from the FormaVisionDepth Capacitor plugin)
// into body-breadth measurements (cm) and scale anchors that the measurement
// pipeline can consume.
//
// RULE 9: every function returns null when data is absent or invalid. No
// fabrication, no 0 substitution.
//
// Section 6.3 / 2.1 graceful degradation: depth is an OPTIONAL booster.
// All callers must handle null returns by falling back to the silhouette-derived
// side-depth path (the pre-Task-14 two-view breadth model). This module never
// blocks the pipeline.
//
// No em-dashes. No en-dashes. No `any`. Named constants follow Section 17.5.

// ---- Named constants (single source of truth) ----

/**
 * Minimum number of valid pixels at a body level before a depth sample is
 * considered reliable. Fewer pixels indicate an occlusion or sensor gap.
 */
const MIN_VALID_PIXELS = 5;

/**
 * Minimum plausible front-to-back human breadth in meters (1 cm).
 * Smaller values are noise or sensor artifacts (e.g., a flat wall returns
 * near-zero range because all pixels are at the same depth).
 */
const MIN_DEPTH_RANGE_M = 0.01;

/**
 * Maximum plausible front-to-back human breadth in meters (80 cm).
 * Any larger reading indicates the body silhouette was not correctly isolated
 * and background pixels contaminated the sample.
 */
const MAX_DEPTH_RANGE_M = 0.80;

/**
 * Maximum plausible depth-derived scale in cm per pixel.
 * 1.0 cm/px corresponds to a person ~10 cm from a wide-angle camera.
 * Larger values are almost certainly a sensor or bridge error.
 */
const MAX_SCALE_CM_PER_PX = 1.0;

/**
 * Minimum plausible depth-derived scale in cm per pixel.
 * 0.005 cm/px corresponds to an extreme telephoto capture at very long range.
 * Values below this are unreliable for measurement purposes.
 */
const MIN_SCALE_CM_PER_PX = 0.005;

/**
 * Maximum level-norm distance for findDepthSample to accept a match.
 * 0.05 = 5 percent of image height, roughly 3-4 cm in a full-body frame.
 * A sample farther than this from the requested level is rejected (RULE 9).
 */
export const MAX_LEVEL_DELTA = 0.05;

// ---- Types ----

/**
 * Pinhole camera intrinsics from the depth camera at the moment of capture.
 * Values are in pixels unless otherwise noted.
 *
 * ARKit source: ARCamera.intrinsics (simd_float3x3, column-major).
 *   fx = intrinsics[0][0], fy = intrinsics[1][1]
 *   cx = intrinsics[2][0], cy = intrinsics[2][1]
 *
 * ARCore source: Camera.getImageIntrinsics()
 *   focalLength[0]=fx, focalLength[1]=fy
 *   principalPoint[0]=cx, principalPoint[1]=cy
 *
 * Depth-to-scale formula: scaleCmPerPx = (depthM / fx) * 100
 *   At metric depth D from the camera, one pixel spans D/fx meters.
 */
export interface CameraIntrinsics {
  /** Horizontal focal length in pixels. */
  fx: number;
  /** Vertical focal length in pixels. */
  fy: number;
  /** Horizontal principal point in pixels. */
  cx: number;
  /** Vertical principal point in pixels. */
  cy: number;
  /** Image sensor width in pixels at the time of capture. */
  widthPx: number;
  /** Image sensor height in pixels at the time of capture. */
  heightPx: number;
}

/**
 * Depth statistics at one body level, pre-processed by the native plugin.
 *
 * The native plugin samples all valid pixels in the body extent at the
 * requested image row (levelNorm) and returns summary statistics. This
 * avoids transferring a multi-megabyte float32 depth map across the JS bridge.
 *
 * Front-to-back breadth = maxDepthM - minDepthM (nearest to farthest surface).
 * medianDepthM is used to derive a depth-independent scale anchor.
 */
export interface DepthSample {
  /** Normalized Y position in the color image [0..1], 0 = top (crown), 1 = bottom (feet). */
  levelNorm: number;
  /** Minimum valid depth within the body silhouette extent at this row (meters). */
  minDepthM: number;
  /** Maximum valid depth within the body silhouette extent at this row (meters). */
  maxDepthM: number;
  /** Median depth within the body silhouette extent (meters). */
  medianDepthM: number;
  /** Number of valid depth pixels sampled at this level. */
  validPixelCount: number;
}

/**
 * Depth frame returned by the FormaVisionDepth Capacitor plugin.
 * Contains per-level depth statistics for the requested body levels plus
 * the camera intrinsics needed for scale derivation.
 */
export interface DepthFrame {
  /** Pre-sampled depth statistics, one entry per requested levelNorm. */
  samples: DepthSample[];
  /** Camera intrinsics at the moment of depth capture. */
  intrinsics: CameraIntrinsics;
  /** Unix-epoch timestamp of capture in milliseconds. */
  capturedAtMs: number;
}

// ---- Pure functions ----

/**
 * Derive front-to-back breadth in cm from a depth sample at one body level.
 *
 * breadthCm = (sample.maxDepthM - sample.minDepthM) * 100
 *
 * This is the front surface-to-back surface metric extent of the body at the
 * sampled row, converted from meters to centimeters.
 *
 * RULE 9: returns null when the sample is absent, has too few valid pixels,
 * is non-finite, or the derived range is outside plausible human body bounds
 * [MIN_DEPTH_RANGE_M, MAX_DEPTH_RANGE_M]. Never returns 0 or a fabricated value.
 *
 * @param sample - DepthSample from the DepthFrame, or null/undefined.
 * @returns Front-to-back breadth in cm, or null when unavailable.
 */
export function depthDerivedDepthCm(sample: DepthSample | null | undefined): number | null {
  if (!sample) return null;
  if (sample.validPixelCount < MIN_VALID_PIXELS) return null;
  const rangeM = sample.maxDepthM - sample.minDepthM;
  if (!isFinite(rangeM)) return null;
  if (rangeM < MIN_DEPTH_RANGE_M || rangeM > MAX_DEPTH_RANGE_M) return null;
  return rangeM * 100;
}

/**
 * Derive a scale anchor (cm per pixel) from a depth sample and camera intrinsics.
 *
 * Formula: scaleCmPerPx = (medianDepthM / fx) * 100
 *
 * At metric depth D from the camera, one pixel spans D/fx meters (thin-lens
 * projection). This produces a scale anchor independent of the height-landmark
 * path used by silhouetteProcessor.ts (computeScale), giving reconcileScale
 * a third independent anchor when depth is available.
 *
 * RULE 9: returns null when any input is invalid, depth is non-positive, the
 * focal length is non-positive, or the derived scale is outside plausible bounds
 * [MIN_SCALE_CM_PER_PX, MAX_SCALE_CM_PER_PX].
 *
 * @param sample - DepthSample providing medianDepthM.
 * @param intrinsics - CameraIntrinsics providing focal length fx.
 * @returns Scale in cm per pixel, or null when unavailable.
 */
export function depthDerivedScaleCmPerPx(
  sample: DepthSample | null | undefined,
  intrinsics: CameraIntrinsics | null | undefined,
): number | null {
  if (!sample || !intrinsics) return null;
  if (sample.validPixelCount < MIN_VALID_PIXELS) return null;
  if (!isFinite(sample.medianDepthM) || sample.medianDepthM <= 0) return null;
  if (!isFinite(intrinsics.fx) || intrinsics.fx <= 0) return null;
  const scaleCmPerPx = (sample.medianDepthM / intrinsics.fx) * 100;
  if (!isFinite(scaleCmPerPx)) return null;
  if (scaleCmPerPx < MIN_SCALE_CM_PER_PX || scaleCmPerPx > MAX_SCALE_CM_PER_PX) return null;
  return scaleCmPerPx;
}

/**
 * Find the closest depth sample in a DepthFrame to a given normalized Y level.
 *
 * Searches frame.samples for the entry whose levelNorm is closest to the
 * requested levelNorm. Returns null when:
 *   - frame is absent or has no samples
 *   - levelNorm is not finite
 *   - the closest sample is farther than MAX_LEVEL_DELTA from the requested level
 *
 * RULE 9: returns null rather than returning a sample from a distant body level
 * that might correspond to a different body region.
 *
 * @param frame - DepthFrame from the native plugin, or null/undefined.
 * @param levelNorm - Normalized Y position [0..1] to search for.
 * @returns The matching DepthSample, or null when not found within tolerance.
 */
export function findDepthSample(
  frame: DepthFrame | null | undefined,
  levelNorm: number,
): DepthSample | null {
  if (!frame || frame.samples.length === 0) return null;
  if (!isFinite(levelNorm)) return null;
  let best: DepthSample | null = null;
  let bestDelta = Infinity;
  for (const s of frame.samples) {
    const delta = Math.abs(s.levelNorm - levelNorm);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = s;
    }
  }
  if (bestDelta > MAX_LEVEL_DELTA) return null;
  return best;
}
