// Prompt 177d Phase C (2026-06-07): scoreMeal knownNutrients contract.
//
// When the originating channel marks a nutrient as "not determinable"
// via knownNutrients, the dependent modifier must:
//   1. Contribute 0 to the score (no penalty, no bonus)
//   2. Carry excluded: true in the breakdown
//   3. Have a "not determinable; excluded from score" note rather than
//      the legacy "Within ... guidance" copy that implies a healthy zero
//
// Math identity check: a meal scored with sodium known + sodium 0 mg
// produces the same final_score as the same meal scored with
// knownNutrients.sodium_mg false. Only the modifier note + excluded
// flag differ. This is the honest-vs-silent distinction.

import { describe, it, expect } from 'vitest';
import { scoreMeal } from '@/lib/gordon/scoreMeal';
import { DEFAULT_MEAL_DISTRIBUTION } from '@/lib/gordon/constants';
import type { Meal, NutritionTargets, KnownNutrients } from '@/lib/gordon/types';

const TARGETS: NutritionTargets = {
  targetId: 't1',
  userId: 'u1',
  effectiveFrom: '2026-06-07',
  dailyKcal: 2000,
  dailyProteinG: 100,
  dailyCarbsG: 250,
  dailyFatTotalG: 65,
  dailyFatSaturatedG: 20,
  dailyFatUnsatG: 30,
  dailyFiberG: 28,
  dailySugarG: 50,
  dailySodiumMg: 2300,
  sourceCaqSnapshot: null,
  sourceBodySnapshot: null,
  bioOptDay: null,
  mealDistribution: DEFAULT_MEAL_DISTRIBUTION,
  generatedByVersion: '177d-test',
  generatedAt: '2026-06-07',
  supersededAt: null,
} as unknown as NutritionTargets;

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    mealId: 'preview',
    userId: 'u1',
    loggedAt: '2026-06-07T18:00:00Z',
    mealType: 'dinner',
    source: 'full_manual',
    sourceConfidence: 0.65,
    proteinG: 30,
    carbsG: 50,
    fatTotalG: 20,
    fatSourceId: null,
    fatBreakdown: null,
    fatQualityContribution: null,
    fiberG: 8,
    sugarG: 10,
    sodiumMg: 0,
    caloriesKcal: 540,
    caloriesAutoCalc: false,
    wholeFoodFlag: null,
    ingredientsList: null,
    mealName: 'Test meal',
    notes: null,
    rawInput: null,
    legacyNutritionLogId: null,
    qualityScore: null,
    qualityTier: null,
    scoreBreakdown: null,
    scoredAt: null,
    gordonVersion: null,
    snackIndex: null,
    createdAt: '2026-06-07T18:00:00Z',
    updatedAt: '2026-06-07T18:00:00Z',
    ...overrides,
  } as Meal;
}

function findModifier(breakdown: ReturnType<typeof scoreMeal>, name: string) {
  return breakdown.modifiers.find((m) => m.name === name);
}

describe('scoreMeal knownNutrients contract', () => {
  it('omitting knownNutrients preserves the legacy behavior', () => {
    const result = scoreMeal(makeMeal(), TARGETS, DEFAULT_MEAL_DISTRIBUTION, 0);
    const sodium = findModifier(result, 'Sodium Penalty');
    expect(sodium).toBeDefined();
    expect(sodium?.value).toBe(0);
    expect(sodium?.excluded).toBeUndefined();
    expect(sodium?.note).toContain('Within sodium guidance');
  });

  it('knownNutrients.sodium_mg false marks the Sodium Penalty excluded', () => {
    const knownNutrients: KnownNutrients = { sodium_mg: false };
    const result = scoreMeal(makeMeal(), TARGETS, DEFAULT_MEAL_DISTRIBUTION, 0, knownNutrients);
    const sodium = findModifier(result, 'Sodium Penalty');
    expect(sodium).toBeDefined();
    expect(sodium?.value).toBe(0);
    expect(sodium?.excluded).toBe(true);
    expect(sodium?.note).toBe('Sodium not determinable; excluded from score');
  });

  it('excluded sodium preserves final_score parity with the silent zero case', () => {
    // When sodium is 0 mg and known, the sodium penalty is 0 (no
    // penalty because 0 / limit is below SODIUM_RATIO_FULL). When sodium
    // is 0 mg and explicitly excluded, the sodium penalty is also 0.
    // Math identity: final_score must match between the two paths.
    const knownPath = scoreMeal(makeMeal(), TARGETS, DEFAULT_MEAL_DISTRIBUTION, 0);
    const excludedPath = scoreMeal(
      makeMeal(),
      TARGETS,
      DEFAULT_MEAL_DISTRIBUTION,
      0,
      { sodium_mg: false },
    );
    expect(excludedPath.final_score).toBe(knownPath.final_score);
  });

  it('knownNutrients.sugar_g false marks the Sugar Penalty excluded', () => {
    const result = scoreMeal(makeMeal(), TARGETS, DEFAULT_MEAL_DISTRIBUTION, 0, { sugar_g: false });
    const sugar = findModifier(result, 'Sugar Penalty');
    expect(sugar?.excluded).toBe(true);
    expect(sugar?.note).toBe('Sugar not determinable; excluded from score');
  });

  it('knownNutrients.fiber_g false marks the Fiber Bonus excluded', () => {
    const result = scoreMeal(makeMeal(), TARGETS, DEFAULT_MEAL_DISTRIBUTION, 0, { fiber_g: false });
    const fiber = findModifier(result, 'Fiber Bonus');
    expect(fiber?.excluded).toBe(true);
    expect(fiber?.note).toBe('Fiber not determinable; excluded from score');
  });

  it('protein, carbs, fat exclusions also short-circuit their respective fit modifiers', () => {
    const result = scoreMeal(makeMeal(), TARGETS, DEFAULT_MEAL_DISTRIBUTION, 0, {
      protein_g: false,
      carbs_g: false,
      fat_total_g: false,
    });
    expect(findModifier(result, 'Protein Fit')?.excluded).toBe(true);
    expect(findModifier(result, 'Carb Fit')?.excluded).toBe(true);
    expect(findModifier(result, 'Fat Fit')?.excluded).toBe(true);
  });

  it('an excluded macro contributes 0 instead of a false penalty at 0 g', () => {
    // A meal logged with proteinG=0 against a 30 g target would receive
    // a -10 Protein Fit penalty under the legacy path. With protein_g
    // marked unknown, the modifier returns 0 and does not unfairly
    // penalize a meal whose protein the parser just could not extract.
    const zeroProteinMeal = makeMeal({ proteinG: 0 });
    const legacy = scoreMeal(zeroProteinMeal, TARGETS, DEFAULT_MEAL_DISTRIBUTION, 0);
    const excluded = scoreMeal(zeroProteinMeal, TARGETS, DEFAULT_MEAL_DISTRIBUTION, 0, { protein_g: false });
    const legacyProtein = findModifier(legacy, 'Protein Fit');
    const excludedProtein = findModifier(excluded, 'Protein Fit');
    expect(legacyProtein?.value).toBeLessThan(0); // legacy penalizes a 0 g meal
    expect(excludedProtein?.value).toBe(0);
    expect(excludedProtein?.excluded).toBe(true);
    expect(excluded.final_score).toBeGreaterThan(legacy.final_score);
  });
});
