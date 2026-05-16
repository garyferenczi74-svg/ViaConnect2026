// Body Scanner: Multi-frame fusion (§9.3 / §13).
//
// Pure data-in / data-out. No DOM, no MediaPipe, no React.
// Accepts already-extracted frame data; returns consensus result.

import { MULTI_FRAME_FUSION } from '@/lib/body-tracker/scan-constants';
import type {
  FrameFusionInput,
  FrameFusionResult,
} from '@/lib/body-tracker/scan-types';

// ============================================================
// Input validation
// ============================================================

/**
 * Validate the input has the expected frame count and timing.
 * Returns null if valid; returns a reason string if invalid.
 */
export function validateFusionInput(input: FrameFusionInput): string | null {
  const { frameCount, intervalMs } = MULTI_FRAME_FUSION;

  if (input.frames.length !== frameCount) {
    return `Expected ${frameCount} frames but received ${input.frames.length}.`;
  }

  const firstMask = input.frames[0].silhouetteMask;
  const expectedWidth  = firstMask.width;
  const expectedHeight = firstMask.height;

  for (let i = 1; i < input.frames.length; i++) {
    const mask = input.frames[i].silhouetteMask;
    if (mask.width !== expectedWidth || mask.height !== expectedHeight) {
      return `Frame ${i} mask dimensions (${mask.width}x${mask.height}) do not match frame 0 (${expectedWidth}x${expectedHeight}).`;
    }
  }

  const expectedKpLength = input.frames[0].keypoints.length;
  for (let i = 1; i < input.frames.length; i++) {
    if (input.frames[i].keypoints.length !== expectedKpLength) {
      return `Frame ${i} has ${input.frames[i].keypoints.length} keypoints but frame 0 has ${expectedKpLength}.`;
    }
  }

  const timestamps = input.frames.map((f) => f.capturedAt);
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const spanMs = maxTs - minTs;
  const maxSpanMs = frameCount * intervalMs * 1.5;
  if (spanMs > maxSpanMs) {
    return `Capture time span ${spanMs}ms exceeds maximum allowed ${maxSpanMs}ms (${frameCount} frames at ${intervalMs}ms each with 1.5x jitter slack).`;
  }

  return null;
}

// ============================================================
// Mask median filter
// ============================================================

/**
 * Run per-pixel median filter across N silhouette masks.
 * For each pixel position, take the median of the N corresponding values
 * (0 or 255 for binary masks; any value for grayscale).
 *
 * Note: for even N (e.g., N=2), this returns the upper-median element
 * (since Math.floor(N/2) is the higher of the two middle indices for even N).
 * The expected and validated case is N=3, where the true single median is
 * always returned. Even-N input is callable but should be considered an
 * undocumented edge: use validateFusionInput or fuseFrames as the entry point.
 */
export function medianFilterMasks(masks: ImageData[]): ImageData {
  if (masks.length === 0) {
    throw new Error('medianFilterMasks requires at least one mask.');
  }

  const width  = masks[0].width;
  const height = masks[0].height;
  const pixelCount = width * height;
  const n = masks.length;

  // Output is a new Uint8ClampedArray with RGBA layout matching ImageData.
  const outData = new Uint8ClampedArray(pixelCount * 4);

  // Pre-extract the alpha channel (index 3 stride) from each mask.
  // For silhouette masks the meaningful channel is index 0 (R), but we
  // process all four RGBA channels independently for generality.
  for (let channel = 0; channel < 4; channel++) {
    const samples: number[] = new Array(n);

    for (let p = 0; p < pixelCount; p++) {
      const base = p * 4;

      for (let m = 0; m < n; m++) {
        samples[m] = masks[m].data[base + channel];
      }

      // Sort and pick the middle element.
      samples.sort((a, b) => a - b);
      const medianIndex = Math.floor(n / 2);
      outData[base + channel] = samples[medianIndex];
    }
  }

  return { data: outData, width, height } as ImageData;
}

// ============================================================
// Keypoint weighted average
// ============================================================

type Keypoint = { x: number; y: number; z: number; confidence: number };

/**
 * Average BlazePose keypoints across N frames using confidence-weighted mean.
 * For each keypoint index, sum (x_i * confidence_i, y_i * confidence_i, z_i * confidence_i)
 * and divide by sum of confidences. The returned keypoint's confidence is the mean of the
 * per-frame confidences.
 * If sum of confidences is 0 for a keypoint, return (0, 0, 0, 0).
 */
export function averageKeypointsWeighted(
  keypointsPerFrame: Array<Array<Keypoint>>,
): Array<Keypoint> {
  if (keypointsPerFrame.length === 0) {
    return [];
  }

  const keypointCount = keypointsPerFrame[0].length;
  const frameCount    = keypointsPerFrame.length;
  const result: Keypoint[] = new Array(keypointCount);

  for (let k = 0; k < keypointCount; k++) {
    let weightedX = 0;
    let weightedY = 0;
    let weightedZ = 0;
    let sumConfidence = 0;

    for (let f = 0; f < frameCount; f++) {
      const kp = keypointsPerFrame[f][k];
      weightedX += kp.x * kp.confidence;
      weightedY += kp.y * kp.confidence;
      weightedZ += kp.z * kp.confidence;
      sumConfidence += kp.confidence;
    }

    if (sumConfidence === 0) {
      result[k] = { x: 0, y: 0, z: 0, confidence: 0 };
    } else {
      result[k] = {
        x:          weightedX / sumConfidence,
        y:          weightedY / sumConfidence,
        z:          weightedZ / sumConfidence,
        confidence: sumConfidence / frameCount,
      };
    }
  }

  return result;
}

// ============================================================
// Top-level fusion entry point
// ============================================================

/**
 * Top-level fusion: validate, run mask median, run keypoint weighted mean,
 * return FrameFusionResult.
 * Throws if validation fails (caller in T7 will catch and surface a retake).
 */
export function fuseFrames(input: FrameFusionInput): FrameFusionResult {
  const validationError = validateFusionInput(input);
  if (validationError !== null) {
    throw new Error(`Fusion validation failed: ${validationError}`);
  }

  const masks = input.frames.map((f) => f.silhouetteMask);
  const consensusMask = medianFilterMasks(masks);

  const keypointsPerFrame = input.frames.map((f) => f.keypoints);
  const averagedKeypoints = averageKeypointsWeighted(keypointsPerFrame);

  return { consensusMask, averagedKeypoints };
}
