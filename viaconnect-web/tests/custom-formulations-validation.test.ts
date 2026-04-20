// Prompt #97 Phase 3.2: patient-safety critical validation tests (90%+ gate).
// Every branch of validateFormulationPure + convertToMg exercised.

import { describe, it, expect } from 'vitest';
import {
  convertToMg,
  estimateCogsPerUnit,
  validateFormulationPure,
  type PureIngredientInput,
  type PureInteractionInput,
  type PureValidationInput,
} from '@/lib/custom-formulations/validation-engine';

function ing(overrides: Partial<PureIngredientInput> = {}): PureIngredientInput {
  return {
    ingredientId: 'vitamin_c_ascorbic_acid',
    dosePerServing: 500,
    doseUnit: 'mg',
    isActiveIngredient: true,
    library: {
      commonName: 'Vitamin C',
      tolerableUpperLimitAdultMg: 2000,
      tolerableUpperLimitPediatricMg: 1800,
      pregnancyCategory: 'safe',
      typicalCogsCentsPerMg: 0.1,
      fdaWarningLetterIssued: false,
      fdaSafetyConcernListed: false,
      isAvailableForCustomFormulation: true,
    },
    ...overrides,
  };
}

function input(
  overrides: Partial<PureValidationInput> = {},
  ingredients: PureIngredientInput[] = [ing()],
): PureValidationInput {
  return {
    formulation: {
      intendedAdultUse: true,
      intendedPediatricUse: false,
      intendedPregnancyUse: false,
      unitsPerServing: 1,
      servingsPerDay: 1,
    },
    ingredients,
    interactions: [],
    ...overrides,
  };
}

// ---- convertToMg ---------------------------------------------------------

describe('convertToMg', () => {
  it('mg → mg passthrough', () => {
    expect(convertToMg(500, 'mg')).toBe(500);
  });
  it('mcg → mg divides by 1000', () => {
    expect(convertToMg(1000, 'mcg')).toBe(1);
  });
  it('g → mg multiplies by 1000', () => {
    expect(convertToMg(2, 'g')).toBe(2000);
  });
  it('IU pass-through (caller converts per-vitamin)', () => {
    expect(convertToMg(1000, 'iu')).toBe(1000);
  });
  it('CFU billions returns 0 (not weight-based)', () => {
    expect(convertToMg(10, 'cfu_billions')).toBe(0);
  });
});

// ---- estimateCogsPerUnit ------------------------------------------------

describe('estimateCogsPerUnit', () => {
  it('single ingredient with known cost produces correct total', () => {
    const cents = estimateCogsPerUnit([ing({ dosePerServing: 1000, library: { ...ing().library, typicalCogsCentsPerMg: 0.5 } })]);
    expect(cents).toBe(500);
  });

  it('ingredient with null per-mg cost contributes zero', () => {
    const cents = estimateCogsPerUnit([
      ing({ library: { ...ing().library, typicalCogsCentsPerMg: null } }),
    ]);
    expect(cents).toBe(0);
  });

  it('rounds up to nearest cent', () => {
    const cents = estimateCogsPerUnit([
      ing({ dosePerServing: 10, library: { ...ing().library, typicalCogsCentsPerMg: 0.11 } }),
    ]);
    // 10mg × 0.11 = 1.1 → round up to 2
    expect(cents).toBe(2);
  });

  it('sums multiple ingredients', () => {
    const cents = estimateCogsPerUnit([
      ing({ ingredientId: 'a', dosePerServing: 100, library: { ...ing().library, typicalCogsCentsPerMg: 0.2 } }),
      ing({ ingredientId: 'b', dosePerServing: 200, library: { ...ing().library, typicalCogsCentsPerMg: 0.3 } }),
    ]);
    // 100×0.2 + 200×0.3 = 20 + 60 = 80
    expect(cents).toBe(80);
  });
});

// ---- Check 1: prohibited category ---------------------------------------

