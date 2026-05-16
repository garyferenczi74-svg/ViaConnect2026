// Prompt #168d: Zod schema for POST /api/nutrition/meals payload.
//
// The 4 nutrition channels share this contract:
//   quick_log:    inline Quick Logs accordion
//   photo_ai:     /api/nutrition/analyze-photo
//   tracker_api:  partner webhook (deferred; route accepts the enum)
//   full_manual:  LEGACY analyze-text path (does NOT call this route;
//                 enum kept for parity)
//
// user_id is intentionally NOT in the payload; the route derives it
// from the auth session per security review.

import { z } from 'zod';

export const MealsInsertPayloadSchema = z.object({
  logged_at: z.string().datetime(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  source: z.enum(['quick_log', 'full_manual', 'photo_ai', 'tracker_api', 'wearable_cgm']),
  source_confidence: z.number().min(0).max(1),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_total_g: z.number().min(0),
  fat_healthy_g: z.number().min(0),
  fiber_g: z.number().min(0),
  sugar_g: z.number().min(0),
  sodium_mg: z.number().min(0),
  calories_kcal: z.number().min(0),
  calories_auto_calc: z.boolean(),
  whole_food_flag: z.boolean().nullable(),
  meal_name: z.string().nullable(),
  // raw_input is jsonb on the meals table; Quick Logs sends
  // { sliders: {...} }, analyze-text sends source text, future tracker_api
  // will send the partner's raw payload. z.unknown() accepts all three.
  raw_input: z.unknown().nullable(),
  snack_index: z.number().int().min(0).nullable(),
});

export type MealsInsertPayload = z.infer<typeof MealsInsertPayloadSchema>;
