// Prompt #164 Layer 1: validates the JSON Gemini returns when parsing a meal
// description or photo. Any deviation throws and the route returns 502 with
// the MALFORMED_RESPONSE taxonomy code.

import { z } from 'zod';

export const ParsedItemUnitSchema = z.enum([
  'whole', 'slice', 'cup', 'tbsp', 'tsp', 'g', 'oz', 'ml',
  'medium', 'large', 'small', 'serving',
]);
export type ParsedItemUnit = z.infer<typeof ParsedItemUnitSchema>;

export const ParsedItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive().max(1000),
  unit: ParsedItemUnitSchema,
  preparation: z.string().max(200).optional(),
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const ParsedMealSchema = z.object({
  items: z.array(ParsedItemSchema).max(50),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(2000).default(''),
});
export type ParsedMeal = z.infer<typeof ParsedMealSchema>;
