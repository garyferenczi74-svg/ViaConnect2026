// Prompt 177d Phase E (2026-06-07): calorie-weighted meal quality aggregate.
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

export interface ScoredMealContribution {
  readonly qualityScore: number;
  readonly caloriesKcal: number;
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
