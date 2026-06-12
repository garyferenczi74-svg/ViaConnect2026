// Prompt 192 Task 2: hydration_correlation detector (daily + weekly).
//
// Daily: yesterday's intake vs target when it landed well short. Weekly:
// attainment across the window plus the co occurrence of low hydration days
// and low quality days. The facts carry framing: 'correlational' and only
// co occurrence counts; the composition layer must never phrase these as
// causes, and the compliance gate enforces that on the copy.

import { makeFingerprint } from '../fingerprint';
import type { DetectorInput, InsightFact } from '../types';
import { clampMagnitude, mealsByDate, roundPct, scoredMeals, yesterdayLocal } from './shared';
import { calorieWeightedMealQualityScore } from '@/lib/gordon/daily-aggregate';

const DAILY_EMIT_BELOW_PCT = 60;
const DAILY_ATTENTION_BELOW_PCT = 40;
const WEEKLY_BELOW_TARGET_PCT = 80;
const LOW_HYDRATION_PCT = 70;
const LOW_QUALITY_SCORE = 60;
const MIN_COVERED_DAYS = 3;

export function detectHydrationCorrelation(input: DetectorInput): InsightFact[] {
  const facts: InsightFact[] = [];
  const covered = input.hydrationDays.filter(
    (d) => typeof d.targetMl === 'number' && d.targetMl > 0,
  );

  // Daily: the last completed day.
  const yDate = yesterdayLocal(input);
  const yDay = covered.find((d) => d.date === yDate);
  if (yDay && yDay.targetMl) {
    const attainmentPct = roundPct(yDay.totalMl, yDay.targetMl);
    if (attainmentPct < DAILY_EMIT_BELOW_PCT) {
      facts.push({
        type: 'hydration_correlation',
        horizon: 'daily',
        severity: attainmentPct < DAILY_ATTENTION_BELOW_PCT ? 'attention' : 'info',
        confidence: 'medium',
        factFingerprint: makeFingerprint('hydration_correlation', 'daily', {
          scope: 'daily',
          attainmentBucket: Math.floor(attainmentPct / 10) * 10,
        }),
        snapshot: {
          scope: 'daily',
          date: yDate,
          totalMl: yDay.totalMl,
          targetMl: yDay.targetMl,
          attainmentPct,
          framing: 'correlational',
          magnitudePct: clampMagnitude(100 - attainmentPct),
        },
        productSuggestion: null,
      });
    }
  }

  // Weekly.
  if (covered.length >= MIN_COVERED_DAYS) {
    const attainments = covered.map((d) => roundPct(d.totalMl, d.targetMl as number));
    const avgAttainmentPct = Math.round(
      attainments.reduce((s, a) => s + a, 0) / attainments.length,
    );
    const daysBelowTarget = attainments.filter((a) => a < WEEKLY_BELOW_TARGET_PCT).length;

    // Co occurrence with low quality days (counts only, never causation).
    const byDate = mealsByDate(scoredMeals(input));
    let comparedDays = 0;
    let coOccur = 0;
    for (const day of covered) {
      const dayMeals = byDate.get(day.date);
      if (!dayMeals || dayMeals.length === 0) continue;
      comparedDays += 1;
      const dayScore = calorieWeightedMealQualityScore(
        dayMeals.map((m) => ({
          qualityScore: m.qualityScore as number,
          caloriesKcal: m.caloriesKcal,
        })),
      );
      const hydrationPct = roundPct(day.totalMl, day.targetMl as number);
      if (hydrationPct < LOW_HYDRATION_PCT && dayScore < LOW_QUALITY_SCORE) {
        coOccur += 1;
      }
    }

    if (daysBelowTarget >= 3 || coOccur >= 2) {
      facts.push({
        type: 'hydration_correlation',
        horizon: 'weekly',
        severity: avgAttainmentPct < 60 ? 'attention' : 'info',
        confidence: covered.length >= 7 ? 'high' : covered.length >= 5 ? 'medium' : 'low',
        factFingerprint: makeFingerprint('hydration_correlation', 'weekly', {
          scope: 'weekly',
          daysBelowTarget,
          coOccur,
        }),
        snapshot: {
          scope: 'weekly',
          avgAttainmentPct,
          daysBelowTarget,
          coveredDays: covered.length,
          windowDays: 7,
          coOccurrence: { lowHydrationLowQualityDays: coOccur, comparedDays },
          framing: 'correlational',
          magnitudePct: clampMagnitude(100 - avgAttainmentPct),
        },
        productSuggestion: null,
      });
    }
  }

  return facts;
}
