// Prompt 177d Phase E (2026-06-07): calorie-weighted meal quality aggregate.
// Prompt 177e Phase F (2026-06-07): 5-macro Total Daily Macros aggregate.
//
// 177 spec section 4.5 default: a day's per-meal Gordon quality scores
// combine into one daily Nutrition Score via a calorie-weighted average
// so a substantial dinner influences the day more than a small snack,
// rather than a tiny perfect snack masking a poor dinner under a uniform
// average. This is a Gordon tunable; the helper is exported so a future
// preference flip (uniform vs weighted) is a one-line swap at the call
// site.
//
// Defensive fallback: if every scored meal has caloriesKcal <= 0 (a
// degenerate case that should not happen in production but is plausible
// in a partially-scored test fixture), the helper falls back to the
// uniform average rather than dividing by zero.
//
// 177e helper (totalDailyMacrosScore): combines the per-macro
// attainments (calories, protein, carbs, fat, fiber) into one Total
// Daily Macros score using DAILY_MACRO_WEIGHTS. Unknown attainments
// (null) are excluded from the average so a day where every meal
// omitted a macro does not zero it out.

import { DAILY_MACRO_WEIGHTS, SCORE_BASE } from './constants';

export interface ScoredMealContribution {
  readonly qualityScore: number;
  readonly caloriesKcal: number;
}

/**
 * Per-macro attainment for a single day. Each value is the 0..100
 * percentage of the daily target the user reached. null means no meal
 * today determined this macro (Prompt 177d known_nutrients gate); the
 * downstream Total Daily Macros score skips nulls so a fully-unknown
 * macro neither contributes nor zero-outs the average.
 *
 * Prompt 177e (2026-06-07): the canonical tracked set is calories,
 * protein, carbs, fat, fiber, matching nutrition_targets.
 */
export interface DailyMacroAttainments {
  readonly calories: number | null;
  readonly protein: number | null;
  readonly carbs: number | null;
  readonly fat: number | null;
  readonly fiber: number | null;
}

/**
 * Pure function. Returns the calorie-weighted average of the given
 * per-meal quality scores. Each score is clamped to [0, 100] and the
 * weight is clamped to >= 0 so a noisy fixture cannot produce a
 * nonsensical aggregate.
 *
 * Returns 0 when the input array is empty so callers can pass through
 * without a null-check.
 */
export function calorieWeightedMealQualityScore(
  meals: ReadonlyArray<ScoredMealContribution>,
): number {
  if (meals.length === 0) return 0;
  let weightedSum = 0;
  let weight = 0;
  let fallbackSum = 0;
  for (const m of meals) {
    const clampedScore = Math.max(0, Math.min(100, Number(m.qualityScore) || 0));
    const clampedWeight = Math.max(0, Number(m.caloriesKcal) || 0);
    weightedSum += clampedScore * clampedWeight;
    weight += clampedWeight;
    fallbackSum += clampedScore;
  }
  if (weight > 0) {
    return Math.round(weightedSum / weight);
  }
  return Math.round(fallbackSum / meals.length);
}

/**
 * Prompt 177e (2026-06-07): Total Daily Macros score.
 *
 * Combines the per-macro attainments into one 0..100 daily score using
 * DAILY_MACRO_WEIGHTS. Composition macros (protein, carbs, fat, fiber)
 * carry equal weight; calories carries half-weight as the
 * energy-balance dimension so it is not double-counted against the
 * three macros (calories is approximately 4P + 4C + 9F).
 *
 * null attainments are excluded from the weighted average per Prompt
 * 177d Phase D honesty contract: a macro with no known contributor
 * today does not contribute nor zero-out.
 *
 * Returns 0 when every attainment is null (the day has no macro
 * signal at all) so the gauge renders an empty state cleanly.
 */
