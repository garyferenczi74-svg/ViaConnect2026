// Score-to-Helix-Rewards point award rules (Prompt #62d).
//
// Pure logic — given gauge score deltas, the user's tier, and which
// awards they've already received today, return the events to write.
// Persistence and frequency-cap enforcement live in the cron / API
// route that calls this; this module is deliberately stateless.

import type { GaugeId } from './dailyScoreEngine';

export type HelixTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export const HELIX_TIER_MULTIPLIERS: Record<HelixTier, number> = {
  Bronze: 1,
  Silver: 1.5,
  Gold: 2,
  Platinum: 5,
  Diamond: 5,
};

export type HelixEventType =
  | 'score_improvement'
  | 'score_milestone'
  | 'daily_achievement'
  | 'streak_bonus'
  | 'weekly_progress'
  | 'onboarding_bonus'
  | 'protocol_adherence';

export interface HelixScoreEvent {
  eventType: HelixEventType;
  gaugeId: GaugeId | null;
  pointsBase: number;
  tierMultiplier: number;
  pointsAwarded: number;
  reason: string;
}

interface ScoreSnapshot {
  gaugeId: GaugeId;
  oldScore: number;
  newScore: number;
}

export interface ScoreEventInput {
  /** Per-gauge score deltas to evaluate. */
  changes: ScoreSnapshot[];
  /** Snapshot of every gauge after the change (for daily-achievement checks). */
  allCurrent: Record<GaugeId, number>;
  tier: HelixTier;
  /** Event keys already awarded today, used to enforce frequency caps. */
  awardedToday: Set<string>;
}

const award = (
  eventType: HelixEventType,
  gaugeId: GaugeId | null,
  base: number,
  tier: HelixTier,
  reason: string,
): HelixScoreEvent => {
  const multiplier = HELIX_TIER_MULTIPLIERS[tier];
  return {
    eventType,
    gaugeId,
    pointsBase: base,
    tierMultiplier: multiplier,
    pointsAwarded: Math.round(base * multiplier),
    reason,
  };
};

const dailyKey = (event: HelixEventType, gaugeId: GaugeId | null, suffix = '') =>
  `${event}:${gaugeId ?? 'composite'}${suffix ? ':' + suffix : ''}`;

export function evaluateScoreEvents(input: ScoreEventInput): HelixScoreEvent[] {
  const { changes, allCurrent, tier, awardedToday } = input;
  const events: HelixScoreEvent[] = [];

  for (const change of changes) {
    const { gaugeId, oldScore, newScore } = change;

    if (newScore - oldScore >= 5) {
      const key = dailyKey('score_improvement', gaugeId);
      if (!awardedToday.has(key)) {
        events.push(
          award('score_improvement', gaugeId, 10, tier, `${gaugeId} +${newScore - oldScore}`),
        );
        awardedToday.add(key);
      }
    }

    if (oldScore < 75 && newScore >= 75) {
      const key = dailyKey('score_milestone', gaugeId, 'good');
      if (!awardedToday.has(key)) {
        events.push(award('score_milestone', gaugeId, 25, tier, `${gaugeId} hit Good`));
        awardedToday.add(key);
      }
    }

    if (oldScore < 90 && newScore >= 90) {
      const key = dailyKey('score_milestone', gaugeId, 'excellent');
      if (!awardedToday.has(key)) {
        events.push(award('score_milestone', gaugeId, 50, tier, `${gaugeId} hit Excellent`));
        awardedToday.add(key);
      }
    }
  }

  const allValues = Object.values(allCurrent);
  const allAbove50 = allValues.length === 8 && allValues.every((v) => v >= 50);
  const allAbove75 = allValues.length === 8 && allValues.every((v) => v >= 75);

  const dailyKey50 = dailyKey('daily_achievement', null, '50');
  if (allAbove50 && !awardedToday.has(dailyKey50)) {
    events.push(award('daily_achievement', null, 100, tier, 'All 8 above 50'));
    awardedToday.add(dailyKey50);
  }

  const dailyKey75 = dailyKey('daily_achievement', null, '75');
  if (allAbove75 && !awardedToday.has(dailyKey75)) {
    events.push(award('daily_achievement', null, 250, tier, 'Perfect Day — all 8 above 75'));
    awardedToday.add(dailyKey75);
  }

  return events;
}

export function streakBonus(streakDays: number, tier: HelixTier): HelixScoreEvent | null {
  if (streakDays === 7) return award('streak_bonus', null, 75, tier, '7-day streak');
  if (streakDays === 30) return award('streak_bonus', null, 500, tier, '30-day streak');
  return null;
}
