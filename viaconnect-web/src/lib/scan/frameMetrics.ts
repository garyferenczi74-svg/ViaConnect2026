import { varianceOfLaplacian } from './blur';

/**
 * Prompt 231: pure weak-QA still metrics. Operates on raw RGBA pixel data
 * (Uint8ClampedArray) so it is unit-testable without a DOM or canvas; the
 * DOM-side extraction (canvas downscale + getImageData off the captured
 * blob) lives in captureStillMetrics.ts and is exercised by Playwright /
 * the device matrix, not this module.
 */
export interface FrameMetrics {
  luminanceVariance: number;
  exposure: number;
  blurScore: number;
}

// Rec. 709 luma weights.
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

export function computeFrameMetrics(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): FrameMetrics {
  const count = width * height;
  if (count === 0) {
    return { luminanceVariance: 0, exposure: 0, blurScore: 0 };
  }

  const gray = new Float32Array(count);
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    const luma = LUMA_R * pixels[offset] + LUMA_G * pixels[offset + 1] + LUMA_B * pixels[offset + 2];
    gray[i] = luma;
    sum += luma;
  }
  const mean = sum / count;

  let variance = 0;
  for (let i = 0; i < count; i++) {
    const diff = gray[i] - mean;
    variance += diff * diff;
  }
  variance /= count;

  return {
    luminanceVariance: variance,
    exposure: mean / 255,
    blurScore: varianceOfLaplacian(gray, width, height),
  };
}