export function totalDailyMacrosScore(attainments: DailyMacroAttainments): number {
  const entries: Array<readonly [number, number]> = [];
  if (attainments.calories !== null) entries.push([clampPct(attainments.calories), DAILY_MACRO_WEIGHTS.calories]);
  if (attainments.protein !== null)  entries.push([clampPct(attainments.protein),  DAILY_MACRO_WEIGHTS.protein]);
  if (attainments.carbs !== null)    entries.push([clampPct(attainments.carbs),    DAILY_MACRO_WEIGHTS.carbs]);
  if (attainments.fat !== null)      entries.push([clampPct(attainments.fat),      DAILY_MACRO_WEIGHTS.fat]);
  if (attainments.fiber !== null)    entries.push([clampPct(attainments.fiber),    DAILY_MACRO_WEIGHTS.fiber]);
  if (entries.length === 0) return 0;
  let weightedSum = 0;
  let weightSum = 0;
  for (const [value, weight] of entries) {
    weightedSum += value * weight;
    weightSum += weight;
  }
  if (weightSum <= 0) return 0;
  return Math.round(weightedSum / weightSum);
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * scoreMeal food-pattern modifiers only. Protein / carb / fat fit and
 * calorie fit vs meal_distribution slot shares must never enter the hub
 * hero: that is how a large dinner vs a 30 percent dinner slot painted
 * Fair / 30 on an on-macro day.
 */
export const FOOD_PATTERN_MODIFIER_NAMES: ReadonlyArray<string> = [
  'Sugar Penalty',
  'Saturated Fat Penalty',
  'Sodium Penalty',
  'Whole Food Bonus',
];

const FOOD_PATTERN_MODIFIER_NAME_SET = new Set<string>(FOOD_PATTERN_MODIFIER_NAMES);

export type HubGoalDirection = 'lose' | 'gain' | 'maintain' | null;

export interface FoodPatternModifier {
  readonly name: string;
  readonly value: number;
  readonly excluded?: boolean;
}

export interface FoodPatternMeal {
  readonly modifiers?: ReadonlyArray<FoodPatternModifier>;
}

export interface HeroNutritionScoreInput {
  readonly dailyMacrosPct: number;
  readonly dailyFoodQuality: number;
  readonly goalDirection: HubGoalDirection | undefined;
  readonly caloriesConsumed: number;
  readonly dailyKcal: number;
  readonly proteinConsumed: number;
  readonly dailyProteinG: number;
}

/**
 * Per-meal food-pattern quality: SCORE_BASE (50) plus sugar, saturated
 * fat, sodium, and whole-food modifiers. Excluded modifiers are skipped
 * so an unknown sodium does not read as a healthy zero. Slot-share
 * Protein / Carb / Fat / Calorie Fit names are ignored.
 */
export function mealFoodPatternQuality(
  modifiers: ReadonlyArray<FoodPatternModifier> | undefined,
): number {
  if (!modifiers || modifiers.length === 0) return SCORE_BASE;
  let delta = 0;
  for (const modifier of modifiers) {
    if (modifier.excluded === true) continue;
    if (!FOOD_PATTERN_MODIFIER_NAME_SET.has(modifier.name)) continue;
    const value = Number(modifier.value);
    if (!Number.isFinite(value)) continue;
    delta += value;
  }
  return clampPct(SCORE_BASE + delta);
}

/**
 * Uniform daily food-pattern quality. Must not call
 * calorieWeightedMealQualityScore and must not weight by meal-slot
 * protein / carb / fat fit. Empty meals return 50 (neutral modifier),
 * never 0.
 */
export function dailyFoodPatternQuality(
  meals: ReadonlyArray<FoodPatternMeal>,
): number {
  if (meals.length === 0) return SCORE_BASE;
  let sum = 0;
  for (const meal of meals) {
    sum += mealFoodPatternQuality(meal.modifiers);
  }
  return Math.round(sum / meals.length);
}

/** Bounded quality modifier: clamp(dailyFoodQuality - 50, -15, +15). */
export function foodPatternQualityModifier(dailyFoodQuality: number): number {
  const quality = Number.isFinite(dailyFoodQuality) ? dailyFoodQuality : SCORE_BASE;
  return clampInt(quality - SCORE_BASE, -15, 15);
}

/**
 * goal_direction is TILT ONLY, not a sixth score.
 * Null / maintain / unknown: skip.
 *
 * lose: kcal overshoot is not inside totalDailyMacrosScore (calories
 * clamp at 100), so overshoot can break a deficit. Cap -15.
 *
 * gain: protein miss vs persisted daily_protein_g is already inside
 * totalDailyMacrosScore. generateMacroTargets already baked LBM into
 * that gram number (0.8 g/lb LBM x Gain 1.0). Extra protein-miss
 * points would double-count, so the gain tilt is 0.
 */
export function goalDirectionTilt(input: HeroNutritionScoreInput): number {
  if (input.goalDirection === 'lose') {
    if (!(input.dailyKcal > 0) || !(input.caloriesConsumed > input.dailyKcal)) {
      return 0;
    }
    const overshootPct = (input.caloriesConsumed - input.dailyKcal) / input.dailyKcal;
    return clampInt(-overshootPct * 30, -15, 0);
  }
  return 0;
}

/**
 * Hub hero Nutrition Score. Base is daily macro attainment vs the
 * nutrition_targets five macros. Quality is a +/-15 modifier only.
 * Hard floors after the modifier: macros >= 80 => >= 40 (Good);
 * macros >= 90 => >= 60 (Excellent).
 */
export function heroNutritionScore(input: HeroNutritionScoreInput): number {
  const macros = clampPct(input.dailyMacrosPct);
  const score =
    macros + foodPatternQualityModifier(input.dailyFoodQuality) + goalDirectionTilt(input);
  let rounded = Math.round(score);
  if (macros >= 90) rounded = Math.max(rounded, 60);
  if (macros >= 80) rounded = Math.max(rounded, 40);
  return clampPct(rounded);
}

/**
 * Returns true when at least one of the five tracked macros is
 * non-null. NutritionScoreCard uses this to decide whether to render
 * the empty state on the Total Daily Macros gauge.
 */
export function dailyMacrosHasSignal(attainments: DailyMacroAttainments): boolean {
  return (
    attainments.calories !== null ||
    attainments.protein !== null ||
    attainments.carbs !== null ||
    attainments.fat !== null ||
    attainments.fiber !== null
  );
}
