import { z } from 'zod';

export const demographicsSchema = z.object({
  age: z.number().int().min(0).max(150),
  sex: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  ethnicity: z.string().optional(),
  height_cm: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  bmi: z.number().positive().optional(),
  country: z.string().optional(),
  zip_code: z.string().optional(),
});

export type Demographics = z.infer<typeof demographicsSchema>;
