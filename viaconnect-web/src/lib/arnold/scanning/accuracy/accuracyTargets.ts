// Task 1 (Prompt 210c) - Accuracy targets and tolerance config (versioned, single-source).
//
// Section 1 aggregate + agreement targets and Section 1.1 region tolerance bands.
// All maps are frozen. All functions are pure with no side effects.

// ---- Section 1 aggregate + agreement targets ----

/** Fraction of truth used as the per-measurement percentage tolerance band (Section 1.1). */
export const PER_MEASUREMENT_PCT = 0.10;

/**
 * Required fraction of per-measurement checks that must pass within tolerance
 * to claim the 90 percent accuracy target (Section 1).
 */
export const AGGREGATE_PASS_RATE = 0.90;

/**
 * Minimum intraclass correlation coefficient (ICC) required for agreement
 * with ground-truth tape-measure or 3D-scan references (Section 1).
 */
export const MIN_ICC = 0.90;

// ---- Section 1.1 region tolerance bands ----

/**
 * Union of the eight measured girth regions.
 * Limb girths: neck, upperArm, forearm, upperLeg, lowerLeg.
 * Torso girths: chest, waist, hip.
 */
export type GirthRegion =
  | 'neck'
  | 'upperArm'
  | 'forearm'
  | 'upperLeg'
  | 'lowerLeg'
  | 'chest'
  | 'waist'
  | 'hip';

/**
 * Per-region tolerance band in centimetres (Section 1.1).
 * Limb girths: +/- 2cm. Torso girths: +/- 3cm.
 * Frozen to prevent accidental mutation.
 */
export const RegionToleranceCm: Readonly<Record<GirthRegion, number>> = Object.freeze({
  neck: 2,
  upperArm: 2,
  forearm: 2,
  upperLeg: 2,
  lowerLeg: 2,
  chest: 3,
  waist: 3,
  hip: 3,
});

/**
 * Returns true when the absolute difference between predictedCm and truthCm is
 * within the effective tolerance for the given region.
 *
 * Effective tolerance = the GREATER of:
 *   (a) PER_MEASUREMENT_PCT * truthCm  (10 percent of ground truth), and
 *   (b) RegionToleranceCm[region]      (the fixed cm band for the region).
 *
 * This implements Section 1.1: "within the greater of 10 percent or a region tolerance."
 */
export function withinTolerance(
  predictedCm: number,
  truthCm: number,
  region: GirthRegion
): boolean {
  const pctBand = PER_MEASUREMENT_PCT * truthCm;
  const regionBand = RegionToleranceCm[region];
  const effectiveTolerance = Math.max(pctBand, regionBand);
  return Math.abs(predictedCm - truthCm) <= effectiveTolerance;
}
