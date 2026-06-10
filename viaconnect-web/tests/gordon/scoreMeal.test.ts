// Prompt 168 Refine phase: scoreMeal vitest suite.
//
// Two suites: (a) integer tier boundary correctness via assignTier; (b) 15
// hand-traced meal fixtures covering macro fit, fiber, sugar, sat fat, sodium,
// whole food, calorie fit, and snack distribution (locked-on-save divisor).
//
// Each fixture's expected score was derived by tracing the algorithm in
// src/lib/gordon/scoreMeal.ts step by step. If the algorithm is changed, the
// expected scores must be updated; a test failure pinpoints which fixture
// drifted.

import { describe, it, expect } from 'vitest';
import { scoreMeal } from '@/lib/gordon/scoreMeal';
import { assignTier, DEFAULT_MEAL_DISTRIBUTION } from '@/lib/gordon/constants';
import type {
  Meal,
  NutritionTargets,
  QualityTier,
} from '@/lib/gordon/types';

const STD_TARGETS: NutritionTargets = {
  targetId: 't1',
  userId: 'u1',
  effectiveFrom: '2026-05-14T00:00:00Z',
  dailyKcal: 2000,
  dailyProteinG: 100,
  dailyCarbsG: 250,
  dailyFatTotalG: 67,
  dailyFatSaturatedG: 22,
  dailyFatUnsatG: 45,
  dailyFiberG: 28,
  dailySugarG: 50,
  dailySodiumMg: 2300,
  sourceCaqSnapshot: null,
  sourceBodySnapshot: null,
  bioOptDay: null,
  mealDistribution: DEFAULT_MEAL_DISTRIBUTION,
  generatedByVersion: 'gordon-1.0.0',
  generatedAt: '2026-05-14T00:00:00Z',
  supersededAt: null,
  goalDirection: null,
  goalWeightKg: null,
  currentWeightKg: null,
  conservativePath: false,
  conservativeReason: null,
  macroBasis: null,
  lbmKg: null,
  lbmSource: null,
  bodyFatFraction: null,
  dietaryChoice: null,
};

function buildMeal(overrides: Partial<Meal>): Meal {
  return {
    mealId: 'm1',
    userId: 'u1',
    loggedAt: '2026-05-14T12:00:00Z',
    mealType: 'lunch',
    source: 'quick_log',
    sourceConfidence: 0.7,
    proteinG: 0,
    carbsG: 0,
    fatTotalG: 0,
    fatSourceId: null,
    fatBreakdown: null,
    fatQualityContribution: null,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
    caloriesKcal: 0,
    caloriesAutoCalc: true,
    wholeFoodFlag: null,
    ingredientsList: null,
    mealName: null,
    notes: null,
    rawInput: null,
    legacyNutritionLogId: null,
    qualityScore: null,
    qualityTier: null,
    scoreBreakdown: null,
    scoredAt: null,
    gordonVersion: null,
    snackIndex: null,
    createdAt: '2026-05-14T12:00:00Z',
    updatedAt: '2026-05-14T12:00:00Z',
    ...overrides,
  };
}

// Prompt 184b: build a minimal fat breakdown so fixtures can drive the
// Saturated Fat Penalty via the resolved saturated grams (replacing the old
// good/healthy split). fatQualityValue defaults to null (no quality fold).
function fb(saturatedG: number | null, fatQualityValue: number | null = null): Meal['fatBreakdown'] {
  return {
    fat_source_slug: null,
    intrinsic_fat_g: 0,
    added_fat_g: 0,
    saturated_g: saturatedG,
    added_saturated_g: null,
    added_monounsaturated_g: null,
    added_polyunsaturated_g: null,
    added_trans_g: null,
    added_omega3_g: null,
    added_omega6_g: null,
    fat_quality_value: fatQualityValue,
  };
}

describe('assignTier boundaries', () => {
  it.each<[number, QualityTier]>([
    [0, 'Poor'],
    [19, 'Poor'],
    [20, 'Fair'],
    [39, 'Fair'],
    [40, 'Good'],
    [59, 'Good'],
    [60, 'Excellent'],
    [79, 'Excellent'],
    [80, 'Perfection'],
    [100, 'Perfection'],
  ])('score %i maps to %s', (score, expected) => {
    expect(assignTier(score)).toBe(expected);
  });
});

