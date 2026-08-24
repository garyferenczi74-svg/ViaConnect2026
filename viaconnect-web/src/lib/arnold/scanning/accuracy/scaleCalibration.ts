// Task 4 (Prompt 210c) - Scale cross-check across views + scale confidence.
//
// Implements Section 6.1 (cross-view scale reconciliation) and Section 6.4
// (scale-agreement signal feeding the Task 2 confidence model).
//
// Design decisions documented here (Section 17.5 discipline: no magic literals):
//
//   Reconciliation strategy: arithmetic mean of all available anchors.
//     Rationale: all anchors derive from the same physical constant (body
//     height). The mean is unbiased when errors are symmetric and the number
//     of anchors is small (2-3). Median is equivalent for <=3 anchors and
//     identical for 2; mean is simpler to reason about for the test suite.
//
//   Agreement metric: 1 - (spread / mean), clamped to [0, 1].
//     spread = max(anchors) - min(anchors).
//     This is a simple relative-range measure: when all anchors agree
//     perfectly, spread = 0 and agreement = 1. When the spread equals the
//     mean, agreement = 0. The clamping ensures the contract [0, 1] even
//     for pathological inputs.
//
//   Single-source agreement: SINGLE_SOURCE_AGREEMENT (< 1 because we cannot
//     cross-check, > 0 because we do have one value). Set to 0.60 to
//     communicate to the confidence model that scale has not been verified.
//
//   Disagreement flag threshold: DISAGREEMENT_RELATIVE_SPREAD_THRESHOLD.
//     Flagged when (max - min) / mean > this value.
//     Set to 0.10 (10% relative spread) per Section 6.1: "flag a large
//     disagreement". 10% in scale translates to 10% in every linear
//     measurement derived from that scale, which exceeds the per-measurement
//     percentage tolerance from accuracyTargets.ts (PER_MEASUREMENT_PCT = 0.10).
//     At exactly 10% the flag triggers to be conservative.
//
//   Mapping to scaleAgreement in confidenceModel.ts: the returned `agreement`
//     value is in [0, 1] and maps directly to ConfidenceInputs.scaleAgreement.
//     No further transformation is needed by the caller.
//
// RULE 9: when no anchor is present, scaleCmPerPx is null (UNKNOWN), never 0,
// never fabricated.

// ---- Named constants (single source - do NOT scatter as inline literals) ----

/**
 * Agreement value returned when exactly one scale anchor is available.
 * Cross-verification is not possible, so full confidence (1.0) is not
 * warranted. The value 0.60 is a deliberate mid-range signal: there IS a
 * scale estimate, but it has not been corroborated.
 */
const SINGLE_SOURCE_AGREEMENT = 0.60;

/**
 * Relative spread threshold above which disagreementFlag is set true.
 * Relative spread = (max_anchor - min_anchor) / mean_anchor.
 * At 0.10 (10%), a scale disagreement exceeds the PER_MEASUREMENT_PCT band
 * from accuracyTargets.ts and is considered large enough to flag.
 */
const DISAGREEMENT_RELATIVE_SPREAD_THRESHOLD = 0.10;

/**
 * Normalization factor for the agreement metric.
 * agreement = clamp(1 - relativeSpread / AGREEMENT_NORMALIZATION, 0, 1)
 *
 * Chosen as 2 * DISAGREEMENT_RELATIVE_SPREAD_THRESHOLD (= 0.20) so that
 * the flag threshold (10% spread) maps to exactly agreement = 0.5. This
 * gives a semantically clean boundary: flagged spreads always produce
 * agreement < 0.5; unflagged spreads always produce agreement >= 0.5.
 * Spreads at or above 20% produce agreement = 0 (clamped).
 */
const AGREEMENT_NORMALIZATION = 2 * DISAGREEMENT_RELATIVE_SPREAD_THRESHOLD;

// ---- Public interface ----

/**
 * Inputs to reconcileScale. All scale values are in cm per pixel,
 * matching the convention used by computeScale() in silhouetteProcessor.ts:
 *   measurement_cm = width_px * scaleCmPerPx
 *
 * frontScaleCmPerPx  - height-derived scale from the front-pose silhouette.
 * sideScaleCmPerPx   - height-derived scale from the side-pose silhouette.
 * refObjectScaleCmPerPx - OPTIONAL reference-object anchor from
 *   scaleFromReference() in referenceObjectScale.ts. Included ONLY when the
 *   user has explicitly opted in (Section 6.2). Absent (undefined) = not
 *   participating in reconciliation.
 * depthScaleCmPerPx - OPTIONAL ARKit/ARCore depth-derived scale anchor from
 *   depthDerivedScaleCmPerPx() in depthScale.ts (Task 14). Uses the thin-lens
 *   projection formula (physicalSizePerPixel = depthM / focalLengthPx) to
 *   derive scale from metric depth + camera intrinsics. Absent (undefined) =
 *   not participating in reconciliation (device has no LiDAR/ARCore, or depth
 *   probe returned false). This anchor degrades gracefully when absent.
 */
