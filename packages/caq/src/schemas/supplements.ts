import { z } from 'zod';

export const supplementSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  dosage: z.string(),
  frequency: z.string(),
  reason: z.string().optional(),
  duration_months: z.number().optional(),
  perceived_benefit: z.enum(['significant', 'moderate', 'minimal', 'none', 'unsure']).optional(),
});

export const supplementHistorySchema = z.object({
  current_supplements: z.array(supplementSchema).default([]),
  past_supplements: z.array(supplementSchema).default([]),
  interested_in: z.array(z.string()).default([]),
});

export type Supplement = z.infer<typeof supplementSchema>;
export type SupplementHistory = z.infer<typeof supplementHistorySchema>;