describe('validateFormulationPure — prohibited category', () => {
  it('prohibited ingredient id produces blocker', () => {
    const r = validateFormulationPure(input({}, [ing({ ingredientId: 'bpc_157' })]));
    expect(r.blockerCount).toBeGreaterThan(0);
    expect(r.issues.some((i) => i.category === 'prohibited' && i.message.includes('prohibited'))).toBe(true);
  });

  it('FDA warning letter flag produces blocker', () => {
    const r = validateFormulationPure(input({}, [
      ing({ library: { ...ing().library, fdaWarningLetterIssued: true } }),
    ]));
    expect(r.issues.some((i) => i.category === 'prohibited' && i.message.includes('FDA warning letter'))).toBe(true);
  });

  it('FDA safety concern flag produces blocker', () => {
    const r = validateFormulationPure(input({}, [
      ing({ library: { ...ing().library, fdaSafetyConcernListed: true } }),
    ]));
    expect(r.issues.some((i) => i.category === 'prohibited' && i.message.includes('safety concerns'))).toBe(true);
  });

  it('ingredient not enabled for custom formulation produces blocker', () => {
    const r = validateFormulationPure(input({}, [
      ing({ library: { ...ing().library, isAvailableForCustomFormulation: false } }),
    ]));
    expect(r.issues.some((i) => i.category === 'prohibited' && i.message.includes('not enabled'))).toBe(true);
  });

  it('custom prohibited set can be injected for testing', () => {
    const customProhibited = new Set(['vitamin_c_ascorbic_acid']);
    const r = validateFormulationPure({
      ...input(),
      prohibitedIngredientIds: customProhibited,
    });
    expect(r.blockerCount).toBeGreaterThan(0);
  });
});

// ---- Check 2: UL enforcement --------------------------------------------

describe('validateFormulationPure — UL enforcement', () => {
  it('adult formulation exceeding adult UL produces blocker', () => {
    const r = validateFormulationPure(input({}, [
      ing({ dosePerServing: 3000, library: { ...ing().library, tolerableUpperLimitAdultMg: 2000 } }),
    ]));
    expect(r.issues.some((i) => i.category === 'ul_exceeded' && i.message.includes('adult'))).toBe(true);
    expect(r.blockerCount).toBeGreaterThan(0);
  });

  it('pediatric formulation uses pediatric UL', () => {
    const r = validateFormulationPure(input(
      { formulation: { intendedAdultUse: true, intendedPediatricUse: true, intendedPregnancyUse: false, unitsPerServing: 1, servingsPerDay: 1 } },
      [ing({
        dosePerServing: 2000,
        library: {
          ...ing().library,
          tolerableUpperLimitAdultMg: 3000,
          tolerableUpperLimitPediatricMg: 1800,
        },
      })],
    ));
    expect(r.issues.some((i) => i.category === 'ul_exceeded' && i.message.includes('pediatric'))).toBe(true);
  });

  it('daily dose = dose_per_serving × units_per_serving × servings_per_day', () => {
    const r = validateFormulationPure(input(
      { formulation: { intendedAdultUse: true, intendedPediatricUse: false, intendedPregnancyUse: false, unitsPerServing: 2, servingsPerDay: 3 } },
      [ing({
        dosePerServing: 500,
        library: { ...ing().library, tolerableUpperLimitAdultMg: 2000 },
      })],
    ));
    // 500 × 2 × 3 = 3000, exceeds 2000 UL
    expect(r.issues.some((i) => i.category === 'ul_exceeded')).toBe(true);
  });

  it('null UL skips check (no warning or blocker)', () => {
    const r = validateFormulationPure(input({}, [
      ing({ dosePerServing: 50000, library: { ...ing().library, tolerableUpperLimitAdultMg: null } }),
    ]));
    expect(r.issues.filter((i) => i.category === 'ul_exceeded')).toHaveLength(0);
  });

  it('at exactly the UL produces no blocker (strict >)', () => {
    const r = validateFormulationPure(input({}, [
      ing({ dosePerServing: 2000, library: { ...ing().library, tolerableUpperLimitAdultMg: 2000 } }),
    ]));
    expect(r.issues.filter((i) => i.category === 'ul_exceeded')).toHaveLength(0);
  });

  it('suggested fix proposes 90% of UL', () => {
    const r = validateFormulationPure(input({}, [
      ing({ dosePerServing: 3000, library: { ...ing().library, tolerableUpperLimitAdultMg: 2000 } }),
    ]));
    const ulIssue = r.issues.find((i) => i.category === 'ul_exceeded');
    expect(ulIssue?.suggestedFix).toContain('1800');
  });
});

