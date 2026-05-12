// Prompt #160: Zod schema for the Gordan macronutrient analysis returned by
// Claude. parseNutritionResponse() validates the raw JSON against this shape
// and throws on any field missing or out-of-range, so the route handler can
// return 502 to the client without leaking partial data.

import { z } from 'zod';

export const NutritionAnalysisSchema = z.object({
  calories: z.number().int().min(0).max(20000),
  protein_g: z.number().min(0).max(2000),
  carbs_g: z.number().min(0).max(2000),
  total_fat_g: z.number().min(0).max(2000),
  good_fat_g: z.number().min(0).max(2000),
  healthy_fat_g: z.number().min(0).max(2000),
  saturated_fat_g: z.number().min(0).max(2000),
  sugar_g: z.number().min(0).max(2000),
  fiber_g: z.number().min(0).max(2000),
  confidence: z.number().min(0).max(1),
  ai_notes: z.string().max(2000),
  serving_description: z.string().max(2000),
});

export type NutritionAnalysis = z.infer<typeof NutritionAnalysisSchema>;

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const NutritionSourceSchema = z.enum(['manual_text', 'photo_ai', 'barcode', 'imported']);
export type NutritionSource = z.infer<typeof NutritionSourceSchema>;

export const NutritionStatusSchema = z.enum(['pending_review', 'confirmed', 'discarded']);
export type NutritionStatus = z.infer<typeof NutritionStatusSchema>;
