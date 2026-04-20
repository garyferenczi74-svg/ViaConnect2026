// Prompt #98 Phase 4: Status tier calculator.
//
// Pure. Maps a successful-referral count to one of the four private
// tiers (none / bronze / silver / gold) per spec. Tier achievement
// notifications fire only when the practitioner crosses INTO a new
// tier; downgrades (which should not happen but defend against
// clawback edge cases) never trigger.

import { TIER_THRESHOLDS_DEFAULT, type StatusTier } from './schema-types';

export interface TierThresholds {
  bronze: number;
  silver: number;
  gold: number;
}

export function calculateTierForCount(
  count: number,
  thresholds: TierThresholds = TIER_THRESHOLDS_DEFAULT,
): StatusTier {
  if (count >= thresholds.gold) return 'gold_referrer';
  if (count >= thresholds.silver) return 'silver_referrer';
  if (count >= thresholds.bronze) return 'bronze_referrer';
  return 'none';
}

const TIER_ORDER: StatusTier[] = ['none', 'bronze_referrer', 'silver_referrer', 'gold_referrer'];

/**
 * Returns the newly-earned tier when the practitioner moved up. Null
 * on no change or downgrade.
 */
export function detectNewlyEarnedTier(
  prevTier: StatusTier,
  nextTier: StatusTier,
): StatusTier | null {
  const prevIdx = TIER_ORDER.indexOf(prevTier);
  const nextIdx = TIER_ORDER.indexOf(nextTier);
  if (nextIdx > prevIdx && nextTier !== 'none') return nextTier;
  return null;
}