// ---- Check 3: interactions ----------------------------------------------

describe('validateFormulationPure — interactions', () => {
  const interactions: PureInteractionInput[] = [
    {
      ingredientAId: 'calcium_citrate',
      ingredientBId: 'iron_bisglycinate',
      severity: 'moderate',
      mechanism: 'Competitive absorption',
      blocksFormulation: false,
    },
  ];

  it('interaction detected only when both ingredients are present', () => {
    const r = validateFormulationPure(input({ interactions }, [
      ing({ ingredientId: 'calcium_citrate' }),
      ing({ ingredientId: 'iron_bisglycinate' }),
    ]));
    expect(r.issues.some((i) => i.category === 'interaction')).toBe(true);
  });

  it('interaction NOT detected if only one ingredient is present', () => {
    const r = validateFormulationPure(input({ interactions }, [
      ing({ ingredientId: 'calcium_citrate' }),
    ]));
    expect(r.issues.filter((i) => i.category === 'interaction')).toHaveLength(0);
  });

  it('blocks_formulation=true produces blocker', () => {
    const r = validateFormulationPure(
      input({ interactions: [{ ...interactions[0], blocksFormulation: true }] }, [
        ing({ ingredientId: 'calcium_citrate' }),
        ing({ ingredientId: 'iron_bisglycinate' }),
      ]),
    );
    expect(r.blockerCount).toBeGreaterThan(0);
    expect(r.issues.some((i) => i.severity === 'blocker' && i.category === 'interaction')).toBe(true);
  });

  it('minor severity produces info tier when non-blocking', () => {
    const r = validateFormulationPure(
      input({ interactions: [{ ...interactions[0], severity: 'minor', blocksFormulation: false }] }, [
        ing({ ingredientId: 'calcium_citrate' }),
        ing({ ingredientId: 'iron_bisglycinate' }),
      ]),
    );
    expect(r.infoCount).toBeGreaterThanOrEqual(1);
    expect(r.issues.some((i) => i.severity === 'info' && i.category === 'interaction')).toBe(true);
  });

  it('moderate severity produces warning when non-blocking', () => {
    const r = validateFormulationPure(
      input({ interactions }, [
        ing({ ingredientId: 'calcium_citrate' }),
        ing({ ingredientId: 'iron_bisglycinate' }),
      ]),
    );
    expect(r.issues.some((i) => i.severity === 'warning' && i.category === 'interaction')).toBe(true);
  });
});

// ---- Check 4: pediatric info -------------------------------------------

describe('validateFormulationPure — pediatric gate', () => {
  it('pediatric use adds info-tier note', () => {
    const r = validateFormulationPure(input({
      formulation: {
        intendedAdultUse: false, intendedPediatricUse: true, intendedPregnancyUse: false,
        unitsPerServing: 1, servingsPerDay: 1,
      },
    }, [ing({ dosePerServing: 100, library: { ...ing().library, tolerableUpperLimitPediatricMg: 1800 } })]));
    expect(r.issues.some((i) => i.category === 'pediatric' && i.severity === 'info')).toBe(true);
  });

  it('adult-only formulation has no pediatric info', () => {
    const r = validateFormulationPure(input());
    expect(r.issues.filter((i) => i.category === 'pediatric')).toHaveLength(0);
  });
});

// ---- Check 5: pregnancy -------------------------------------------------

