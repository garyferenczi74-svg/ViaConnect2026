// Nutrition score calculation (Prompt #62c).
//
// Composite of CAQ dietary quality, supplement protocol adherence,
// nutritional gap coverage, and (future) meal logging. Until meal
// logging is implemented, mealLogScore is null and the remaining
// three inputs are weighted equally.

export interface NutritionScoreInputs {
  /** CAQ dietary quality score (0-100) derived from Phase 7 Lifestyle responses. */
  caqDietQuality: number;
  /** Today's supplement completion percentage (0-100) from Today's Protocol. */
  supplementAdherence: number;
  /** Percentage of identified nutrient gaps covered by current stack (0-100). */
  gapCoverage: number;
  /** Future: meal logging score (0-100). Pass null until meal logging is live. */
  mealLogScore: number | null;
}

export function calculateNutritionScore(inputs: NutritionScoreInputs): number {
  const { caqDietQuality, supplementAdherence, gapCoverage, mealLogScore } = inputs;

  const clamp = (n: number) => Math.min(100, Math.max(0, n));

  let score: number;
  if (mealLogScore !== null) {
    score =
      clamp(caqDietQuality) * 0.25 +
      clamp(supplementAdherence) * 0.25 +
      clamp(gapCoverage) * 0.25 +
      clamp(mealLogScore) * 0.25;
  } else {
    // Interim: redistribute meal log weight across the other three inputs.
    // 0.333 + 0.334 + 0.333 = 1.000 (no floating-point drift).
    score =
      clamp(caqDietQuality) * 0.333 +
      clamp(supplementAdherence) * 0.334 +
      clamp(gapCoverage) * 0.333;
  }

  return Math.round(clamp(score));
}
