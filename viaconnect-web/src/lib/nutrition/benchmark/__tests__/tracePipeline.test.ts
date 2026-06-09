import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock only the two network stage functions. aggregate (text meal totals) and
// estimatePortion (photo grams) stay REAL since they are pure and deterministic.
vi.mock('../../usda-client', () => ({ lookupFood: vi.fn() }));
vi.mock('../../databases/resolver', () => ({ resolveNutrients: vi.fn() }));

import { lookupFood } from '../../usda-client';
import { resolveNutrients } from '../../databases/resolver';
import { traceTextPipeline, tracePhotoPipeline } from '../tracePipeline';
import type { VisionItem } from '../../vision/types';

const lookupFoodMock = vi.mocked(lookupFood);
const resolveNutrientsMock = vi.mocked(resolveNutrients);

beforeEach(() => {
  lookupFoodMock.mockReset();
  resolveNutrientsMock.mockReset();
});

describe('traceTextPipeline', () => {
  it('captures reference, grams, per-100g, and totals for a USDA hit', async () => {
    lookupFoodMock.mockImplementation(async (_name, _qty, _unit, trace) => {
      if (trace) {
        trace.matchedName = 'Rice, white, cooked';
        trace.fdcId = 169704;
        trace.grams = 150;
        trace.unitToGramsResolved = true;
        trace.cacheHit = false;
        trace.dataType = 'Foundation,SR Legacy';
        trace.per100g = {
          calories: 130,
          protein_g: 2.7,
          carbs_g: 28.2,
          total_fat_g: 0.3,
          saturated_fat_g: 0.1,
          trans_fat_g: 0,
          omega3_g: 0,
          sugar_g: 0.1,
          fiber_g: 0.4,
        };
      }
      return {
        calories: 195,
        protein_g: 4.1,
        carbs_g: 42.3,
        total_fat_g: 0.4,
        saturated_fat_g: 0.1,
        trans_fat_g: 0,
        omega3_g: 0,
        sugar_g: 0.1,
        fiber_g: 0.6,
        source: 'usda',
      };
    });

    const meal = await traceTextPipeline([
      { name: 'white rice', quantity: 150, unit: 'g' },
    ]);

    expect(meal.engine).toBe('text');
    expect(meal.items).toHaveLength(1);
    const t = meal.items[0];
    expect(t.referenceSource).toBe('usda');
    expect(t.referenceId).toBe('169704');
    expect(t.matchedName).toBe('Rice, white, cooked');
    expect(t.estimatedGrams).toBe(150);
    expect(t.per100g?.calories_kcal).toBe(130);
    expect(t.per100g?.fat_g).toBe(0.3);
    expect(t.conversionChain).toContain('150g');
    expect(t.conversionChain).toContain('via unitToGrams');
    expect(t.itemTotals.calories_kcal).toBe(195);
    expect(t.itemTotals.sodium_mg).toBeNull();
    expect(t.nullFields).toContain('sodium_mg');
    expect(t.detectedBasis).toBeNull();
    expect(t.error).toBeNull();
    expect(meal.mealTotals.calories_kcal).toBe(195);
    expect(meal.atwater).not.toBeNull();
    expect(meal.atwater?.macroDerivedKcal).toBeGreaterThan(0);
  });

  it('records a USDA miss without crashing', async () => {
    lookupFoodMock.mockResolvedValue(null);
    const meal = await traceTextPipeline([
      { name: 'unobtainium', quantity: 1, unit: 'serving' },
    ]);
    expect(meal.items[0].referenceSource).toBe('usda_miss');
    expect(meal.items[0].itemTotals.calories_kcal).toBeNull();
    expect(meal.mealTotals.calories_kcal).toBeNull();
    expect(meal.atwater).toBeNull();
  });

  it('fails open on a stage error and continues to the next item', async () => {
    lookupFoodMock
      .mockRejectedValueOnce(new Error('USDA 503'))
      .mockImplementation(async (_name, _qty, _unit, trace) => {
        if (trace) {
          trace.grams = 50;
          trace.fdcId = 1;
          trace.unitToGramsResolved = true;
          trace.per100g = {
            calories: 100,
            protein_g: 1,
            carbs_g: 1,
            total_fat_g: 1,
            saturated_fat_g: 0,
            trans_fat_g: 0,
            omega3_g: 0,
            sugar_g: 0,
            fiber_g: 0,
          };
        }
        return {
          calories: 50,
          protein_g: 1,
          carbs_g: 1,
          total_fat_g: 1,
          saturated_fat_g: 0,
          trans_fat_g: 0,
          omega3_g: 0,
          sugar_g: 0,
          fiber_g: 0,
          source: 'usda',
        };
      });

    const meal = await traceTextPipeline([
      { name: 'broken', quantity: 1, unit: 'g' },
      { name: 'ok', quantity: 50, unit: 'g' },
    ]);

    expect(meal.items).toHaveLength(2);
    expect(meal.items[0].error).toContain('USDA 503');
    expect(meal.items[0].itemTotals.calories_kcal).toBeNull();
    expect(meal.items[1].error).toBeNull();
    expect(meal.items[1].itemTotals.calories_kcal).toBe(50);
  });
});

