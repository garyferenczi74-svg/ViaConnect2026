/**
 * src/lib/formavision/noise/mdcEngine.ts
 *
 * Prompt 211b Workstream 2 -- Minimum Detectable Change engine.
 *
 * Classifies every displayed delta as MEANINGFUL or WITHIN_NOISE based on
 * the 95% minimum detectable change formula:
 *
 *   MDC95 = 1.96 * sqrt(2) * SE
 *
 * where SE (standard error) is derived from the tolerance/harness error band
 * passed in by the caller. The engine is PURE: it takes the error band as an
 * input and has no hardcoded numbers. W3 will tighten the band per-user; this
 * design accepts that band directly so upgrading to a tighter per-user band
 * requires only a different argument, not a code change.
 *
 * Classification contract:
 *   - abs(delta) >= MDC95 -> MEANINGFUL
 *   - abs(delta) < MDC95  -> WITHIN_NOISE
 *
 * Honesty rules (non-negotiable):
 *   - WITHIN_NOISE is NEVER hidden, NEVER reclassified as failure. It is shown
 *     kindly and truthfully with Hannah-toned copy.
 *   - MEANINGFUL deltas keep their existing directional arrows.
 *   - No fabricated error bands: the band MUST be supplied by the caller.
 *   - This module does NOT compute or display any accuracy figure (W1 gates that).
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any, pure TS.
 */

// ---------------------------------------------------------------------------
// MDC classification
// ---------------------------------------------------------------------------

/** A delta is meaningful when abs(delta) >= MDC95, otherwise within noise. */
export type NoiseClassification = 'MEANINGFUL' | 'WITHIN_NOISE';

/**
 * The error band used to derive the standard error.
 *
 * toleranceCm is the half-width of the raw tolerance band for the region (e.g.
 * 2 cm for limbs, 3 cm for torso from accuracyTargets.ts RegionToleranceCm).
 * For body-fat percentage, tolerancePct is used instead.
 *
 * The caller supplies the band that is appropriate for the unit of the delta:
 *   - girth measurements -> toleranceCm
 *   - body fat percentage -> tolerancePct
 *
 * Only ONE of the two fields is required per call (the other may be omitted or
 * undefined). computeMDC95 uses whichever is provided.
 *
 * Derivation note: the harness tolerance band is the FULL half-width of the
 * tolerance interval. Treating it as 2 * SE (i.e. approximately +/- 2 sigma)
 * gives SE = toleranceBand / 2. This is conservative for the pre-cohort phase
 * (no real MAPE data yet) and will be replaced by the actual SE from the cohort
 * harness once data exists, without any code change here.
 */
export interface ErrorBand {
  /** Tolerance half-width in cm, for girth measurements. */
  toleranceCm?: number;
  /** Tolerance as a fraction of the measured value (0.10 = 10%), for body fat. */
  tolerancePct?: number;
  /**
   * The reference value (e.g. the 'from' measurement) used when tolerancePct
   * is provided, so SE = (tolerancePct * reference) / 2.
   * Required when tolerancePct is provided; ignored otherwise.
   */
  referenceValue?: number;
}

/**
 * Computes the minimum detectable change at the 95% confidence level.
 *
 *   MDC95 = 1.96 * sqrt(2) * SE
 *
 * SE is derived from the supplied error band:
 *   - toleranceCm provided: SE = toleranceCm / 2
 *   - tolerancePct + referenceValue provided: SE = (tolerancePct * referenceValue) / 2
 *
 * Returns null when neither toleranceCm nor (tolerancePct + referenceValue) is
 * provided. The caller must not act on a null MDC95 as a "0 threshold".
 *
 * @param band The error band describing measurement uncertainty for this region.
 * @returns The MDC95 value, or null when the band is insufficient.
 */
export function computeMDC95(band: ErrorBand): number | null {
  let se: number | null = null;

  if (typeof band.toleranceCm === 'number' && band.toleranceCm > 0) {
    se = band.toleranceCm / 2;
  } else if (
    typeof band.tolerancePct === 'number' &&
    band.tolerancePct > 0 &&
    typeof band.referenceValue === 'number' &&
    band.referenceValue > 0
  ) {
    se = (band.tolerancePct * band.referenceValue) / 2;
  }

  if (se === null || se <= 0) return null;

  // MDC95 = 1.96 * sqrt(2) * SE
  return 1.96 * Math.SQRT2 * se;
}

