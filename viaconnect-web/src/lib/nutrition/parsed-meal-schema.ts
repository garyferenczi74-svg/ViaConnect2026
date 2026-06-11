// Prompt #164 Layer 1: validates the JSON Gemini returns when parsing a meal
// description or photo. Any deviation throws and the route returns 502 with
// the MALFORMED_RESPONSE taxonomy code.

import { z } from 'zod';

export const ParsedItemUnitSchema = z.enum([
  'whole', 'slice', 'cup', 'tbsp', 'tsp', 'g', 'oz', 'ml',
  'medium', 'large', 'small', 'serving',
]);
export type ParsedItemUnit = z.infer<typeof ParsedItemUnitSchema>;

// Prompt 186 incident fix (2026-06-11): the optional fields are nullish, not
// just optional. The system prompt marks preparation "optional"; Gemini omits
// the key but Claude (the 180f fallback provider) emits an explicit null,
// which z.string().optional() rejects, so every successful Claude fallback
// parse was being discarded as a ZodError and the original Gemini failure
// rethrown. Nulls normalize to the undefined/default the engine expects.
export const ParsedItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive().max(1000),
  unit: ParsedItemUnitSchema,
  preparation: z.string().max(200).nullish().transform((v) => v ?? undefined),
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const ParsedMealSchema = z.object({
  items: z.array(ParsedItemSchema).max(50),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(2000).nullish().transform((v) => v ?? ''),
});
export type ParsedMeal = z.infer<typeof ParsedMealSchema>;