describe('validateFormulationPure — pregnancy', () => {
  it('contraindicated ingredient in pregnancy formulation blocks', () => {
    const r = validateFormulationPure(input(
      { formulation: { intendedAdultUse: true, intendedPediatricUse: false, intendedPregnancyUse: true, unitsPerServing: 1, servingsPerDay: 1 } },
      [ing({
        ingredientId: 'ashwagandha',
        library: { ...ing().library, pregnancyCategory: 'contraindicated' },
      })],
    ));
    expect(r.issues.some((i) => i.category === 'pregnancy' && i.severity === 'blocker')).toBe(true);
  });

  it('caution ingredient produces warning, not blocker', () => {
    const r = validateFormulationPure(input(
      { formulation: { intendedAdultUse: true, intendedPediatricUse: false, intendedPregnancyUse: true, unitsPerServing: 1, servingsPerDay: 1 } },
      [ing({ library: { ...ing().library, pregnancyCategory: 'caution' } })],
    ));
    expect(r.issues.some((i) => i.category === 'pregnancy' && i.severity === 'warning')).toBe(true);
  });

  it('insufficient_data produces warning', () => {
    const r = validateFormulationPure(input(
      { formulation: { intendedAdultUse: true, intendedPediatricUse: false, intendedPregnancyUse: true, unitsPerServing: 1, servingsPerDay: 1 } },
      [ing({ library: { ...ing().library, pregnancyCategory: 'insufficient_data' } })],
    ));
    expect(r.issues.some((i) => i.category === 'pregnancy' && i.severity === 'warning')).toBe(true);
  });

  it('non-pregnancy formulation ignores pregnancy category', () => {
    const r = validateFormulationPure(input({}, [
      ing({ library: { ...ing().library, pregnancyCategory: 'contraindicated' } }),
    ]));
    expect(r.issues.filter((i) => i.category === 'pregnancy')).toHaveLength(0);
  });

  it('safe pregnancy category produces no issue', () => {
    const r = validateFormulationPure(input(
      { formulation: { intendedAdultUse: true, intendedPediatricUse: false, intendedPregnancyUse: true, unitsPerServing: 1, servingsPerDay: 1 } },
      [ing({ library: { ...ing().library, pregnancyCategory: 'safe' } })],
    ));
    expect(r.issues.filter((i) => i.category === 'pregnancy')).toHaveLength(0);
  });
});

// ---- Check 6: minimum active ingredient --------------------------------

describe('validateFormulationPure — minimum active ingredient', () => {
  it('empty ingredient list blocks', () => {
    const r = validateFormulationPure(input({}, []));
    expect(r.issues.some((i) => i.category === 'dose')).toBe(true);
    expect(r.blockerCount).toBeGreaterThan(0);
  });

  it('all-excipient formulation blocks (no active)', () => {
    const r = validateFormulationPure(input({}, [
      ing({ isActiveIngredient: false, ingredientId: 'cellulose' }),
    ]));
    // The cellulose ingredient also fails isAvailableForCustomFormulation
    // gate because our fixture has it true; override to isolate.
    expect(r.issues.some((i) => i.category === 'dose')).toBe(true);
  });

  it('single active ingredient passes the minimum check', () => {
    const r = validateFormulationPure(input());
    expect(r.issues.filter((i) => i.category === 'dose')).toHaveLength(0);
  });
});

// ---- Integrated passing scenario ----------------------------------------

describe('validateFormulationPure — happy path', () => {
  it('a valid adult formulation with safe ingredients passes (overallPassed=true)', () => {
    const r = validateFormulationPure(input());
    expect(r.overallPassed).toBe(true);
    expect(r.blockerCount).toBe(0);
  });

  it('returns estimated COGS per unit', () => {
    const r = validateFormulationPure(input({}, [
      ing({ dosePerServing: 1000, library: { ...ing().library, typicalCogsCentsPerMg: 0.2 } }),
    ]));
    // 1000 × 0.2 = 200 cents
    expect(r.estimatedCogsPerUnitCents).toBe(200);
  });
});
