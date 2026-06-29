// Task 2 (Prompt 210c) - Per-field confidence model (pure logic, no IO, no side effects).
//
// Implements Section 9.1 (confidence inputs) + Section 9.2 (CONFIDENCE_THRESHOLD).
// Section 8.3 / 17.5 discipline: weights are a frozen named const, not scattered literals.
//
// RULE 9 (backbone): a score below CONFIDENCE_THRESHOLD signals to the CALLER that
// the measurement must render as UNKNOWN / estimated. This module returns the
// score and level only - it never fabricates or suppresses a value.

import type { ConfidenceLevel } from '../types';

// Re-export the type so callers can import it from this module if preferred.
export type { ConfidenceLevel };

// ---- Section 9.1 confidence inputs ----

/**
 * Inputs to scoreMeasurementConfidence, each normalized to [0, 1].
 * Higher values ALWAYS indicate better quality or lower uncertainty.
 *
 * All fields must be normalized by the caller before passing. Out-of-range
 * values are clamped internally, but callers should not rely on clamping.
 */
export interface ConfidenceInputs {
  /**
   * Overall capture quality: lighting, exposure, distance, blur.
   * 0 = completely unusable; 1 = ideal photographic conditions.
   * Populated by captureQuality.ts (Task 13) or inferred from scan metadata.
   */
  captureQualityScore: number;

  /**
   * Silhouette / segmentation mask edge certainty.
   * 0 = very noisy or torn edge; 1 = crisp, clean boundary.
   * Derived from per-pixel segmentation confidence from TF body-segmentation.
   */
  maskEdgeCertainty: number;

  /**
   * Average MediaPipe visibility score for the landmarks that anchor the
   * measurement being scored. 0 = fully occluded; 1 = fully visible.
   * Missing landmarks are the single greatest source of measurement error.
   */
  landmarkVisibility: number;

  /**
   * Agreement across scale anchors (pixel-per-cm from front, side, back views).
   * 0 = anchors contradict each other; 1 = perfect cross-anchor agreement.
   * Computed by scaleCalibration.ts (Task 4).
   */
  scaleAgreement: number;

  /**
   * Left-to-right view corroboration agreement.
   * 0 = maximum disagreement between left and right views;
   * 1 = no disagreement (identical measurements).
   * Caller normalizes raw centimetre disagreement using the scale appropriate
   * for the region (e.g., divide by LR_DISAGREEMENT_SCALE_CM and subtract from 1).
   */
  lrCorroboration: number;

  /**
   * Front-to-back view corroboration agreement.
   * 0 = maximum disagreement between front and back views;
   * 1 = no disagreement.
   * Caller normalizes raw centimetre disagreement as above.
   */
  fbCorroboration: number;

  /**
   * Population-prior plausibility score (sanity check).
   * 1 = measurement is well within the anthropometric prior for this person.
   * 0 = measurement is far outside the expected prior range.
   * Derived from a normalized Mahalanobis-style distance to the population prior.
   */
  populationPriorScore: number;
}

// ---- Section 8.3 / 17.5 named weights ----

/**
 * Named, frozen weights for each confidence input.
 * Weights sum to exactly 1.00.
 *
 * Design rationale:
 * - landmarkVisibility (0.30): missing or occluded landmarks are the primary
 *   source of geometric error in ellipse-based circumference estimation.
 * - captureQualityScore (0.25): blurry or poorly lit photos degrade all
 *   downstream geometry regardless of landmark presence.
 * - scaleAgreement (0.15): scale errors multiply through every measurement;
 *   cross-view disagreement is an early warning of a systematic bias.
 * - lrCorroboration (0.12): left-right disagreement flags asymmetric pose or
 *   silhouette occlusion that affects limb measurements.
 * - maskEdgeCertainty (0.10): noisy edges affect width-at-level estimates.
 * - fbCorroboration (0.05): front-back disagreement is less common but flags
 *   depth estimation errors on the side-view model.
 * - populationPriorScore (0.03): a soft sanity check; unusual measurements
 *   are flagged but not heavily penalized (rare morphology is valid).
 *
 * DO NOT scatter these as inline magic numbers. This is the single source.
 */
