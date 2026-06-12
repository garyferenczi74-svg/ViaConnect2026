// Prompt 192 Task 2: quality_trend detector (weekly).
//
// Per day quality comes from the same calorie weighted aggregation the 177
// daily scoring uses (compute on read; there is no persisted daily score
// table). The window splits into an earlier and a later half; a 5 point
// move in the later half marks the trend. The single biggest contributor is
// the covered macro whose average attainment moved the most between halves.

import { calorieWeightedMealQualityScore } from '@/lib/gordon/daily-aggregate';
import { makeFingerprint } from '../fingerprint';
import type { DetectorInput, InsightFact, InsightMeal } from '../types';
import { clampMagnitude, MACRO_DEFS, mealsByDate, roundPct, scoredMeals } from './shared';

const MIN_SCORED_DAYS = 4;
const TREND_BAND_PTS = 5;
const MIN_CONTRIBUTOR_DELTA_PCT = 1;

function avg(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function dayQuality(meals: InsightMeal[]): number {
  return calorieWeightedMealQualityScore(
    meals.map((m) => ({ qualityScore: m.qualityScore as number, caloriesKcal: m.caloriesKcal })),
  );
}

export function detectQualityTrend(input: DetectorInput): InsightFact[] {
  const meals = scoredMeals(input);
  const byDate = mealsByDate(meals);
  const dates = Array.from(byDate.keys()).sort();
  if (dates.length < MIN_SCORED_DAYS) return [];

  const half = Math.floor(dates.length / 2);
  const firstDates = dates.slice(0, dates.length - half);
  const secondDates = dates.slice(dates.length - half);

  const firstHalfAvg = Math.round(avg(firstDates.map((d) => dayQuality(byDate.get(d) ?? []))));
  const secondHalfAvg = Math.round(avg(secondDates.map((d) => dayQuality(byDate.get(d) ?? []))));
  const deltaPts = secondHalfAvg - firstHalfAvg;
  const trend =
    deltaPts >= TREND_BAND_PTS ? 'improving' : deltaPts <= -TREND_BAND_PTS ? 'declining' : 'stable';

  // Biggest contributor: the covered macro with the largest attainment move.
  let contributor: { macro: string; deltaPct: number } | null = null;
  const targets = input.targets;
  if (targets) {
    for (const def of MACRO_DEFS) {
      const targetG = def.target(targets);
      if (targetG <= 0) continue;
      const halfAttainment = (halfDates: string[]): number | null => {
        const perDay: number[] = [];
        for (const date of halfDates) {
          const dayMeals = byDate.get(date) ?? [];
          if (dayMeals.length === 0 || !dayMeals.every((m) => def.known(m))) continue;
          perDay.push(roundPct(dayMeals.reduce((s, m) => s + def.grams(m), 0), targetG));
        }
        return perDay.length > 0 ? avg(perDay) : null;
      };
      const first = halfAttainment(firstDates);
      const second = halfAttainment(secondDates);
      if (first === null || second === null) continue;
      const deltaPct = Math.round(second - first);
      if (Math.abs(deltaPct) < MIN_CONTRIBUTOR_DELTA_PCT) continue;
      if (!contributor || Math.abs(deltaPct) > Math.abs(contributor.deltaPct)) {
        contributor = { macro: def.macro, deltaPct };
      }
    }
  }

  return [
    {
      type: 'quality_trend',
      horizon: 'weekly',
      severity: trend === 'improving' ? 'positive' : trend === 'declining' ? 'attention' : 'info',
      confidence: dates.length >= 6 ? 'high' : dates.length === 5 ? 'medium' : 'low',
      factFingerprint: makeFingerprint('quality_trend', 'weekly', {
        trend,
        deltaBucket: Math.round(deltaPts / 5) * 5,
      }),
      snapshot: {
        trend,
        firstHalfAvg,
        secondHalfAvg,
        deltaPts,
        scoredDays: dates.length,
        windowDays: 7,
        contributor,
        magnitudePct: clampMagnitude(Math.abs(deltaPts)),
      },
      productSuggestion: null,
    },
  ];
}
