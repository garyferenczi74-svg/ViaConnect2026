// Body Scanner: Personal baseline drift correction (§9.6 / §15).
//
// Pure data-in / data-out. No DOM, no MediaPipe, no React.
// Computes rolling std-dev noise floor, detects outliers, and applies
// Kalman-style temporal smoothing for public trend chart display.

import { PERSONAL_BASELINE_BOOTSTRAP_SCANS } from '@/lib/body-tracker/scan-constants';
import type { PersonalBaseline } from '@/lib/body-tracker/scan-types';

// ============================================================
// Internal helpers
// ============================================================

function mean(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/** Sample standard deviation using Bessel's correction (n-1 divisor). */
function sampleStdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) {
    return 0;
  }
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

// ============================================================
// computePersonalBaseline
// ============================================================

/**
 * Compute personal baseline (rolling std-dev) for one measurement type
 * from a user's recent scan history. Returns null if fewer than
 * PERSONAL_BASELINE_BOOTSTRAP_SCANS (3) scans available.
 */
export function computePersonalBaseline(
  userId: string,
  measurementType: string,
  recentValues: number[],
): PersonalBaseline | null {
  if (recentValues.length < PERSONAL_BASELINE_BOOTSTRAP_SCANS) {
    return null;
  }

  return {
    userId,
    measurementType,
    stdDev:     sampleStdDev(recentValues),
    sampleSize: recentValues.length,
    computedAt: new Date().toISOString(),
  };
}

// ============================================================
// isOutlier
// ============================================================

/**
 * Detect outlier: returns true if the new value is more than thresholdSigma
 * standard deviations from the rolling mean. Default 2 sigma per §9.6.
 * If std-dev is 0 (all values identical), returns false.
 */
export function isOutlier(
  newValue: number,
  recentValues: number[],
  thresholdSigma = 2,
): boolean {
  if (recentValues.length === 0) {
    return false;
  }
  const std = sampleStdDev(recentValues);
  if (std === 0) {
    return false;
  }
  const m = mean(recentValues);
  return Math.abs((newValue - m) / std) > thresholdSigma;
}

// ============================================================
// smoothTrendForDisplay
// ============================================================

/**
 * Kalman-style temporal smoothing for public trend chart display.
 * Returns a new array where each value is the weighted blend of the raw value
 * and the running estimate, with the Kalman gain proportional to
 * (process noise) / (process noise + measurement noise).
 *
 * Phase 1 simplified recursive low-pass:
 *   estimate[t] = estimate[t-1] + K * (raw[t] - estimate[t-1])
 *   K = 1 / (1 + std_dev / mean_value), clamped to [0.1, 1.0].
 *
 * Higher std-dev (noisier user) => lower K (smoother chart).
 * Lower std-dev => higher K (chart tracks more closely).
 *
 * If baseline is null (fewer than 3 scans), return raw values unchanged.
 */
export function smoothTrendForDisplay(
  rawValues: number[],
  baseline: PersonalBaseline | null,
): number[] {
  if (baseline === null || rawValues.length === 0) {
    return rawValues.slice();
  }

  const m = mean(rawValues);
  let k: number;

  if (m === 0) {
    k = 0.1;
  } else {
    k = 1 / (1 + baseline.stdDev / Math.abs(m));
  }

  // Clamp to [0.1, 1.0].
  k = Math.max(0.1, Math.min(1.0, k));

  const smoothed: number[] = new Array(rawValues.length);
  smoothed[0] = rawValues[0];

  for (let t = 1; t < rawValues.length; t++) {
    smoothed[t] = smoothed[t - 1] + k * (rawValues[t] - smoothed[t - 1]);
  }

  return smoothed;
}

// ============================================================
// confidenceIntervalFromBaseline
// ============================================================

/**
 * Compute 95% CI bounds from a value and the personal baseline std-dev.
 * Returns null if baseline is null.
 *
 * Note: 1.96 is the Z-score for a 95% CI under a normal distribution with a
 * large sample. At the bootstrap N=3 case, the t-distribution critical value
 * (df=2) is 4.303, so the CI is significantly tighter than statistically
 * defensible at the very first baseline. Spec mandates 1.96 for consistency
 * with the trend chart smoothing; if a more honest small-sample interval is
 * needed later, switch to a t-distribution table lookup keyed by sample_size.
 */
export function confidenceIntervalFromBaseline(
  value: number,
  baseline: PersonalBaseline | null,
): { low: number; high: number } | null {
  if (baseline === null) {
    return null;
  }
  const halfWidth = 1.96 * baseline.stdDev;
  return {
    low:  value - halfWidth,
    high: value + halfWidth,
  };
}
