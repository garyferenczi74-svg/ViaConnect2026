// Prompt #102 Workstream A — volume sanity check logic.

/** Ratio threshold above which a channel's apparent retail volume is
 *  considered implausible given the practitioner's wholesale inventory.
 *  §4.4 spec: > 2.0 sustained over 7 consecutive days triggers. */
export const VOLUME_FLAG_RATIO_THRESHOLD = 2.0;
export const VOLUME_FLAG_CONSECUTIVE_DAYS = 7;

export interface VolumeCheckInput {
  apparentRetailCents: number;
  wholesaleInventoryCents: number;
}

/** Pure: compute the ratio. Returns Infinity when wholesale is 0 but
 *  retail is positive (definitely flagged); returns 0 when retail is
 *  0 (clean). */
export function computeRatio({
  apparentRetailCents,
  wholesaleInventoryCents,
}: VolumeCheckInput): number {
  if (apparentRetailCents <= 0) return 0;
  if (wholesaleInventoryCents <= 0) return Number.POSITIVE_INFINITY;
  return apparentRetailCents / wholesaleInventoryCents;
}

/** Pure: should this day's observation be flagged? */
export function isSingleDayFlagged(input: VolumeCheckInput): boolean {
  return computeRatio(input) > VOLUME_FLAG_RATIO_THRESHOLD;
}

/** Pure: would the sustained window trigger a channel flag? Caller
 *  passes the last N days of per-day ratios; we require all N to be
 *  above the threshold. */
export function shouldFlagChannelFromSustained(
  lastNDaysRatios: readonly number[],
): boolean {
  if (lastNDaysRatios.length < VOLUME_FLAG_CONSECUTIVE_DAYS) return false;
  const window = lastNDaysRatios.slice(-VOLUME_FLAG_CONSECUTIVE_DAYS);
  return window.every((r) => r > VOLUME_FLAG_RATIO_THRESHOLD);
}
