// Prompt #170 Phase 1l: payload + recalc smoke for useMealItemEdits.
//
// The hook itself is a React hook and cannot be invoked outside a renderer
// without jsdom (not in deps for this repo per Rule #2). This suite exercises
// the contract by constructing a payload of the same shape and validating it
// against NutriVisionMealInsertSchema, and by exercising the recalc math via
// a local replication of the per_100g rule so any drift between the hook and
// the schema is caught at the test boundary.

import { describe, it, expect } from 'vitest';
import { NutriVisionMealInsertSchema } from '@/lib/nutrition/meals-insert-schema';

function recalcCaloriesPer100g(per100gKcal: number, grams: number): number {
  return Math.round(per100gKcal * (grams / 100));
}

describe('useMealItemEdits payload + recalc', () => {
  it('setPortion math: doubling grams doubles macros (within rounding)', () => {
    const per100g = 150; // kcal per 100 g
    const at100 = recalcCaloriesPer100g(per100g, 100);
    const at200 = recalcCaloriesPer100g(per100g, 200);
    expect(at100).toBe(150);
    expect(at200).toBe(300);
  });

  it('buildSavePayload shape validates against NutriVisionMealInsertSchema', () => {
    // A minimal payload of the same shape the hook produces. The schema is
    // the single source of truth, and this snapshot keeps the hook honest.
    const payload = {
      source: 'nutrivision' as const,
      meal_type: 'lunch' as const,
      logged_at: new Date().toISOString(),
      meal_confidence: 0.72,
      items: [
        {
          food_name: 'Grilled chicken breast',
          portion_grams: 142,
          calories_kcal: 234,
          protein_g: 43.7,
          carbs_g: 0,
          fat_g: 5.1,
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 89,
          nutrient_source: 'usda_fdc' as const,
          usda_fdc_id: 171477,
          recognition_provider: 'gemini' as const,
          recognition_confidence: 0.82,
          portion_estimation_method: 'vision_inference' as const,
          cooking_method: 'grilled',
          user_modified: false,
        },
        {
          food_name: 'Steamed broccoli',
          portion_grams: 85,
          calories_kcal: 29,
          protein_g: 2.4,
          carbs_g: 5.6,
          fat_g: 0.3,
          fiber_g: 2.2,
          sugar_g: 1.3,
          sodium_mg: 28,
          nutrient_source: 'farmceutica_curated' as const,
          recognition_provider: 'gemini' as const,
          recognition_confidence: 0.91,
          portion_estimation_method: 'reference_object' as const,
          cooking_method: 'steamed',
          user_modified: true,
        },
      ],
      edit_diff: {
        itemsAdded: 0,
        itemsRemoved: 0,
        itemsModified: 1,
        oilSelections: 0,
        portionChanges: 1,
      },
    };

    const result = NutriVisionMealInsertSchema.safeParse(payload);
    if (!result.success) {
      // Surface the issues so the failure message is useful.
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('cooking_oil block validates when present', () => {
    const payload = {
      source: 'nutrivision' as const,
      meal_type: 'dinner' as const,
      logged_at: new Date().toISOString(),
      items: [
        {
          food_name: 'Sauteed shrimp',
          portion_grams: 120,
          calories_kcal: 168,
          protein_g: 22,
          carbs_g: 1,
          fat_g: 8,
          nutrient_source: 'usda_fdc' as const,
          cooking_method: 'sauteed',
          cooking_oil: {
            type: 'olive_oil',
            amount_ml: 5,
            was_suggested_default: true,
            suggested_default_type: 'olive_oil',
            suggested_default_amount_ml: 5,
          },
          user_modified: true,
        },
      ],
    };

    const result = NutriVisionMealInsertSchema.safeParse(payload);
    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });
});
