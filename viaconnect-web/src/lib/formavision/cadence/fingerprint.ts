// Prompt 211a Workstream 4 (Part 1) - Scan condition fingerprint pure logic.
//
// A scan's "condition fingerprint" is the set of capture conditions under which
// it was taken: the time-of-day bucket, the lighting grade, and the pose / scan
// quality. These fields already live on existing tables (no new table was
// added, see 20260710120000_prompt_211a_scan_cadence.sql):
//   * body_photo_sessions.scan_quality_score  -> scanQualityScore
//   * body_photo_sessions.lighting_condition   -> lightingGrade
//   * body_photo_sessions.session_date/created_at (bucketed) -> timeOfDay
//   * captureQuality assessCaptureQuality score -> poseQuality
// The caller assembles a plain ScanConditionFingerprint from those columns and
// passes it here. This module does no IO and has no side effects.
//
// Two honest jobs:
//   1. scoreConditionFingerprint flags a scan whose conditions differ sharply
//      from the user's OWN norm BEFORE a trend is displayed, so a change caused
//      by lighting or time of day is not mistaken for a real body change. The
//      reason text is kind and honest (Hannah tone, no dashes).
//   2. buildConsistencyTip surfaces the user's OWN best conditions from THEIR
//      history ("your clearest scans are mornings by the window"), never a
//      generic template. Both return null / UNKNOWN honestly on thin history and
//      never fabricate a verdict the data cannot support (RULE 9).

/** Coarse time-of-day bucket derived from the scan timestamp. */
export type TimeOfDayBucket = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Lighting grade. Reuses the body_photo_sessions.lighting_condition CHECK
 * domain (20260416000090) so the fingerprint reads the stored column directly.
 */
export type LightingGrade = 'natural' | 'indoor_bright' | 'indoor_dim' | 'unknown';

/**
 * The capture conditions of a single scan, assembled by the caller from
 * existing columns. poseQuality and scanQualityScore are each in [0, 1].
 */
export interface ScanConditionFingerprint {
  timeOfDay: TimeOfDayBucket;
  lightingGrade: LightingGrade;
  /** Pose quality in [0, 1] (e.g. captureQuality assessCaptureQuality score). */
  poseQuality: number;
  /** body_photo_sessions.scan_quality_score in [0, 1]. */
  scanQualityScore: number;
}

/**
 * Result of scoring a scan against the user's history.
 *
 * consistencyScore is in [0, 1] (1 = perfectly matches the user norm), or null
 * when history is too thin to judge. null is the honest UNKNOWN signal; a
 * fabricated 0 is never returned for absent history (RULE 9).
 *
 * isOutlier is true only when there is enough history AND the scan differs
 * sharply from the norm. With thin history it is always false (we do not know).
 *
 * reason is short, kind, honest copy with zero dashes.
 */
export interface ConditionFingerprintScore {
  consistencyScore: number | null;
  isOutlier: boolean;
  reason: string;
}

/** Minimum prior scans required before a fingerprint verdict can be trusted. */
export const MIN_HISTORY_FOR_FINGERPRINT = 3;

/** Minimum prior scans required before a personalised consistency tip is offered. */
export const MIN_HISTORY_FOR_TIP = 3;

/** Consistency at or below this is treated as a sharp difference (outlier). */
export const OUTLIER_THRESHOLD = 0.5;

// Component weights for the consistency score. They sum to 1.
const WEIGHT_TIME = 0.3;
const WEIGHT_LIGHTING = 0.35;
const WEIGHT_QUALITY = 0.35;

/** Human phrase for each time bucket, used in tips and reasons. */
const TIME_PHRASE: Record<TimeOfDayBucket, string> = {
  morning: 'mornings',
  afternoon: 'afternoons',
  evening: 'evenings',
  night: 'late at night',
};

/** Human phrase for each lighting grade. "window" anchors the natural case. */
const LIGHTING_PHRASE: Record<LightingGrade, string> = {
  natural: 'by the window in natural light',
  indoor_bright: 'in bright indoor light',
  indoor_dim: 'in dim indoor light',
  unknown: 'in your usual light',
};

/** Returns the most frequent value in a list, breaking ties by total quality. */
function dominantByFrequencyThenQuality<T extends string>(
  history: ScanConditionFingerprint[],
  pick: (f: ScanConditionFingerprint) => T,
): T {
  const count = new Map<T, number>();
  const qualitySum = new Map<T, number>();
  for (const f of history) {
    const key = pick(f);
    count.set(key, (count.get(key) ?? 0) + 1);
    qualitySum.set(key, (qualitySum.get(key) ?? 0) + f.scanQualityScore);
  }
  let best: T | null = null;
  let bestCount = -1;
  let bestQuality = -1;
  for (const [key, c] of count) {
    const q = qualitySum.get(key) ?? 0;
    if (c > bestCount || (c === bestCount && q > bestQuality)) {
      best = key;
      bestCount = c;
      bestQuality = q;
    }
  }
  // history is non-empty by caller contract, so best is set.
  return best as T;
}

/** Mean of a numeric selector over history. history must be non-empty. */
function mean(history: ScanConditionFingerprint[], pick: (f: ScanConditionFingerprint) => number): number {
  let sum = 0;
  for (const f of history) {
    sum += pick(f);
  }
  return sum / history.length;
}