export const WEIGHTS: Readonly<Record<keyof ConfidenceInputs, number>> = Object.freeze({
  captureQualityScore: 0.25,
  maskEdgeCertainty: 0.10,
  landmarkVisibility: 0.30,
  scaleAgreement: 0.15,
  lrCorroboration: 0.12,
  fbCorroboration: 0.05,
  populationPriorScore: 0.03,
});

// Development-time guard: weights must sum to exactly 1. This throws at module
// load if the table is edited incorrectly, catching mistakes before tests run.
(function validateWeightSum() {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1.0) > 1e-9) {
    throw new Error(
      `confidenceModel: WEIGHTS must sum to 1.0 but sum to ${total}. Fix WEIGHTS.`
    );
  }
})();

// ---- Section 9.2 thresholds ----

/** Score at or above this threshold -> level 'high'. */
const HIGH_SCORE_THRESHOLD = 0.75;

/**
 * Score at or above this threshold (and below HIGH_SCORE_THRESHOLD)
 * -> level 'moderate'.
 * Score below this threshold -> level 'low'.
 */
const MODERATE_SCORE_THRESHOLD = 0.45;

/**
 * Score below which the caller MUST render the measurement as UNKNOWN
 * (or "estimated - low confidence") rather than as a precise value.
 *
 * RULE 9: this model returns score + level only. It never fabricates or
 * suppresses a number. The caller decides whether to display UNKNOWN.
 *
 * Guaranteed relationship: CONFIDENCE_THRESHOLD < MODERATE_SCORE_THRESHOLD,
 * so any score below CONFIDENCE_THRESHOLD also yields level 'low'.
 *
 * Per Section 9.2 of the scan accuracy spec.
 */
export const CONFIDENCE_THRESHOLD = 0.35;

// ---- Section 9.1 scoring function ----

/**
 * Derives a [0, 1] confidence score and a categorical level for a single
 * measurement, based on capture quality, silhouette certainty, landmark
 * visibility, scale agreement, left-right and front-back corroboration, and
 * population-prior plausibility.
 *
 * Pure function: no IO, no side effects, no mutation.
 *
 * All inputs are clamped to [0, 1]. Out-of-range inputs are accepted without
 * error but callers should normalize before calling.
 *
 * Score formula: weighted sum of clamped inputs using WEIGHTS (Section 8.3).
 * The resulting score is naturally in [0, 1] because weights sum to 1 and
 * all clamped inputs are in [0, 1].
 *
 * RULE 9 reminder: a score below CONFIDENCE_THRESHOLD signals UNKNOWN to the
 * caller. This function only returns the score and level; it never hides data.
 *
 * @param inputs - Section 9.1 confidence inputs, each normalized to [0, 1].
 * @returns { score: number; level: ConfidenceLevel }
 */
export function scoreMeasurementConfidence(
  inputs: ConfidenceInputs
): { score: number; level: ConfidenceLevel } {
  const clamp = (v: number): number => Math.max(0, Math.min(1, v));

  const score =
    WEIGHTS.captureQualityScore * clamp(inputs.captureQualityScore) +
    WEIGHTS.maskEdgeCertainty * clamp(inputs.maskEdgeCertainty) +
    WEIGHTS.landmarkVisibility * clamp(inputs.landmarkVisibility) +
    WEIGHTS.scaleAgreement * clamp(inputs.scaleAgreement) +
    WEIGHTS.lrCorroboration * clamp(inputs.lrCorroboration) +
    WEIGHTS.fbCorroboration * clamp(inputs.fbCorroboration) +
    WEIGHTS.populationPriorScore * clamp(inputs.populationPriorScore);

  let level: ConfidenceLevel;
  if (score >= HIGH_SCORE_THRESHOLD) {
    level = 'high';
  } else if (score >= MODERATE_SCORE_THRESHOLD) {
    level = 'moderate';
  } else {
    level = 'low';
  }

  return { score, level };
}
