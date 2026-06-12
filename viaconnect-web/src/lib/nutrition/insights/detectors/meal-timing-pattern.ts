// Prompt 192 Task 2: meal_timing_pattern detector (weekly).
//
// Looks for recurring timing shapes across the window: late eating, long
// daytime gaps between meals, skipped breakfasts, and protein loading at
// one end of the day. Emits the single strongest qualifying pattern (most
// evidence days) as ONE weekly fact, never a fan of facts.

import { makeFingerprint } from '../fingerprint';
import { hoursBetween, localHourOf } from '../time';
import type { DetectorInput, InsightFact, InsightMeal } from '../types';
import { clampMagnitude, mealsByDate, scoredMeals } from './shared';

const LATE_HOUR = 21;
const LONG_GAP_HOURS = 8;
const BACK_LOAD_SHARE = 0.6;
const MIN_PATTERN_DAYS = 3;

type TimingPattern =
  | 'late_eating'
  | 'long_daytime_gap'
  | 'skipped_breakfast'
  | 'protein_back_loaded';

// Fixed priority used only to break exact day count ties deterministically.
const PATTERN_PRIORITY: ReadonlyArray<TimingPattern> = [
  'late_eating',
  'long_daytime_gap',
  'skipped_breakfast',
  'protein_back_loaded',
];

interface PatternTally {
  pattern: TimingPattern;
  days: number;
  detail: Record<string, unknown>;
}

function sortedByTime(meals: InsightMeal[]): InsightMeal[] {
  return [...meals].sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt));
}

export function detectMealTimingPattern(input: DetectorInput): InsightFact[] {
  const meals = scoredMeals(input);
  if (meals.length === 0) return [];
  const byDate = mealsByDate(meals);
  const dates = Array.from(byDate.keys()).sort();
  const daysWithMeals = dates.length;
  if (daysWithMeals === 0) return [];

  let lateDays = 0;
  const lateHours: number[] = [];
  let gapDays = 0;
  const gapLengths: number[] = [];
  let skippedBreakfastDays = 0;
  let backLoadedDays = 0;
  const dinnerShares: number[] = [];

  for (const date of dates) {
    const dayMeals = sortedByTime(byDate.get(date) ?? []);

    const lastHour = localHourOf(dayMeals[dayMeals.length - 1].loggedAt, input.timezone);
    if (lastHour >= LATE_HOUR) {
      lateDays += 1;
      lateHours.push(lastHour);
    }

    let maxGap = 0;
    for (let i = 1; i < dayMeals.length; i += 1) {
      maxGap = Math.max(maxGap, hoursBetween(dayMeals[i - 1].loggedAt, dayMeals[i].loggedAt));
    }
    if (dayMeals.length >= 2 && maxGap > LONG_GAP_HOURS) {
      gapDays += 1;
      gapLengths.push(Math.round(maxGap * 10) / 10);
    }

    if (!dayMeals.some((m) => m.mealType === 'breakfast')) {
      skippedBreakfastDays += 1;
    }

    const proteinKnown = dayMeals.every((m) => m.known.protein);
    if (proteinKnown) {
      const dayProtein = dayMeals.reduce((s, m) => s + m.proteinG, 0);
      const dinnerProtein = dayMeals
        .filter((m) => m.mealType === 'dinner')
        .reduce((s, m) => s + m.proteinG, 0);
      if (dayProtein > 0 && dinnerProtein / dayProtein >= BACK_LOAD_SHARE) {
        backLoadedDays += 1;
        dinnerShares.push(Math.round((dinnerProtein / dayProtein) * 100));
      }
    }
  }

  const tallies: PatternTally[] = [
    {
      pattern: 'late_eating',
      days: lateDays,
      detail: {
        avgLastMealHour:
          lateHours.length > 0
            ? Math.round(lateHours.reduce((s, h) => s + h, 0) / lateHours.length)
            : null,
      },
    },
    {
      pattern: 'long_daytime_gap',
      days: gapDays,
      detail: {
        avgGapHours:
          gapLengths.length > 0
            ? Math.round((gapLengths.reduce((s, g) => s + g, 0) / gapLengths.length) * 10) / 10
            : null,
      },
    },
    { pattern: 'skipped_breakfast', days: skippedBreakfastDays, detail: {} },
    {
      pattern: 'protein_back_loaded',
      days: backLoadedDays,
      detail: {
        avgDinnerProteinSharePct:
          dinnerShares.length > 0
            ? Math.round(dinnerShares.reduce((s, v) => s + v, 0) / dinnerShares.length)
            : null,
      },
    },
  ];

  const qualifying = tallies.filter((t) => t.days >= MIN_PATTERN_DAYS);
  if (qualifying.length === 0) return [];
  qualifying.sort(
    (a, b) =>
      b.days - a.days ||
      PATTERN_PRIORITY.indexOf(a.pattern) - PATTERN_PRIORITY.indexOf(b.pattern),
  );
  const winner = qualifying[0];

  return [
    {
      type: 'meal_timing_pattern',
      horizon: 'weekly',
      severity: winner.days >= 5 ? 'attention' : 'info',
      confidence: daysWithMeals >= 6 ? 'high' : daysWithMeals >= 4 ? 'medium' : 'low',
      factFingerprint: makeFingerprint('meal_timing_pattern', 'weekly', {
        pattern: winner.pattern,
        patternDays: winner.days,
      }),
      snapshot: {
        pattern: winner.pattern,
        patternDays: winner.days,
        daysWithMeals,
        windowDays: 7,
        detail: winner.detail,
        magnitudePct: clampMagnitude((winner.days / daysWithMeals) * 100),
      },
      productSuggestion: null,
    },
  ];
}
