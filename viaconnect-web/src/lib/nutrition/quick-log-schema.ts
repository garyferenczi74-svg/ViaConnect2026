// Prompt #161: Zod schema for the POST /api/nutrition/quick-log payload.
// Quick Calories logs skip the Claude analysis from Prompt #160; the user
// asserts a calorie count, meal type, and an optional note, and the row is
// written directly as status='confirmed'.

import { z } from 'zod';
import { MealTypeSchema } from './schema';

export const QuickLogPayloadSchema = z.object({
  calories: z.number().int().min(1).max(9999),
  mealType: MealTypeSchema,
  note: z.string().max(80).optional(),
  loggedAt: z.string().datetime().optional(),
});

export type QuickLogPayload = z.infer<typeof QuickLogPayloadSchema>;
