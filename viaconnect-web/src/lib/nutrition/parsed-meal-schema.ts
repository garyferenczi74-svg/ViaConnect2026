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

// Prompt 186 incident fix (2026-06-11): the system prompt marks preparation
// and notes "optional"; Gemini omits the keys but Claude (the 180f fallback
// provider) emits explicit nulls, which z.string().optional() rejects, so
// every successful Claude fallback parse was being discarded as a ZodError
// and the original Gemini failure rethrown to the user. Callers run the raw
// model JSON through this normalizer before ParsedMealSchema.parse; a
// schema-level transform was reverted because it makes the inferred keys
// required and ripples through every ParsedItem literal.
export function normalizeParsedMealNulls(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  const meal = raw as Record<string, unknown>;
  if (meal.notes === null) delete meal.notes;
  if (Array.isArray(meal.items)) {
    for (const item of meal.items) {
      if (item !== null && typeof item === 'object' && (item as Record<string, unknown>).preparation === null) {
        delete (item as Record<string, unknown>).preparation;
      }
    }
  }
  return raw;
}