interface ScoreFixture {
  name: string;
  meal: Meal;
  snacksToday?: number;
  expectedScore: number;
  expectedTier: QualityTier;
}

const FIXTURES: ScoreFixture[] = [
  {
    // Breakfast lunch share 0.25. P25g=target, C60/62.5 within 15%,
    // F15/16.75 within 15%, fiber 7/7=1.0, sugar 6/12.5=0.48, sat=3/5.5=0.55,
    // sodium 500/575=0.87, whole food true, kcal auto=475 vs 500 within 15%.
    // 50+10+10+10+15+0+0+0+10+5 = 110 -> clamp 100, Perfection.
    name: 'perfect breakfast: hits all targets',
    meal: buildMeal({
      mealType: 'breakfast',
      proteinG: 25, carbsG: 60, fatTotalG: 15, fatBreakdown: fb(3),
      fiberG: 7, sugarG: 6, sodiumMg: 500, wholeFoodFlag: true,
    }),
    expectedScore: 100,
    expectedTier: 'Perfection',
  },
  {
    // Catastrophic breakfast: tiny P, huge C, huge F, no fiber, max sugar,
    // sat fat 13x, sodium 2.6x. Whole food off. kcal auto 1540 vs 500 (>50%).
    // 50 -10 -10 -10 +0 -20 -15 -15 +0 -5 = -35 -> clamp 0, Poor.
    name: 'catastrophic breakfast: every penalty fires',
    meal: buildMeal({
      mealType: 'breakfast',
      proteinG: 5, carbsG: 200, fatTotalG: 80, fatBreakdown: fb(75),
      fiberG: 0, sugarG: 50, sodiumMg: 1500, wholeFoodFlag: false,
    }),
    expectedScore: 0,
    expectedTier: 'Poor',
  },
  {
    // Moderate lunch. share 0.30. P35/30=+17%, C70/75=-7%, F25/20.1=+24%,
    // fiber 6/8.4=0.71, sugar 8/15=0.53, sat 15/6.6=2.27 (-15), sodium
    // 700/690=1.014 (-5), whole food null, kcal auto=645 vs 600 within 15%.
    // 50 +5 +10 +5 +5 +0 -15 -5 +0 +5 = 60, Excellent boundary.
    name: 'lunch on Excellent boundary: hits 60',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 35, carbsG: 70, fatTotalG: 25, fatBreakdown: fb(15),
      fiberG: 6, sugarG: 8, sodiumMg: 700, wholeFoodFlag: null,
    }),
    expectedScore: 60,
    expectedTier: 'Excellent',
  },
  {
    // Dinner: high fiber bonus. share 0.30. P30/30 (+10). C75/75 (+10).
    // F15/20.1 = -25% which is in the 15-30 range (+5, NOT +10).
    // Fiber 9/8.4=1.07 (+15). Sugar 1/15=0.07 (+0). Sat 5/6.6=0.76 (+0).
    // Sodium 200/690 (+0). whole food null (+0). kcal auto 555 vs 600 delta
    // 7.5% (+5).
    // 50 +10 +10 +5 +15 +0 +0 +0 +0 +5 = 95, Perfection.
    name: 'dinner with fiber bonus full',
    meal: buildMeal({
      mealType: 'dinner',
      proteinG: 30, carbsG: 75, fatTotalG: 15, fatBreakdown: fb(5),
      fiberG: 9, sugarG: 1, sodiumMg: 200, wholeFoodFlag: null,
    }),
    expectedScore: 95,
    expectedTier: 'Perfection',
  },
  {
    // Lunch with zero fiber. share 0.30. Targets P30/C75/F20.1.
    // P30/C75/F20: all within 15%. Fiber 0 (+0). Sugar 0 (+0). Sat fat
    // 20-10=10/6.6=1.51 (-10). Sodium 600/690=0.87. whole food null. Kcal
    // auto=600 within 15%.
    // 50 +10 +10 +10 +0 +0 -10 +0 +0 +5 = 75, Excellent.
    name: 'lunch zero fiber: no bonus but otherwise solid',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 30, carbsG: 75, fatTotalG: 20, fatBreakdown: fb(10),
      fiberG: 0, sugarG: 0, sodiumMg: 600, wholeFoodFlag: null,
    }),
    expectedScore: 75,
    expectedTier: 'Excellent',
  },
  {
    // Lunch 2x sugar over. share 0.30. Sugar 30/15=2.0 (-20). All else nominal.
    // P30/C75/F15(under -25% +5)/fiber7(0.83 +10)/sat 15-10=5/6.6=0.76(0)/sod400.
    // Kcal auto=30*4+75*4+15*9=555, target 600, delta 7.5% (+5).
    // 50 +10 +10 +5 +10 -20 +0 +0 +0 +5 = 70, Excellent.
    name: 'lunch with sugar 2x over: -20 penalty fires',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 30, carbsG: 75, fatTotalG: 15, fatBreakdown: fb(5),
      fiberG: 7, sugarG: 30, sodiumMg: 400, wholeFoodFlag: null,
    }),
    expectedScore: 70,
    expectedTier: 'Excellent',
  },
  {
    // Lunch with sodium 2x over. share 0.30. sodium 1500/690=2.17 (-15).
    // Other nominal: P30/C75/F20(-0.5% +10)/fiber7(0.83 +10)/sugar 5/15
    // ratio 0.33 (+0)/sat 20-12=8/6.6=1.21 (-5). Kcal auto=600 (+5).
    // 50 +10 +10 +10 +10 +0 -5 -15 +0 +5 = 75, Excellent.
    name: 'lunch with sodium 2x over',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 30, carbsG: 75, fatTotalG: 20, fatBreakdown: fb(8),
      fiberG: 7, sugarG: 5, sodiumMg: 1500, wholeFoodFlag: null,
    }),
    expectedScore: 75,
    expectedTier: 'Excellent',
  },
  {
    // Lunch with whole_food_flag true and otherwise modest. P25/C60/F18(-11%
    // +10)/fiber5(0.60 +5)/sugar 8(0.53 +0)/sat 18-10=8/6.6=1.21 (-5)/sodium
    // 500(0.72 +0)/whole food +10. P25/30=-17% (+5). C60/75=-20% (+5).
    // F18/20.1=-10% (+10). Kcal auto=25*4+60*4+18*9=502 vs 600 delta 16.4%
    // (+0 in 15-30 range).
    // 50 +5 +5 +10 +5 +0 -5 +0 +10 +0 = 80, Perfection.
    name: 'lunch with whole food flag tips into Perfection',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 25, carbsG: 60, fatTotalG: 18, fatBreakdown: fb(8),
      fiberG: 5, sugarG: 8, sodiumMg: 500, wholeFoodFlag: true,
    }),
    expectedScore: 80,
    expectedTier: 'Perfection',
  },
  {
    // Lunch with ingredients_list 80% whole (4 of 5 entries whole=true).
    // Score path mirrors fixture above but +7 instead of +10 whole bonus.
    // 50 +5 +5 +10 +5 +0 -5 +0 +7 +0 = 77, Excellent.
    name: 'lunch with ingredients_list 80% whole foods (+7)',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 25, carbsG: 60, fatTotalG: 18, fatBreakdown: fb(8),
      fiberG: 5, sugarG: 8, sodiumMg: 500, wholeFoodFlag: false,
      ingredientsList: [
        { whole: true }, { whole: true }, { whole: true }, { whole: true }, { whole: false },
      ],
    }),
    expectedScore: 77,
    expectedTier: 'Excellent',
  },
  {
    // Lunch: calorie way over (>50%). manual kcal 1200 vs 600 target. delta
    // 100% (-5). P30/C75/F20(-0.5% +10). fiber7(0.83 +10). sugar 5(0.33 +0).
    // sat 8(1.21 -5). sodium 400(+0). whole food null.
    // 50 +10 +10 +10 +10 +0 -5 +0 +0 -5 = 80, Perfection.
    name: 'lunch with manual calories 2x over per-meal target',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 30, carbsG: 75, fatTotalG: 20, fatBreakdown: fb(8),
      fiberG: 7, sugarG: 5, sodiumMg: 400,
      caloriesKcal: 1200, caloriesAutoCalc: false, wholeFoodFlag: null,
    }),
    expectedScore: 80,
    expectedTier: 'Perfection',
  },
  {
    // SNACK locked-on-save with 1 snack today. Pool 0.15, divisor 1, share 0.15.
    // Targets P15/C37.5/F10.05/sat3.3/fiber4.2/sugar7.5/sodium345/kcal300.
    // Meal P10/C20/F8/healthy6/fiber3/sugar5/sodium200/whole-true.
    // protein 10/15=-33% (+0). carbs 20/37.5=-47% (+0). fat 8/10.05=-20% (+5).
    // fiber 3/4.2=0.71 (+5). sugar 5/7.5=0.67 (+0). sat 8-6=2/3.3=0.61 (+0).
    // sodium 200/345=0.58 (+0). whole food true (+10). kcal auto 192 vs 300
    // delta 36% (-2).
    // 50 +0 +0 +5 +5 +0 +0 +0 +10 -2 = 68, Excellent.
    name: 'snack with 1 logged today: full pool 0.15 share',
    meal: buildMeal({
      mealType: 'snack',
      proteinG: 10, carbsG: 20, fatTotalG: 8, fatBreakdown: fb(2),
      fiberG: 3, sugarG: 5, sodiumMg: 200, wholeFoodFlag: true,
    }),
    snacksToday: 1,
    expectedScore: 68,
    expectedTier: 'Excellent',
  },
  {
    // SNACK locked-on-save with 2 snacks today. Pool 0.15, divisor 2,
    // share 0.075. Same meal as above.
    // Targets P7.5/C18.75/F5.025/sat1.65/fiber2.1/sugar3.75/sodium172.5/kcal150.
    // protein 10/7.5=+33% (+0). carbs 20/18.75=+6.67% (+10). fat 8/5.025=+59%
    // (-10). fiber 3/2.1=1.43 (+15). sugar 5/3.75=1.33 (-10). sat 2/1.65=1.21
    // (-5). sodium 200/172.5=1.16 (-5). whole food true (+10). kcal auto 192
    // vs 150 delta 28% (+0).
    // 50 +0 +10 -10 +15 -10 -5 -5 +10 +0 = 55, Good.
    name: 'snack with 2 logged today: half pool share 0.075',
    meal: buildMeal({
      mealType: 'snack',
      proteinG: 10, carbsG: 20, fatTotalG: 8, fatBreakdown: fb(2),
      fiberG: 3, sugarG: 5, sodiumMg: 200, wholeFoodFlag: true,
    }),
    snacksToday: 2,
    expectedScore: 55,
    expectedTier: 'Good',
  },
  {
    // SNACK locked-on-save with 4+ snacks today (cap clamps). Pool 0.15,
    // divisor 4, share 0.0375. Same meal as above.
    // Targets P3.75/C9.375/F2.51/sat0.825/fiber1.05/sugar1.875/sodium86.25/kcal75.
    // protein 10/3.75=+167% (-10). carbs 20/9.375=+113% (-10). fat 8/2.51=+219%
    // (-10). fiber 3/1.05=2.86 (+15). sugar 5/1.875=2.67 (-20). sat 2/0.825=
    // 2.42 (-15). sodium 200/86.25=2.32 (-15). whole food true (+10). kcal
    // auto 192 vs 75 delta 156% (-5).
    // 50 -10 -10 -10 +15 -20 -15 -15 +10 -5 = -10 -> clamp 0, Poor.
    name: 'snack with 4 logged today: cap clamps divisor',
    meal: buildMeal({
      mealType: 'snack',
      proteinG: 10, carbsG: 20, fatTotalG: 8, fatBreakdown: fb(2),
      fiberG: 3, sugarG: 5, sodiumMg: 200, wholeFoodFlag: true,
    }),
    snacksToday: 4,
    expectedScore: 0,
    expectedTier: 'Poor',
  },
  {
    // Lunch with whole_food_flag false, no ingredients list, otherwise nominal.
    // share 0.30. P30/C75/F20 within 15% (+10 each). fiber 7/8.4=0.83 (+10).
    // sugar 5/15=0.33 (+0). sat 20-10=10/6.6=1.51 (-10). sodium 600/690=0.87
    // (+0). whole food false (+0). kcal auto=30*4+75*4+20*9=600, exactly
    // target (+5).
    // 50 +10 +10 +10 +10 +0 -10 +0 +0 +5 = 85, Perfection.
    name: 'lunch without whole food signal',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 30, carbsG: 75, fatTotalG: 20, fatBreakdown: fb(10),
      fiberG: 7, sugarG: 5, sodiumMg: 600, wholeFoodFlag: false,
    }),
    expectedScore: 85,
    expectedTier: 'Perfection',
  },
  {
    // Sat fat 2x over isolation: targets nominal except sat fat. share 0.30.
    // fatTotal 25, healthy 5 -> sat=20/6.6=3.03 (-15). protein 30/30 (+10).
    // carbs 75/75 (+10). fat 25/20.1=+24% (+5). fiber 8.4 (+15). sugar 5
    // (+0). sodium 400 (+0). whole food null (+0). kcal auto=30*4+75*4+25*9
    // =645 vs 600 delta 7.5% (+5).
    // 50 +10 +10 +5 +15 +0 -15 +0 +0 +5 = 80, Perfection.
    name: 'lunch with sat fat triple over: -15 penalty isolated',
    meal: buildMeal({
      mealType: 'lunch',
      proteinG: 30, carbsG: 75, fatTotalG: 25, fatBreakdown: fb(20),
      fiberG: 8.4, sugarG: 5, sodiumMg: 400, wholeFoodFlag: null,
    }),
    expectedScore: 80,
    expectedTier: 'Perfection',
  },
];

