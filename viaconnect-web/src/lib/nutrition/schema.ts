// Prompt #160 (extended by #164): Zod schema for the macronutrient analysis
// returned by the Layer-1/Layer-2/Layer-3 pipeline. The route handler validates
// the aggregated result against this shape so consumer clients only see
// data that conforms. The optional `data_source` field added in #164 keeps the
// schema backward-compatible with rows persisted by #160/#161.

import { z } from 'zod';

export const DataSourceSchema = z.enum(['usda', 'gemini_fallback', 'mixed', 'manual']);
export type DataSource = z.infer<typeof DataSourceSchema>;

// Prompt 186: macro fields are nullable. A nutrient that could not be
// extracted is UNKNOWN (null) and never coerced to 0; nutrient_flags carries
// which totals are partial sums or fully unknown so the UI can mark them.
export const NutrientFlagsSchema = z.object({
  partial: z.array(z.string()),
  unknown: z.array(z.string()),
  downgraded: z.boolean(),
});
export type NutrientFlags = z.infer<typeof NutrientFlagsSchema>;

export const NutritionAnalysisSchema = z.object({
  calories: z.number().int().min(0).max(20000).nullable(),
  protein_g: z.number().min(0).max(2000).nullable(),
  carbs_g: z.number().min(0).max(2000).nullable(),
  total_fat_g: z.number().min(0).max(2000).nullable(),
  saturated_fat_g: z.number().min(0).max(2000).nullable(),
  sugar_g: z.number().min(0).max(2000).nullable(),
  fiber_g: z.number().min(0).max(2000).nullable(),
  sodium_mg: z.number().min(0).max(100000).nullable().optional(),
  confidence: z.number().min(0).max(1),
  ai_notes: z.string().max(2000),
  serving_description: z.string().max(2000),
  data_source: DataSourceSchema.optional(),
  nutrient_flags: NutrientFlagsSchema.optional(),
});

export type NutritionAnalysis = z.infer<typeof NutritionAnalysisSchema>;

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const NutritionSourceSchema = z.enum(['manual_text', 'photo_ai', 'barcode', 'imported', 'quick_calories']);
export type NutritionSource = z.infer<typeof NutritionSourceSchema>;

export const NutritionStatusSchema = z.enum(['pending_review', 'confirmed', 'discarded']);
export type NutritionStatus = z.infer<typeof NutritionStatusSchema>;
