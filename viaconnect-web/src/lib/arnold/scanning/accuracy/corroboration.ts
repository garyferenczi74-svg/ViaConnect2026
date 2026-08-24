// Task 6 (Prompt 210c) - Pure corroboration helpers for 4-view breadth checks.
//
// Implements Section 7.4 of the scan accuracy spec:
//   - L/R depth averaging: left and right side silhouette depths are averaged
//     per level (semi-axis b source). If one side is null the other is used
//     unchanged. If both null the depth is null (UNKNOWN).
//   - Asymmetry detection: normalized [0, 1] ratio measuring departure from
//     bilateral symmetry. Null when only one side is available.
//   - Front-back (fb) width corroboration: front widths checked against back
//     widths at the same body level. Large disagreement lowers confidence.
//   - All signals are normalized to [0, 1] and map directly to
//     ConfidenceInputs.lrCorroboration and ConfidenceInputs.fbCorroboration in
//     confidenceModel.ts (higher value = higher corroboration = higher confidence).
//
// Pure module: no IO, no side effects, no mutation.
// RULE 9: this module never fabricates measurements - averageDepths returns null
// when both inputs are null, signals return 0 when no data is available.
// No em-dashes, no en-dashes (hyphens in compound words are fine).
// Section 17.5: tolerances and weights are named exported consts, not literals.

// ---- Section 7.4 named constants (single source of truth) ----

/**
 * Maximum expected L/R depth difference (cm) before corroboration reaches 0.
 * A 5 cm L/R depth difference at any single level is near the plausible limit
 * of normal bilateral variation under good capture conditions. Larger
 * differences indicate a pose artefact, silhouette error, or misregistration.
 * Mapping: corroboration = max(0, 1 - diff / LR_DISAGREEMENT_SCALE_CM).
 */
export const LR_DISAGREEMENT_SCALE_CM = 5;

/**
 * Maximum expected front-back width difference (cm) before corroboration
 * reaches 0. Front and back silhouette widths at the same body level should
 * match closely when the subject stands squarely. A 6 cm mismatch suggests
 * rotation, silhouette error, or mis-registered capture.
 * Mapping: corroboration = max(0, 1 - diff / FB_DISAGREEMENT_SCALE_CM).
 */
export const FB_DISAGREEMENT_SCALE_CM = 6;

/**
 * Partial corroboration credit granted when only one side view is available.
 * 0.5 reflects that a single-source measurement is usable but uncorroborated.
 * Both the lrCorroborationScore and fbCorroborationScore functions return this
 * constant when exactly one of the two inputs is null.
 */
export const SINGLE_SOURCE_CREDIT = 0.5;

// ---- L/R depth averaging ----

/**
 * Average two optional depth measurements (cm).
 *
 * Null-safe: if one input is null the other is returned unchanged (no
 * fabrication). If both are null, returns null (UNKNOWN - RULE 9).
 * If both are present, returns the arithmetic mean.
 *
 * @param a - Left side depth in cm, or null if unavailable.
 * @param b - Right side depth in cm, or null if unavailable.
 * @returns Averaged depth in cm, or null when no data is available.
 */
export function averageDepths(a: number | null, b: number | null): number | null {
  if (a !== null && b !== null) return (a + b) / 2;
  if (a !== null) return a;
  if (b !== null) return b;
  return null;
}

// ---- L/R asymmetry signal ----

/**
 * Compute a normalized asymmetry score [0, 1] from two side-view depths.
 *
 * Formula: |a - b| / mean(a, b). Clamped to [0, 1].
 * 0 = perfectly symmetric (identical depths).
 * 1 = maximum asymmetry (one side is twice the other or more).
 * null = cannot assess asymmetry because at least one side is missing.
 *
 * RULE 9: returns null rather than fabricating a score from a single source.
 *
 * @param a - Left side depth in cm, or null if unavailable.
 * @param b - Right side depth in cm, or null if unavailable.
 * @returns Asymmetry score in [0, 1], or null when single-source.
 */
export function lrAsymmetryScore(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  const mean = (a + b) / 2;
  if (mean === 0) return null; // avoid division by zero
  return Math.min(1, Math.abs(a - b) / mean);
}

// ---- L/R corroboration signal ----

/**
 * Compute a [0, 1] L/R depth corroboration score for one body level.
 *
 * 1.0 = identical depths (perfect corroboration).
 * 0.0 = |a - b| >= LR_DISAGREEMENT_SCALE_CM (maximum disagreement), or both null.
 * SINGLE_SOURCE_CREDIT = one side null (partial, single-source corroboration).
 *
 * This value maps directly to ConfidenceInputs.lrCorroboration when aggregated
 * across all measured levels via aggregateLrCorroboration.
 *
 * @param a - Left side depth in cm, or null.
 * @param b - Right side depth in cm, or null.
 * @returns Corroboration score in [0, 1].
 */
export function lrCorroborationScore(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null || b === null) return SINGLE_SOURCE_CREDIT;
  const diff = Math.abs(a - b);
  return Math.max(0, 1 - diff / LR_DISAGREEMENT_SCALE_CM);
}

// ---- Front-back corroboration signal ----

/**
 * Compute a [0, 1] front-back width corroboration score for one body level.
 *
 * 1.0 = front and back widths agree exactly.
 * 0.0 = |front - back| >= FB_DISAGREEMENT_SCALE_CM, or both null.
 * SINGLE_SOURCE_CREDIT = back view not available (no back silhouette).
 *
 * Assumption: Y-coordinates from front landmarks are transferable to the back
 * silhouette (same camera height, consistent framing across the 4-photo capture
 * session). This is a first-order approximation; cross-view registration is out
 * of scope for Task 6.
 *
 * This value maps directly to ConfidenceInputs.fbCorroboration when aggregated
 * via aggregateFbCorroboration.
 *
 * @param frontWidth - Width from front silhouette in cm, or null.
 * @param backWidth  - Width from back silhouette in cm, or null.
 * @returns Corroboration score in [0, 1].
 */
export function fbCorroborationScore(frontWidth: number | null, backWidth: number | null): number {
  if (frontWidth === null && backWidth === null) return 0;
  if (frontWidth === null || backWidth === null) return SINGLE_SOURCE_CREDIT;
  const diff = Math.abs(frontWidth - backWidth);
  return Math.max(0, 1 - diff / FB_DISAGREEMENT_SCALE_CM);
}

// ---- Aggregate helpers ----

/**
 * Average per-level L/R corroboration scores into one summary score.
 * Returns 0 when no levels are available (no side-view data at all).
 *
 * @param scores - Array of per-level lrCorroborationScore values.
 * @returns Mean corroboration score in [0, 1], or 0 for empty input.
 */
export function aggregateLrCorroboration(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Average per-level front-back corroboration scores into one summary score.
 * Returns 0 when no levels are available (no back-view data at all).
 *
 * @param scores - Array of per-level fbCorroborationScore values.
 * @returns Mean corroboration score in [0, 1], or 0 for empty input.
 */
export function aggregateFbCorroboration(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Average per-level asymmetry scores, ignoring null (single-source) entries.
 * Returns null when all entries are null or the input is empty (no bilateral
 * data available - RULE 9, no fabrication).
 *
 * @param scores - Array of per-level lrAsymmetryScore values (may contain nulls).
 * @returns Mean asymmetry in [0, 1], or null when no bilateral data.
 */
export function aggregateLrAsymmetry(scores: Array<number | null>): number | null {
  const defined = scores.filter((s): s is number => s !== null);
  if (defined.length === 0) return null;
  return defined.reduce((sum, s) => sum + s, 0) / defined.length;
}