/**
 * Classifies a single observed delta against the MDC95 derived from the
 * supplied error band.
 *
 * Returns null when the MDC95 cannot be computed (band insufficient), which is
 * the honest UNKNOWN signal -- never default to MEANINGFUL or WITHIN_NOISE when
 * the band is absent.
 *
 * @param delta The signed raw change (to - from). The absolute value is used.
 * @param band The error band for the region/metric being classified.
 * @returns MEANINGFUL, WITHIN_NOISE, or null (UNKNOWN -- band insufficient).
 */
export function classifyDelta(
  delta: number,
  band: ErrorBand,
): NoiseClassification | null {
  const mdc = computeMDC95(band);
  if (mdc === null) return null;
  return Math.abs(delta) >= mdc ? 'MEANINGFUL' : 'WITHIN_NOISE';
}

// ---------------------------------------------------------------------------
// Convenience: classify a delta from a known region tolerance in cm
// (the common case for girth measurements using accuracyTargets.ts values).
// ---------------------------------------------------------------------------

/**
 * Classifies a girth delta using a fixed region tolerance half-width in cm.
 * This is the canonical path for the 8 girth regions (neck, upperArm, forearm,
 * upperLeg, lowerLeg, chest, waist, hip) as defined in accuracyTargets.ts.
 *
 * @param delta The signed girth change in cm.
 * @param regionToleranceCm The tolerance half-width in cm (e.g. 2 for limbs, 3 for torso).
 * @returns MEANINGFUL, WITHIN_NOISE, or null when toleranceCm <= 0.
 */
export function classifyGirthDelta(
  delta: number,
  regionToleranceCm: number,
): NoiseClassification | null {
  return classifyDelta(delta, { toleranceCm: regionToleranceCm });
}

/**
 * Classifies a body-fat percentage delta using the percentage-of-truth band.
 *
 * @param delta The signed body-fat change in percentage points.
 * @param referenceBodyFatPct The reference (from) body-fat percentage value.
 * @param toleranceFraction The tolerance fraction (default 0.10 = 10% per Section 1.1).
 * @returns MEANINGFUL, WITHIN_NOISE, or null when band is insufficient.
 */
export function classifyBodyFatDelta(
  delta: number,
  referenceBodyFatPct: number,
  toleranceFraction: number,
): NoiseClassification | null {
  return classifyDelta(delta, {
    tolerancePct: toleranceFraction,
    referenceValue: referenceBodyFatPct,
  });
}

// ---------------------------------------------------------------------------
// Within-noise copy: Hannah-toned, kind, honest messaging for WITHIN_NOISE
// deltas. Never failure language. Never hidden. Never fabricated progress.
// ---------------------------------------------------------------------------

export interface WithinNoiseCopyContext {
  /** The metric label shown in copy, e.g. "waist" or "body fat". */
  metricLabel: string;
}

/**
 * Returns kind, honest, Hannah-toned copy for a delta classified as WITHIN_NOISE.
 *
 * Rules:
 *   - Never implies failure.
 *   - Never hides the change.
 *   - Tells the user what within-noise means in plain language.
 *   - Suggests the path forward (next scan on their schedule).
 *   - Dash-clean (no em or en dashes).
 *
 * This is the canonical within-noise message for all surfaces. Any surface
 * showing a WITHIN_NOISE delta MUST use this copy (or an approved variant) so
 * users never see inconsistent messaging about measurement noise.
 */
export function withinNoiseCopy(context: WithinNoiseCopyContext): string {
  return (
    `This change in ${context.metricLabel} is within the scan's measurement precision. ` +
    'Your next scan on your usual schedule will give us more to go on.'
  );
}

/**
 * Short within-noise label for inline display (e.g. badge text next to a delta row).
 * Intentionally brief so it fits in a table cell or side-by-side with the value.
 */
export const WITHIN_NOISE_INLINE_LABEL = 'Within precision';

/**
 * Returns an accessible aria-label for a within-noise badge or marker.
 * Used on screen-reader-only spans accompanying visual noise badges.
 */
export function withinNoiseAriaLabel(metricLabel: string): string {
  return `${metricLabel} change is within scan precision`;
}
