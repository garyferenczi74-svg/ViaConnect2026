/**
 * src/lib/formavision/noise/trendConfidenceBand.ts
 *
 * Prompt 211b Workstream 2 -- trend confidence band computations.
 *
 * Provides pure, stateless functions for computing MDC95 confidence bands
 * on trend lines. A confidence band is a visual +/- MDC95 envelope around
 * each data point that shows the user "within this band, two consecutive
 * readings cannot be distinguished from noise at the 95% confidence level."
 *
 * This module is PURE: no IO, no React, no side effects. The caller passes
 * error bands (from accuracyTargets.ts) and receives band widths.
 *
 * Honesty rules:
 *   - Band widths are derived from the MDC engine. No hardcoded thresholds.
 *   - A band of null means the band cannot be computed (honest UNKNOWN).
 *   - The band is NEVER used to smooth or reclassify the underlying data.
 *   - No accuracy figure is displayed. The band is precision context, not a claim.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any.
 */

import { computeMDC95 } from './mdcEngine';
import {
  RegionToleranceCm,
  PER_MEASUREMENT_PCT,
} from '@/lib/arnold/scanning/accuracy/accuracyTargets';
import type { GirthRegion } from '@/lib/arnold/scanning/accuracy/accuracyTargets';
import type { MeasurementKey } from '@/lib/body-tracker/circumference';

// ---------------------------------------------------------------------------
// Band width type
// ---------------------------------------------------------------------------

/**
 * The half-width of the MDC95 confidence band for a single metric point.
 *
 * halfWidth is the +/- distance in the display unit. A data-point at value V
 * has a confidence envelope of [V - halfWidth, V + halfWidth].
 *
 * null means the band cannot be computed for this point (honest UNKNOWN).
 */
export interface ConfidenceBandHalfWidth {
  halfWidth: number | null;
  /** The display unit of halfWidth, matches the input metric unit. */
  unit: 'cm' | 'in' | 'pct';
}

// ---------------------------------------------------------------------------
// MeasurementKey -> GirthRegion (same mapping as noiseDeltaClassifier)
// ---------------------------------------------------------------------------

const MEASUREMENT_KEY_TO_GIRTH_REGION: Readonly<Partial<Record<MeasurementKey, GirthRegion>>> =
  Object.freeze({
    neck: 'neck',
    rightBicep: 'upperArm',
    leftBicep: 'upperArm',
    rightForearm: 'forearm',
    leftForearm: 'forearm',
    chest: 'chest',
    waist: 'waist',
    hip: 'hip',
    rightQuadriceps: 'upperLeg',
    leftQuadriceps: 'upperLeg',
    rightCalf: 'lowerLeg',
    leftCalf: 'lowerLeg',
    // shoulderWidth: intentionally absent
  });

// ---------------------------------------------------------------------------
// Band width computation
// ---------------------------------------------------------------------------

/**
 * Returns the MDC95 confidence band half-width for a circumference measurement.
 *
 * The band is in the same unit as the display unit (cm or in). When unit is
 * inches, the cm MDC95 is converted to inches before returning.
 *
 * Returns halfWidth: null when:
 *   - The MeasurementKey has no GirthRegion (e.g. shoulderWidth).
 *   - The toleranceCm is invalid (should never happen with accuracyTargets.ts).
 *
 * @param key The measurement key (e.g. 'waist').
 * @param displayUnit The unit used for display ('cm' or 'in').
 */
export function circumferenceBandHalfWidth(
  key: MeasurementKey,
  displayUnit: 'cm' | 'in',
): ConfidenceBandHalfWidth {
  const region = MEASUREMENT_KEY_TO_GIRTH_REGION[key];
  if (region === undefined) {
    return { halfWidth: null, unit: displayUnit };
  }

  const toleranceCm = RegionToleranceCm[region];
  const mdc95Cm = computeMDC95({ toleranceCm });
  if (mdc95Cm === null) {
    return { halfWidth: null, unit: displayUnit };
  }

  // The band is symmetric: the indistinguishability half-width is MDC95 / 2.
  // Each point is shown with a band of +/- (MDC95/2), so the full visible
  // corridor spans MDC95 total -- "within this corridor I cannot distinguish
  // two readings." Using the full MDC95 as the half-width would double the
  // corridor and overstate the noise floor.
  const halfWidthCm = mdc95Cm / 2;
  const halfWidth = displayUnit === 'in' ? halfWidthCm / 2.54 : halfWidthCm;

  return { halfWidth, unit: displayUnit };
}

/**
 * Returns the MDC95 confidence band half-width for a body fat trend point.
 *
 * The reference value (the body fat percentage at that scan) is required to
 * compute the percentage-of-truth band. Returns halfWidth: null when the
 * reference is missing or non-positive.
 *
 * @param referencePct The body fat percentage at this scan point (the 'from' value).
 */
export function bodyFatBandHalfWidth(referencePct: number | null): ConfidenceBandHalfWidth {
  if (referencePct === null || referencePct <= 0) {
    return { halfWidth: null, unit: 'pct' };
  }

  const mdc95 = computeMDC95({
    tolerancePct: PER_MEASUREMENT_PCT,
    referenceValue: referencePct,
  });
  if (mdc95 === null) {
    return { halfWidth: null, unit: 'pct' };
  }

  // The band is symmetric: the indistinguishability half-width is MDC95 / 2,
  // matching circumferenceBandHalfWidth's convention (see comment above).
  // Using the full MDC95 as the half-width would double the corridor and
  // overstate the noise floor.
  return { halfWidth: mdc95 / 2, unit: 'pct' };
}

/**
 * Computes the confidence band for each point in a body fat trend series.
 *
 * Each element of the returned array corresponds to the same index in the input
 * valueSeries. null halfWidth means UNKNOWN for that point.
 *
 * @param valueSeries The sequence of body fat percentage values, in scan order.
 *   null values are preserved as null halfWidth (UNKNOWN).
 */
export function bodyFatTrendBands(
  valueSeries: Array<number | null>,
): ConfidenceBandHalfWidth[] {
  return valueSeries.map((v) => bodyFatBandHalfWidth(v));
}

/**
 * Computes the confidence band for each point in a circumference trend series.
 *
 * @param key The measurement key (e.g. 'waist').
 * @param valueSeries The sequence of measurement values in the display unit.
 * @param displayUnit The unit for all values.
 */
export function circumferenceTrendBands(
  key: MeasurementKey,
  valueSeries: Array<number | null>,
  displayUnit: 'cm' | 'in',
): ConfidenceBandHalfWidth[] {
  // Band width is constant for a given key + displayUnit (does not depend on value).
  const bandResult = circumferenceBandHalfWidth(key, displayUnit);
  return valueSeries.map(() => ({ ...bandResult }));
}

// ---------------------------------------------------------------------------
// Honest trend copy (plateau / confidence band context)
// ---------------------------------------------------------------------------

/**
 * Returns the aria-label for a confidence band annotation on a trend line.
 * Used on screen-reader-only elements accompanying visual bands.
 *
 * Review C2: no accuracy/precision NUMBER may appear in user-facing copy until
 * a real held-out cohort passes. This label speaks qualitatively only; the
 * halfWidth and unit parameters are kept for call-site compatibility with the
 * band computation but are not interpolated into the string.
 */
export function confidenceBandAriaLabel(metricLabel: string, halfWidth: number, unit: string): string {
  return `${metricLabel} precision band: within your scan's measurement precision. Changes within this range may be within measurement noise.`;
}
