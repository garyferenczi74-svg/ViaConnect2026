import { z } from 'zod';

export const dietNutritionSchema = z.object({
  diet_type: z.enum(['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean', 'other']).default('omnivore'),
  diet_other: z.string().optional(),
  meals_per_day: z.number().int().min(0).max(10).default(3),
  water_intake_liters: z.number().min(0).max(10).optional(),
  food_restrictions: z.array(z.string()).default([]),
  food_allergies: z.array(z.string()).default([]),
  food_intolerances: z.array(z.string()).default([]),
  caffeine_cups_per_day: z.number().min(0).max(20).default(0),
  alcohol_drinks_per_week: z.number().min(0).max(100).default(0),
  processed_food_frequency: z.enum(['never', 'rarely', 'sometimes', 'often', 'daily']).default('sometimes'),
});

export type DietNutrition = z.infer<typeof dietNutritionSchema>;