describe('scoreMeal fixtures (15 hand-traced)', () => {
  it.each(FIXTURES)('$name', ({ meal, snacksToday, expectedScore, expectedTier }) => {
    const result = scoreMeal(meal, STD_TARGETS, DEFAULT_MEAL_DISTRIBUTION, snacksToday ?? 0);
    expect(result.final_score).toBe(expectedScore);
    expect(result.tier).toBe(expectedTier);
    expect(result.base).toBe(50);
    expect(result.modifiers).toHaveLength(9); // P, C, F, fiber, sugar, sat, sodium, whole, kcal
    expect(result.gordon_version).toBe('1.0.0');
  });
});

describe('scoreMeal modifier order', () => {
  it('emits modifiers in spec order', () => {
    const result = scoreMeal(
      buildMeal({ mealType: 'lunch', proteinG: 30, carbsG: 75, fatTotalG: 20, fatBreakdown: fb(10), fiberG: 7, sugarG: 5, sodiumMg: 400 }),
      STD_TARGETS,
      DEFAULT_MEAL_DISTRIBUTION,
      0,
    );
    expect(result.modifiers.map((m) => m.name)).toEqual([
      'Protein Fit',
      'Carb Fit',
      'Fat Fit',
      'Fiber Bonus',
      'Sugar Penalty',
      'Saturated Fat Penalty',
      'Sodium Penalty',
      'Whole Food Bonus',
      'Calorie Fit',
    ]);
  });
});

