// Prompt 183 Task 4 (2026-06-10): pure helpers for the read only Today's
// Meals accordion (Row 2 of the My Nutrition bento hub).
//
// These are extracted from the component so the grouping + per type totals +
// remaining hydration math are unit testable in node-env with an injected
// `now` and timezone, the same pattern useNutritionHubMetrics uses for its
// gauge math. Nothing here reads, writes, or mutates anything: every function
// is a pure transform of the Meal[] the component already has in hand from
// useUserMeals.
//
// No new scoring is authored. The per type aggregate score defers to
// calorieWeightedMealQualityScore from @/lib/gordon/daily-aggregate for the
// expanded Today's meals ring only. The hub hero Nutrition Score uses
// daily macro attainment, not this slot-weighted helper.

import type { Meal, MealType } from '@/lib/gordon/types';
import { calorieWeightedMealQualityScore } from '@/lib/gordon/daily-aggregate';

// The four meal type buckets in display order. Hydration is a separate row in
// the component (it has no Meal[]), so it is not part of this set.
export const MEAL_TYPE_ORDER: ReadonlyArray<MealType> = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface MealTypeMacroTotals {
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
  readonly fiber: number;
  readonly sugar: number;
  readonly kcal: number;
}

// Local date key (YYYY-MM-DD) for an ISO instant in the given timezone.
// Mirrors TodaysMealsSummary.localDateKey + the hub metrics hook so the today
// filter lands on the same calendar day the existing cards use. Injected tz
// keeps it deterministic in tests.
export function localDateKey(iso: string, timezone: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Pure. Filters the meals to TODAY in the user's local timezone and groups
 * them by meal_type. `now` and `tz` are injected so date boundaries are
 * deterministic across machines. Every bucket is always present (empty array
 * when nothing was logged for that type) so the caller can render all four
 * rows without a presence check.
 */
export function groupTodaysMealsByType(
  meals: ReadonlyArray<Meal>,
  now: Date,
  tz: string,
): Record<MealType, Meal[]> {
  const grouped: Record<MealType, Meal[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  const todayKey = localDateKey(now.toISOString(), tz);
  if (!todayKey) return grouped;
  for (const m of meals) {
    if (localDateKey(m.loggedAt, tz) !== todayKey) continue;
    // A future or legacy meal_type the four buckets do not cover must not throw.
    if (!(m.mealType in grouped)) continue;
    grouped[m.mealType].push(m);
  }
  return grouped;
}

/**
 * Pure. Sums the five tracked macros plus calories for a set of meals (one
 * meal type's meals for today). Returns zeros for an empty set so the caller
 * renders 0 g rather than a blank. Non finite field values coerce to 0 the
 * same way the Daily Macros aggregation does.
 */
export function mealTypeTotals(meals: ReadonlyArray<Meal>): MealTypeMacroTotals {
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let sugar = 0;
  let kcal = 0;
  for (const m of meals) {
    protein += num(m.proteinG);
    carbs += num(m.carbsG);
    fat += num(m.fatTotalG);
    fiber += num(m.fiberG);
    sugar += num(m.sugarG);
    kcal += num(m.caloriesKcal);
  }
  return { protein, carbs, fat, fiber, sugar, kcal };
}

/**
 * Pure. The per meal type aggregate quality score (0..100) for the gauge, or
 * null when no meal of that type today carries a Gordon score (qualityScore
 * not null). Defers to calorieWeightedMealQualityScore so a substantial meal
 * weighs the type more than a small one on the expanded meal ring. This is
 * not the hub hero Nutrition Score.
 * null lets the caller render the gauge empty state rather than a fabricated
 * zero.
 */
export function mealTypeAggregateScore(meals: ReadonlyArray<Meal>): number | null {
  const scored = meals.filter((m) => m.qualityScore !== null);
  if (scored.length === 0) return null;
  return calorieWeightedMealQualityScore(
    scored.map((m) => ({
      qualityScore: num(m.qualityScore),
      caloriesKcal: num(m.caloriesKcal),
    })),
  );
}

/**
 * Pure. Remaining volume to the hydration target in ml: max(0, target
 * total). The target is Contract C (read off useHydrationToday); this helper
 * never recomputes it. Clamped at 0 so an over target day reads 0 remaining
 * rather than a negative.
 */
export function hydrationRemainingMl(totalMl: number, targetMl: number): number {
  const total = num(totalMl);
  const target = num(targetMl);
  return Math.max(0, target - total);
}

/**
 * Pure. Percent of the hydration target reached (0..100), clamped, for the
 * hydration gauge value. Returns 0 when the target is not positive so the
 * gauge renders cleanly instead of dividing by zero.
 */
export function hydrationPercentToTarget(totalMl: number, targetMl: number): number {
  const total = num(totalMl);
  const target = num(targetMl);
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((total / target) * 100)));
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
