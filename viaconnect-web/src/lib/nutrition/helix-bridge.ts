// Prompt #160 section 8: Helix Rewards integration point.
//
// Consumer portal only. Practitioner portal sees only the aggregate
// engagement score 0 to 100; this module must never surface point counts
// or earning events to practitioners.
//
// TODO(#160 follow-up): wire to the existing awardHelixPoints helper once
// located. Source values per spec:
//   nutrition_log_text                      5 points (capped 4 awards / day)
//   nutrition_log_photo                     5 points (capped 4 awards / day)
//   nutrition_achievement_first_photo      10 points (one-time)
//   nutrition_achievement_streak_7         15 points (7-day streak, 3 logs / day)
//
// This stub centralizes the call site so the integration can be activated
// without re-touching the route handlers.

import type { NutritionSource } from './schema';

interface AwardArgs {
  readonly userId: string;
  readonly source: NutritionSource;
}

export async function awardNutritionLogPoints(args: AwardArgs): Promise<void> {
  // TODO(#160 follow-up): replace with live awardHelixPoints + daily cap +
  // achievement bonuses (first photo, 7-day streak).
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[helix-bridge] awardNutritionLogPoints queued', JSON.stringify(args));
  }
}