describe('tracePhotoPipeline', () => {
  const visionItem: VisionItem = {
    id: 'v1',
    foodName: 'grilled chicken breast',
    cuisineTag: 'north_american',
    boundingBox: { x: 0, y: 0, w: 100, h: 100 },
    confidence: 0.9,
    portionGramsHint: 100,
    cookingMethod: 'grilled',
  };

  it('captures source, grams, and scaled totals using the real portion estimator', async () => {
    resolveNutrientsMock.mockResolvedValue({
      source: 'usda_fdc',
      foodName: 'Chicken breast, grilled',
      per100g: {
        calories_kcal: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 74,
      },
      usdaFdcId: 171534,
    });

    const meal = await tracePhotoPipeline([visionItem], 'det:grilled-chicken');

    expect(meal.engine).toBe('photo');
    expect(meal.items).toHaveLength(1);
    const t = meal.items[0];
    expect(t.referenceSource).toBe('usda_fdc');
    expect(t.referenceId).toBe('171534');
    expect(t.estimatedGrams).toBe(100);
    expect(t.detectedBasis).toBe('grilled');
    expect(t.per100g?.calories_kcal).toBe(165);
    // grams 100 -> factor 1.0
    expect(t.itemTotals.calories_kcal).toBe(165);
    expect(t.itemTotals.sodium_mg).toBe(74);
    expect(t.error).toBeNull();
    expect(meal.atwater).toBeNull();
  });

  it('records a resolve miss but still reports the portion estimate', async () => {
    resolveNutrientsMock.mockResolvedValue(null);
    const meal = await tracePhotoPipeline([visionItem], 'det:x');
    expect(meal.items[0].referenceSource).toBe('resolve_miss');
    expect(meal.items[0].estimatedGrams).toBe(100);
    expect(meal.items[0].itemTotals.calories_kcal).toBeNull();
  });

  it('sums meal totals across multiple resolved photo items', async () => {
    const second: VisionItem = {
      ...visionItem,
      id: 'v2',
      foodName: 'white rice',
      portionGramsHint: 100,
    };
    resolveNutrientsMock
      .mockResolvedValueOnce({
        source: 'usda_fdc',
        foodName: 'Chicken breast, grilled',
        per100g: { calories_kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, sugar_g: 0, sodium_mg: 74 },
        usdaFdcId: 171534,
      })
      .mockResolvedValueOnce({
        source: 'usda_fdc',
        foodName: 'Rice, white, cooked',
        per100g: { calories_kcal: 130, protein_g: 2.7, carbs_g: 28.2, fat_g: 0.3, fiber_g: 0.4, sugar_g: 0.1, sodium_mg: 1 },
        usdaFdcId: 169704,
      });
    const meal = await tracePhotoPipeline([visionItem, second], 'det:plate');
    expect(meal.items).toHaveLength(2);
    expect(meal.mealTotals.calories_kcal).toBe(295);
    expect(meal.mealTotals.protein_g).toBe(33.7);
  });
});
