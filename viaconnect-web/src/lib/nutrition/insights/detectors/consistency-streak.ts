// Prompt 192 Task 2: consistency_streak detector (daily).
//
// Positive reinforcement ONLY. The fact reports a running streak of days
// with at least one scored meal; a short or broken streak emits nothing at
// all (no shaming framing anywhere in the facts), and severity is always
// 'positive'. The streak ends yesterday, or today when today already has a
// scored meal.

import { makeFingerprint } from '../fingerprint';
import { addDays, localDateOf } from '../time';
import type { DetectorInput, InsightFact } from '../types';
import { clampMagnitude, mealsByDate, scoredMeals, yesterdayLocal } from './shared';

const MIN_STREAK_DAYS = 3;

export function detectConsistencyStreak(input: DetectorInput): InsightFact[] {
  const byDate = mealsByDate(scoredMeals(input));
  if (byDate.size === 0) return [];

  const today = localDateOf(input.now, input.timezone);
  const endDate = byDate.has(today) ? today : yesterdayLocal(input);
  if (!byDate.has(endDate)) return [];

  let streakDays = 0;
  let cursor = endDate;
  while (byDate.has(cursor)) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }
  if (streakDays < MIN_STREAK_DAYS) return [];

  return [
    {
      type: 'consistency_streak',
      horizon: 'daily',
      severity: 'positive',
      confidence: 'high',
      factFingerprint: makeFingerprint('consistency_streak', 'daily', { streakDays }),
      snapshot: {
        streakDays,
        endDate,
        magnitudePct: clampMagnitude(streakDays * 10),
      },
      productSuggestion: null,
    },
  ];
}