describe('Saturated Fat Penalty fat-source quality fold (Prompt 184b)', () => {
  const satMod = (breakdown: Meal['fatBreakdown']) =>
    scoreMeal(
      buildMeal({
        mealType: 'lunch', proteinG: 30, carbsG: 75, fatTotalG: 30,
        fiberG: 7, sugarG: 5, sodiumMg: 400, fatBreakdown: breakdown,
      }),
      STD_TARGETS,
      DEFAULT_MEAL_DISTRIBUTION,
      0,
    ).modifiers.find((m) => m.name === 'Saturated Fat Penalty');

  it('scores saturated from the breakdown, not the old good/healthy split', () => {
    expect(satMod(fb(13.2))?.value).toBe(-15); // 13.2 / 6.6 limit = 2.0 ratio
  });
  it('a favorable source softens the penalty', () => {
    expect(satMod(fb(8, 85))?.value).toBe(-2); // -5 base + 3 favorable
  });
  it('a limit source hardens the penalty', () => {
    expect(satMod(fb(8, 35))?.value).toBe(-8); // -5 base - 3 limit
  });
  it('excludes the penalty when saturated is not determinable', () => {
    const m = satMod(fb(null));
    expect(m?.value).toBe(0);
    expect(m?.excluded).toBe(true);
  });
});