/**
 * Scores a scan's conditions against the user's own history and flags it as an
 * outlier when it differs sharply from their norm.
 *
 * With fewer than MIN_HISTORY_FOR_FINGERPRINT prior scans the norm is unknown,
 * so consistencyScore is null, isOutlier is false, and reason says UNKNOWN. This
 * is deliberate: we never invent a verdict from too little data.
 *
 * @param scanConditions The fingerprint of the scan being evaluated.
 * @param historyFingerprints The user's prior scan fingerprints (excludes this scan).
 * @returns ConditionFingerprintScore. Inputs are not mutated.
 */
export function scoreConditionFingerprint(
  scanConditions: ScanConditionFingerprint,
  historyFingerprints: ScanConditionFingerprint[],
): ConditionFingerprintScore {
  if (historyFingerprints.length < MIN_HISTORY_FOR_FINGERPRINT) {
    return {
      consistencyScore: null,
      isOutlier: false,
      reason:
        'UNKNOWN so far. I need a few more scans in your usual setup before I can tell whether this one looks different.',
    };
  }

  const normTime = dominantByFrequencyThenQuality(historyFingerprints, (f) => f.timeOfDay);
  const normLighting = dominantByFrequencyThenQuality(historyFingerprints, (f) => f.lightingGrade);
  const normQuality = mean(historyFingerprints, (f) => (f.poseQuality + f.scanQualityScore) / 2);

  const timeMatch = scanConditions.timeOfDay === normTime ? 1 : 0;
  const lightingMatch = scanConditions.lightingGrade === normLighting ? 1 : 0;
  const thisQuality = (scanConditions.poseQuality + scanConditions.scanQualityScore) / 2;
  // Quality similarity: 1 when at or above the norm, dropping as it falls below.
  const qualityMatch = normQuality <= 0 ? 1 : Math.max(0, Math.min(1, thisQuality / normQuality));

  const consistencyScore = Math.max(
    0,
    Math.min(1, WEIGHT_TIME * timeMatch + WEIGHT_LIGHTING * lightingMatch + WEIGHT_QUALITY * qualityMatch),
  );

  const isOutlier = consistencyScore <= OUTLIER_THRESHOLD;

  let reason: string;
  if (isOutlier) {
    const diffs: string[] = [];
    if (timeMatch === 0) {
      diffs.push(`you usually scan in the ${normTime}`);
    }
    if (lightingMatch === 0) {
      diffs.push(`your other scans are ${LIGHTING_PHRASE[normLighting]}`);
    }
    if (qualityMatch < 1) {
      diffs.push('this capture came out a little softer than your norm');
    }
    const detail = diffs.length > 0 ? diffs.join(', and ') : 'the setup looks different from your norm';
    reason =
      `This scan was taken in different conditions than usual (${detail}), ` +
      'so I want to flag it before we read too much into the change. Nothing wrong, just being careful.';
  } else {
    reason = 'This scan matches your usual setup nicely, so the comparison should be a fair one.';
  }

  return { consistencyScore, isOutlier, reason };
}

/**
 * Builds a warm, personalised tip naming the user's OWN best scan conditions,
 * derived from THEIR history. The "best" time and lighting are the buckets whose
 * scans came out clearest (highest quality), so the advice reflects what has
 * actually worked for this person, not a generic default.
 *
 * Returns null honestly when there are fewer than MIN_HISTORY_FOR_TIP prior
 * scans: with too little history we cannot know a best condition and must not
 * fabricate one.
 *
 * @param historyFingerprints The user's prior scan fingerprints.
 * @returns A dash-free tip string, or null when history is too thin.
 */
export function buildConsistencyTip(historyFingerprints: ScanConditionFingerprint[]): string | null {
  if (historyFingerprints.length < MIN_HISTORY_FOR_TIP) {
    return null;
  }

  // Rank buckets by average quality, so the tip names where scans came out best.
  const bestTime = bestBucketByAverageQuality(historyFingerprints, (f) => f.timeOfDay);
  const bestLighting = bestBucketByAverageQuality(historyFingerprints, (f) => f.lightingGrade);

  const timePhrase = TIME_PHRASE[bestTime];
  const lightingPhrase = LIGHTING_PHRASE[bestLighting];

  return `Your clearest scans are ${timePhrase} ${lightingPhrase}. Aiming for that when you can keeps your comparisons honest.`;
}

/** Returns the bucket whose scans have the highest average quality. */
function bestBucketByAverageQuality<T extends string>(
  history: ScanConditionFingerprint[],
  pick: (f: ScanConditionFingerprint) => T,
): T {
  const sum = new Map<T, number>();
  const count = new Map<T, number>();
  for (const f of history) {
    const key = pick(f);
    const q = (f.poseQuality + f.scanQualityScore) / 2;
    sum.set(key, (sum.get(key) ?? 0) + q);
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestAvg = -1;
  let bestCount = -1;
  for (const [key, c] of count) {
    const avg = (sum.get(key) ?? 0) / c;
    // Higher average wins; ties broken by more scans in that bucket.
    if (avg > bestAvg || (avg === bestAvg && c > bestCount)) {
      best = key;
      bestAvg = avg;
      bestCount = c;
    }
  }
  return best as T;
}
