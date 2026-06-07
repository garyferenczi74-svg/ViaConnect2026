// Prompt 177d Phase D (2026-06-07): known-nutrients helper contract.
//
// Helpers feed the daily-aggregate honesty pass on /nutrition. The
// helper reads the channel-supplied known_nutrients map out of
// meal.scoreBreakdown so aggregators can skip a meal's contribution
// for any nutrient the channel could not determine, rather than
// counting it as 0 and showing a fictitious shortfall.

import { describe, it, expect } from 'vitest';
import { getKnownNutrients, isMealNutrientKnown } from '@/lib/gordon/known-nutrients';
import type { Meal } from '@/lib/gordon/types';

function baseMeal(): Meal {
  return {
    mealId: 'm1',
    userId: 'u1',
    loggedAt: '2026-06-07T18:00:00Z',
    mealType: 'dinner',
    source: 'full_manual',
    sourceConfidence: 0.65,
    proteinG: 30,
    carbsG: 50,
    fatTotalG: 20,
    fatHealthyG: 10,
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
    qualityScore: 50,
    qualityTier: 'Good',
    scoreBreakdown: null,
    scoredAt: null,
    gordonVersion: null,
    snackIndex: null,
    createdAt: '2026-06-07T18:00:00Z',
    updatedAt: '2026-06-07T18:00:00Z',
  } as Meal;
}

describe('getKnownNutrients', () => {
  it('returns null when scoreBreakdown is null', () => {
    expect(getKnownNutrients(baseMeal())).toBeNull();
  });

  it('returns null when scoreBreakdown has no 177d block', () => {
    const m = baseMeal();
    m.scoreBreakdown = { modifiers: [], final_score: 50, tier: 'Good', base: 50, calculated_at: '', gordon_version: '' };
    expect(getKnownNutrients(m)).toBeNull();
  });

  it('reads prompt_177d_meta.known_nutrients when present', () => {
    const m = baseMeal();
    m.scoreBreakdown = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(({ prompt_177d_meta: { known_nutrients: { sodium_mg: false, fiber_g: true } } } as unknown) as any),
    };
    expect(getKnownNutrients(m)).toEqual({ sodium_mg: false, fiber_g: true });
  });

  it('falls back to prompt_177d_repair.known_nutrients when meta is absent', () => {
    const m = baseMeal();
    m.scoreBreakdown = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(({ prompt_177d_repair: { known_nutrients: { sodium_mg: false } } } as unknown) as any),
    };
    expect(getKnownNutrients(m)).toEqual({ sodium_mg: false });
  });
});

describe('isMealNutrientKnown', () => {
  it('returns true when no scoreBreakdown is attached (legacy path)', () => {
    expect(isMealNutrientKnown(baseMeal(), 'sodium_mg')).toBe(true);
  });

  it('returns true when the key is missing from the known map', () => {
    const m = baseMeal();
    m.scoreBreakdown = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(({ prompt_177d_meta: { known_nutrients: { sodium_mg: false } } } as unknown) as any),
    };
    expect(isMealNutrientKnown(m, 'protein_g')).toBe(true);
  });

  it('returns false when the key is explicitly marked false', () => {
    const m = baseMeal();
    m.scoreBreakdown = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(({ prompt_177d_meta: { known_nutrients: { sodium_mg: false } } } as unknown) as any),
    };
    expect(isMealNutrientKnown(m, 'sodium_mg')).toBe(false);
  });

  it('returns true when the key is explicitly marked true', () => {
    const m = baseMeal();
    m.scoreBreakdown = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(({ prompt_177d_meta: { known_nutrients: { protein_g: true } } } as unknown) as any),
    };
    expect(isMealNutrientKnown(m, 'protein_g')).toBe(true);
  });
});
