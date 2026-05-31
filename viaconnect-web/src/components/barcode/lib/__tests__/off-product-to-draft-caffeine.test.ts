// Prompt 171b Phase 2: tests for OFF caffeine extraction in the
// convertOFFProductToMealItemDraft helper.

import { describe, it, expect } from 'vitest';
import { convertOFFProductToMealItemDraft } from '../off-product-to-draft';
import type { OFFProduct } from '@/lib/nutrition/barcode/types';

function makeProduct(overrides: Partial<OFFProduct> = {}): OFFProduct {
  return {
    code: '9002490100070',
    product_name: 'Red Bull Energy Drink',
    brands: 'Red Bull',
    nutriments: {
      'energy-kcal_100g': 45,
      'proteins_100g': 0,
      'carbohydrates_100g': 11,
      'fat_100g': 0,
      'sugars_100g': 11,
      'caffeine_100ml': 32,
    },
    image_url: null,
    nutriscore_grade: 'e',
    nova_group: 4,
    ecoscore_grade: null,
    ingredients_text: null,
    allergens_tags: null,
    serving_size: '250 ml',
    completeness: 0.8,
    caffeine_per_100g_mg: 32,
    ...overrides,
  };
}

describe('convertOFFProductToMealItemDraft caffeine extraction', () => {
  it('populates caffeine_mg from caffeine_per_100g_mg scaled by serving size', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct(), {
      portionMultiplier: 1,
    });
    expect(draft).not.toBeNull();
    // 250ml serving x 32mg/100ml = 80mg.
    expect(draft!.caffeine_mg).toBeCloseTo(80, 0);
  });

  it('omits caffeine_mg when OFF caffeine_per_100g_mg is null', () => {
    const draft = convertOFFProductToMealItemDraft(
      makeProduct({ caffeine_per_100g_mg: null }),
    );
    expect(draft).not.toBeNull();
    expect(draft!.caffeine_mg).toBeUndefined();
  });

  it('omits caffeine_mg when caffeine is zero', () => {
    const draft = convertOFFProductToMealItemDraft(
      makeProduct({ caffeine_per_100g_mg: 0 }),
    );
    expect(draft).not.toBeNull();
    expect(draft!.caffeine_mg).toBeUndefined();
  });

  it('clamps caffeine_mg to the 1000 mg ceiling', () => {
    // 300ml * 400mg/100ml = 1200mg; clamped to 1000.
    const draft = convertOFFProductToMealItemDraft(
      makeProduct({
        caffeine_per_100g_mg: 400,
        serving_size: '300 ml',
      }),
    );
    expect(draft).not.toBeNull();
    expect(draft!.caffeine_mg).toBe(1000);
  });

  it('scales caffeine with portion multiplier (2x serving doubles caffeine)', () => {
    const draft = convertOFFProductToMealItemDraft(makeProduct(), {
      portionMultiplier: 2,
    });
    expect(draft).not.toBeNull();
    // 250ml x 2 = 500ml serving x 32mg/100ml = 160mg.
    expect(draft!.caffeine_mg).toBeCloseTo(160, 0);
  });

  it('populates portion_display_unit=mg for caffeine-only beverages (low calorie)', () => {
    // Black coffee shape: minimal calories, caffeine present.
    const blackCoffee = makeProduct({
      product_name: 'Brewed Coffee',
      nutriments: {
        'energy-kcal_100g': 1,
        'proteins_100g': 0,
        'carbohydrates_100g': 0,
        'fat_100g': 0,
        'caffeine_100ml': 40,
      },
      caffeine_per_100g_mg: 40,
      serving_size: '237 ml',
    });
    const draft = convertOFFProductToMealItemDraft(blackCoffee);
    expect(draft).not.toBeNull();
    expect(draft!.caffeine_mg).toBeGreaterThan(0);
    expect(draft!.portion_display_unit).toBe('mg');
    expect(draft!.portion_display_value).toBe(draft!.caffeine_mg);
  });

  it('does NOT override portion_display when item has substantive calories', () => {
    // Red Bull has 45 kcal / 100ml -> ~112 kcal at 250ml. Has macros AND
    // caffeine; the display unit stays as the default (not mg).
    const draft = convertOFFProductToMealItemDraft(makeProduct());
    expect(draft).not.toBeNull();
    expect(draft!.caffeine_mg).toBeGreaterThan(0);
    expect(draft!.portion_display_unit).toBeUndefined();
    expect(draft!.portion_display_value).toBeUndefined();
  });
});
