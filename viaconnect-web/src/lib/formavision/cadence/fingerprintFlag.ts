// Prompt 211a Workstream 4 (Part 2) - Fingerprint FLAG display decision (pure).
//
// The outlier fingerprint flag must appear BEFORE a sharply-different-condition
// scan enters the trend displays, so a lighting/time change is not mistaken for
// a real body change. This module turns the W4-1 scoreConditionFingerprint
// result into a simple UI decision the flag component renders. It is pure: it
// only re-shapes the existing score, never recomputes the verdict, and stays
// honest (no flag when history is thin and the verdict is UNKNOWN).

import {
  scoreConditionFingerprint,
  type ScanConditionFingerprint,
  type ConditionFingerprintScore,
} from './fingerprint';

/** The flag decision the UI renders before a scan enters the trend. */
export interface FingerprintFlagDecision {
  /** True only when the scan is a genuine outlier and should be flagged. */
  showFlag: boolean;
  /** The kind, honest reason from the score (dash-free). */
  reason: string;
  /** The consistency score in [0,1], or null when UNKNOWN (thin history). */
  consistencyScore: number | null;
}

/**
 * Decides whether to show the outlier flag for a scan before it joins the trend.
 *
 * The flag shows ONLY when scoreConditionFingerprint marks the scan an outlier
 * (which itself requires enough history). With thin history the verdict is
 * UNKNOWN and no flag is shown: we never flag a scan we cannot judge.
 *
 * @param scanConditions The fingerprint of the scan about to enter the trend.
 * @param historyFingerprints The user's prior scan fingerprints (excludes this).
 * @returns A FingerprintFlagDecision. Inputs are not mutated.
 */
export function decideFingerprintFlag(
  scanConditions: ScanConditionFingerprint,
  historyFingerprints: ScanConditionFingerprint[],
): FingerprintFlagDecision {
  const score: ConditionFingerprintScore = scoreConditionFingerprint(
    scanConditions,
    historyFingerprints,
  );
  return {
    showFlag: score.isOutlier,
    reason: score.reason,
    consistencyScore: score.consistencyScore,
  };
}