export interface ReconcileScaleInputs {
  frontScaleCmPerPx: number | null;
  sideScaleCmPerPx: number | null;
  refObjectScaleCmPerPx?: number | null;
  /** Task 14: optional depth-camera-derived scale anchor. Absent = not participating. */
  depthScaleCmPerPx?: number | null;
}

/**
 * Output of reconcileScale.
 *
 * scaleCmPerPx  - the reconciled cm-per-pixel scale (mean of available
 *   anchors), or null when no anchor is available (RULE 9: UNKNOWN).
 *
 * agreement  - [0, 1]. How closely the available anchors agree.
 *   1 = perfect match. 0 = no information or maximum divergence.
 *   Maps directly to ConfidenceInputs.scaleAgreement (Task 2).
 *   Special cases:
 *     - No anchors: 0 (no information at all).
 *     - One anchor: SINGLE_SOURCE_AGREEMENT (cannot cross-check).
 *     - Multiple anchors: computed from relative spread.
 *
 * disagreementFlag  - true when the relative spread across anchors exceeds
 *   DISAGREEMENT_RELATIVE_SPREAD_THRESHOLD. Always false when fewer than
 *   two anchors are present (no disagreement to measure).
 */
export interface ReconcileScaleResult {
  scaleCmPerPx: number | null;
  agreement: number;
  disagreementFlag: boolean;
}

// ---- Implementation ----

/**
 * Reconciles independent scale anchors (height-derived per-pose scales from
 * the front and/or side silhouettes, plus an optional reference-object scale
 * when the user has opted in) into a single cm-per-pixel estimate with a
 * cross-anchor agreement score.
 *
 * Pure function: no IO, no side effects, no mutation.
 *
 * See module-level comment for the full design rationale.
 */
export function reconcileScale(inputs: ReconcileScaleInputs): ReconcileScaleResult {
  // Collect all available anchors (positive, finite values only).
  const anchors: number[] = [];
  if (isValidAnchor(inputs.frontScaleCmPerPx)) anchors.push(inputs.frontScaleCmPerPx!);
  if (isValidAnchor(inputs.sideScaleCmPerPx)) anchors.push(inputs.sideScaleCmPerPx!);
  if (isValidAnchor(inputs.refObjectScaleCmPerPx)) anchors.push(inputs.refObjectScaleCmPerPx!);
  // Task 14: depth-derived scale anchor (ARKit/ARCore). Participates when
  // present and valid. Absent when device has no LiDAR/ARCore depth, or when
  // probeDepthCapability() returned false (graceful degradation).
  if (isValidAnchor(inputs.depthScaleCmPerPx)) anchors.push(inputs.depthScaleCmPerPx!);

  // No anchors: UNKNOWN (RULE 9).
  if (anchors.length === 0) {
    return { scaleCmPerPx: null, agreement: 0, disagreementFlag: false };
  }

  // Single anchor: return it with the documented neutral single-source
  // agreement (cannot cross-check, flag is meaningless).
  if (anchors.length === 1) {
    return {
      scaleCmPerPx: anchors[0],
      agreement: SINGLE_SOURCE_AGREEMENT,
      disagreementFlag: false,
    };
  }

  // Multiple anchors: compute mean, spread, and agreement.
  const mean = anchors.reduce((sum, v) => sum + v, 0) / anchors.length;
  const maxA = Math.max(...anchors);
  const minA = Math.min(...anchors);
  const spread = maxA - minA;

  // Relative spread: how large is the spread relative to the mean?
  // When mean is somehow 0 (should not happen given isValidAnchor), clamp to 0.
  const relativeSpread = mean > 0 ? spread / mean : 0;

  // Agreement formula: 1 - relativeSpread / AGREEMENT_NORMALIZATION, clamped to [0, 1].
  // The normalization factor maps the flag threshold to exactly 0.5, so flagged
  // spreads always produce agreement < 0.5 and unflagged spreads >= 0.5.
  const agreement = Math.max(0, Math.min(1, 1 - relativeSpread / AGREEMENT_NORMALIZATION));

  const disagreementFlag = relativeSpread >= DISAGREEMENT_RELATIVE_SPREAD_THRESHOLD;

  return { scaleCmPerPx: mean, agreement, disagreementFlag };
}

// ---- Private helpers ----

/**
 * Returns true when a value is a positive, finite, non-NaN number suitable
 * for use as a scale anchor.
 */
function isValidAnchor(v: number | null | undefined): v is number {
  return typeof v === 'number' && isFinite(v) && v > 0;
}
