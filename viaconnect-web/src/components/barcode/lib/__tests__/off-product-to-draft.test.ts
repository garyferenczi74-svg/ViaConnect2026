// Prompt 170l Phase 1c-4: tests for the OFFProduct -> MealItemDraft converter.
//
// Per-100g -> per-portion scaling, default serving size, edge cases for the
// optional fields (Nova group / NutriScore / serving_size / completeness),
// and the buildBlankSlateDraft + rescalePortion helpers.

import { describe, it, expect } from 'vitest';
import {
  convertOFFProductToMealItemDraft,
  rescalePortion,
  buildBlankSlateDraft,
} from '../off-product-to-draft';
import type { OFFProduct } from '@/lib/nutrition/barcode/types';

function makeProduct(overrides: Partial<OFFProduct> = {}): OFFProduct {
  return {
    code: '0123456789012',
    product_name: 'Test Yogurt',
    brands: 'TestBrand',
    nutriments: {
      'energy-kcal_100g': 60,
      'proteins_100g': 5,
      'carbohydrates_100g': 7,
      'fat_100g': 2,
      'fiber_100g': 0,
      'sugars_100g': 6,
      'sodium_100g': 0.05,
    },
    image_url: 'https://example.com/yogurt.jpg',
    nutriscore_grade: 'b',
    nova_group: 4,
    ecoscore_grade: 'c',
    ingredients_text: 'milk, sugar, live cultures',
    allergens_tags: ['en:milk'],
    serving_size: '170 g',
    completeness: 0.85,
    ...overrides,
  };
}

describe('convertOFFProductToMealItemDraft', () => {
  it('builds a MealItemDraft at 1x portion using the parsed serving size', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct(), {
      portionMultiplier: 1,
    });
    expect(draft).not.toBeNull();
    expect(draft!.food_name).toBe('Test Yogurt');
    expect(draft!.off_barcode).toBe('0123456789012');
    expect(draft!.from_barcode_scan).toBe(true);
    expect(draft!.nutrient_source).toBe('open_food_facts');
    expect(draft!.portion_grams).toBe(170);
    // 60 kcal/100g x 170g = 102 kcal
    expect(draft!.calories_kcal).toBe(102);
    // 5g protein/100g x 170g = 8.5g
    expect(draft!.protein_g).toBeCloseTo(8.5, 1);
    expect(draft!.fat_g).toBeCloseTo(3.4, 1);
    expect(draft!.carbs_g).toBeCloseTo(11.9, 1);
    expect(draft!.sodium_mg).toBe(85); // 0.05g * 1000 * 1.7
    expect(draft!.confidence_band).toBe('high');
  });

  it('halves macros at 0.5x portion multiplier', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct(), {
      portionMultiplier: 0.5,
    });
    expect(draft).not.toBeNull();
    expect(draft!.portion_grams).toBe(85);
    expect(draft!.calories_kcal).toBe(51); // 60 * 0.85
  });

  it('doubles macros at 2x portion multiplier', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct(), {
      portionMultiplier: 2,
    });
    expect(draft).not.toBeNull();
    expect(draft!.portion_grams).toBe(340);
    expect(draft!.calories_kcal).toBe(204);
  });

  it('defaults to 100g serving when serving_size is null', () => {
    const product = makeProduct({ serving_size: null });
    const draft = convertOFFProductToMealItemDraft(product);
    expect(draft).not.toBeNull();
    expect(draft!.portion_grams).toBe(100);
    expect(draft!.calories_kcal).toBe(60);
  });

  it('falls back to barcode for food_name when product_name is null', () => {
    const product = makeProduct({ product_name: null });
    const draft = convertOFFProductToMealItemDraft(product);
    expect(draft).not.toBeNull();
    expect(draft!.food_name).toBe('0123456789012');
  });

  it('returns null when calories nutriment is missing', () => {
    const product = makeProduct({
      nutriments: {
        'proteins_100g': 5,
        'carbohydrates_100g': 7,
        'fat_100g': 2,
      },
    });
    const draft = convertOFFProductToMealItemDraft(product);
    expect(draft).toBeNull();
  });

  it('returns null when nutriments is null', () => {
    const product = makeProduct({ nutriments: null });
    const draft = convertOFFProductToMealItemDraft(product);
    expect(draft).toBeNull();
  });

  it('only preserves Nova group when in 1-4 range', () => {
    const inRange = makeProduct({ nova_group: 3 });
    expect(convertOFFProductToMealItemDraft(inRange)!.off_nova_group).toBe(3);

    const tooHigh = makeProduct({ nova_group: 5 });
    expect(convertOFFProductToMealItemDraft(tooHigh)!.off_nova_group).toBeUndefined();

    const zero = makeProduct({ nova_group: 0 });
    expect(convertOFFProductToMealItemDraft(zero)!.off_nova_group).toBeUndefined();
  });

  it('only preserves NutriScore grade in a-e range', () => {
    const valid = makeProduct({ nutriscore_grade: 'd' });
    expect(convertOFFProductToMealItemDraft(valid)!.off_nutrition_grade_fr).toBe('d');

    const garbage = makeProduct({ nutriscore_grade: 'z' });
    expect(convertOFFProductToMealItemDraft(garbage)!.off_nutrition_grade_fr).toBeUndefined();

    const upper = makeProduct({ nutriscore_grade: 'A' });
    // Upper-case is rejected because the OFFProduct surfaces lowercase from the
    // OFF API. The converter is strict on the lowercase contract.
    expect(convertOFFProductToMealItemDraft(upper)!.off_nutrition_grade_fr).toBeUndefined();
  });

  it('preserves completeness score when present', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct());
    expect(draft!.off_completeness_score).toBe(0.85);
  });

  it('honors servingSizeOverrideG over the OFF-parsed value', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct(), {
      servingSizeOverrideG: 200,
      portionMultiplier: 1,
    });
    expect(draft!.portion_grams).toBe(200);
    expect(draft!.calories_kcal).toBe(120);
  });

  it('honors confidenceBand override (e.g. when ingested via voice search)', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct(), {
      confidenceBand: 'medium',
    });
    expect(draft!.confidence_band).toBe('medium');
  });
});

describe('rescalePortion', () => {
  it('recomputes macros against a new portion_grams', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct(), {
      portionMultiplier: 1,
    });
    expect(draft).not.toBeNull();
    const rescaled = rescalePortion(draft!, 100);
    expect(rescaled.portion_grams).toBe(100);
    expect(rescaled.calories_kcal).toBe(60);
    expect(rescaled.protein_g).toBeCloseTo(5, 1);
  });

  it('clamps to at least 1g portion', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct());
    const rescaled = rescalePortion(draft!, 0);
    expect(rescaled.portion_grams).toBe(1);
  });
});

describe('buildBlankSlateDraft', () => {
  it('builds a zero-macro draft tagged as a barcode-scan user_override', () => {
    const draft = buildBlankSlateDraft('012345678905');
    expect(draft.off_barcode).toBe('012345678905');
    expect(draft.from_barcode_scan).toBe(true);
    expect(draft.user_overrode_macros).toBe(true);
    expect(draft.nutrient_source).toBe('user_entered');
    expect(draft.calories_kcal).toBe(0);
    expect(draft.protein_g).toBe(0);
    expect(draft.confidence_band).toBe('low');
    expect(draft.food_name).toContain('012345678905');
  });
});
