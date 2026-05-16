// =============================================================================
// body-scan-analyze/constants.ts
//
// Deno-runtime constants that MUST stay in sync with:
//   viaconnect-web/src/lib/body-tracker/scan-constants.ts
//
// Deno Edge Functions run in an isolated V8 context and cannot import from
// src/lib. Any constant changed there must be mirrored here and vice versa.
// Verify both files on every future change to either.
// =============================================================================

/** Minimum number of historical scans required before personal baseline is computable. */
export const PERSONAL_BASELINE_BOOTSTRAP_SCANS = 3;

/** Sigma multiple beyond which a new reading is flagged as an outlier. */
export const OUTLIER_SIGMA_THRESHOLD = 2;

/**
 * Confidence target (percentage) for each tier badge.
 * Source: TIER_BADGE_META in src/lib/body-tracker/scan-tier.ts.
 */
export const TIER_CONFIDENCE_PCT: Record<1 | 2 | 3, number> = {
  1: 78,
  2: 90,
  3: 96,
};

/** 95% CI Z-score used for baseline confidence interval half-width. */
export const CI_Z_95 = 1.96;

// CAQ Phase 1 demographics delta thresholds (§7).
// Source: src/lib/body-tracker/caq-xref.ts HEIGHT_THRESHOLD_CM / WEIGHT_THRESHOLD_KG.
export const CAQ_HEIGHT_THRESHOLD_CM = 5;
export const CAQ_WEIGHT_THRESHOLD_KG = 5;
