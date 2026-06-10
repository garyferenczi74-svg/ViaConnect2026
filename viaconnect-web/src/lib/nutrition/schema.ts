// Prompt #160 (extended by #164): Zod schema for the macronutrient analysis
// returned by the Layer-1/Layer-2/Layer-3 pipeline. The route handler validates
// the aggregated result against this shape so consumer clients only see
// data that conforms. The optional `data_source` field added in #164 keeps the
// schema backward-compatible with rows persisted by #160/#161.

import { z } from 'zod';

export const DataSourceSchema = z.enum(['usda', 'gemini_fallback', 'mixed', 'manual']);
export type DataSource = z.infer<typeof DataSourceSchema>;

export const NutritionAnalysisSchema = z.object({
  calories: z.number().int().min(0).max(20000),
  protein_g: z.number().min(0).max(2000),
  carbs_g: z.number().min(0).max(2000),
  total_fat_g: z.number().min(0).max(2000),
  saturated_fat_g: z.number().min(0).max(2000),
  sugar_g: z.number().min(0).max(2000),
  fiber_g: z.number().min(0).max(2000),
  confidence: z.number().min(0).max(1),
  ai_notes: z.string().max(2000),
  serving_description: z.string().max(2000),
  data_source: DataSourceSchema.optional(),
});

export type NutritionAnalysis = z.infer<typeof NutritionAnalysisSchema>;

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const NutritionSourceSchema = z.enum(['manual_text', 'photo_ai', 'barcode', 'imported', 'quick_calories']);
export type NutritionSource = z.infer<typeof NutritionSourceSchema>;

export const NutritionStatusSchema = z.enum(['pending_review', 'confirmed', 'discarded']);
export type NutritionStatus = z.infer<typeof NutritionStatusSchema>;
