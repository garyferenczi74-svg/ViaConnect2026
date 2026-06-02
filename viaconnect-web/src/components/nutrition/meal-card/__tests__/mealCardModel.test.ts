// Prompt 172 Phase 1A: mealCardModel mapper unit tests.
//
// Pure function tests; no React, no DOM, no fetch.
//
// Contract per spec 5.2 v3:
//   pre-save  -> mealId null,  mealQualityScore null
//   post-save -> mealId from SaveResponse.meal_id,
//                mealQualityScore from SaveResponse.gordon.quality_score
//   bosLine   -> always null in 1A; 172b wires the resolver
//   portion   -> built from MealItemDraft.portion_display_unit +
//                portion_display_value (171b fields) with grams fallback

import { describe, it, expect } from 'vitest';
import { toMealCardModel } from '../mealCardModel';
import type {
  MealDraft,
  MealItemDraft,
  SaveResponse,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';

function makeItem(overrides: Partial<MealItemDraft> = {}): MealItemDraft {
  return {
    id: 'item-1',
    food_name: 'Roasted chicken breast',
    portion_grams: 150,
    nutrient_source: 'farmceutica_curated',
    per_100g: {
      calories_kcal: 165,
      protein_g: 31,
      carbs_g: 0,
      fat_g: 3.6,
    },
    calories_kcal: 247.5,
    protein_g: 46.5,
    carbs_g: 0,
    fat_g: 5.4,
    user_modified: false,
    confidence_band: 'high',
    ...overrides,
  };
}

function makeDraft(overrides: Partial<MealDraft> = {}): MealDraft {
  return {
    id: 'draft-1',
    items: [makeItem()],
    totals: {
      calories_kcal: 247.5,
      protein_g: 46.5,
      carbs_g: 0,
      fat_g: 5.4,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
      cholesterol_mg: 0,
    },
    meal_confidence: 0.9,
    warnings: [],
    ...overrides,
  };
}

function makeSaveResponse(overrides: Partial<SaveResponse> = {}): SaveResponse {
  return {
    meal_id: 'meal-saved-1',
    gordon: {
      bio_optimization_delta: 1.2,
      copy: null,
      quality_score: 78,
      quality_tier: 'good',
    },
    dashboard_crossover: { nutrition_dimension_recompute_queued: true },
    helix_events_emitted: [],
    corpus_row_written: false,
    requestId: 'req-1',
    ...overrides,
  };
}

describe('toMealCardModel pre save', () => {
  it('returns mealId null when no saveResponse is supplied', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.mealId).toBeNull();
  });

  it('returns mealQualityScore null when no saveResponse is supplied', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.mealQualityScore).toBeNull();
  });
});

describe('toMealCardModel post save', () => {
  it('lifts meal_id from SaveResponse', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      saveResponse: makeSaveResponse({ meal_id: 'meal-xyz' }),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.mealId).toBe('meal-xyz');
  });

  it('lifts quality_score from SaveResponse.gordon', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      saveResponse: makeSaveResponse({
        gordon: {
          bio_optimization_delta: null,
          copy: null,
          quality_score: 92,
          quality_tier: 'excellent',
        },
      }),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.mealQualityScore).toBe(92);
  });
});

describe('toMealCardModel bosLine in 1A', () => {
  it('is always null pre save', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.bosLine).toBeNull();
  });

  it('is always null post save (172b wires the resolver, not 1A)', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      saveResponse: makeSaveResponse(),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.bosLine).toBeNull();
  });
});

describe('toMealCardModel portion label builds from 171b display fields', () => {
  it('uses portion_display_value + portion_display_unit when both present', () => {
    const model = toMealCardModel({
      draft: makeDraft({
        items: [
          makeItem({
            portion_display_value: 1.5,
            portion_display_unit: 'cup',
            portion_grams: 240,
          }),
        ],
      }),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.items[0].portionLabel).toBe('1.5 cup');
  });

  it('falls back to grams when the 171b display fields are missing', () => {
    const model = toMealCardModel({
      draft: makeDraft({
        items: [makeItem({ portion_grams: 175 })],
      }),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.items[0].portionLabel).toBe('175 g');
  });
});

describe('toMealCardModel macros', () => {
  it('passes through absolute kcal, protein, carbs, fat from draft.totals', () => {
    const model = toMealCardModel({
      draft: makeDraft({
        totals: {
          calories_kcal: 600,
          protein_g: 40,
          carbs_g: 60,
          fat_g: 20,
          fiber_g: 5,
          sugar_g: 10,
          sodium_mg: 0,
          cholesterol_mg: 0,
        },
      }),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.macros.kcal).toBe(600);
    expect(model.macros.proteinG).toBe(40);
    expect(model.macros.carbsG).toBe(60);
    expect(model.macros.fatsG).toBe(20);
  });

  it('derives percent splits across the three macro grams (170c ratio mode input)', () => {
    const model = toMealCardModel({
      draft: makeDraft({
        totals: {
          calories_kcal: 500,
          protein_g: 25, // 25 of 100 grams = 25 percent
          carbs_g: 50, // 50 of 100 grams = 50 percent
          fat_g: 25, // 25 of 100 grams = 25 percent
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 0,
          cholesterol_mg: 0,
        },
      }),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.macros.proteinPct).toBe(25);
    expect(model.macros.carbsPct).toBe(50);
    expect(model.macros.fatsPct).toBe(25);
  });

  it('returns zero percents when macro grams sum to zero', () => {
    const model = toMealCardModel({
      draft: makeDraft({
        totals: {
          calories_kcal: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 0,
          cholesterol_mg: 0,
        },
      }),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.macros.proteinPct).toBe(0);
    expect(model.macros.carbsPct).toBe(0);
    expect(model.macros.fatsPct).toBe(0);
  });
});

describe('toMealCardModel pass through flags', () => {
  it('forwards safetyMode flag', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      photoUrl: null,
      safetyMode: true,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.safetyMode).toBe(true);
  });

  it('forwards degradedService flag', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      photoUrl: null,
      safetyMode: false,
      degradedService: true,
      recognitionConfidence: 'high',
    });
    expect(model.degradedService).toBe(true);
  });

  it('forwards recognitionConfidence band', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      photoUrl: null,
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'low',
    });
    expect(model.recognitionConfidence).toBe('low');
  });

  it('uses photoUrl from props (171a signed url contract)', () => {
    const model = toMealCardModel({
      draft: makeDraft(),
      photoUrl: 'https://signed.example/photo.jpg',
      safetyMode: false,
      degradedService: false,
      recognitionConfidence: 'high',
    });
    expect(model.photoUrl).toBe('https://signed.example/photo.jpg');
  });
});
