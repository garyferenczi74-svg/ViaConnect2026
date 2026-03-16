import { z } from 'zod';

export const conditionSchema = z.object({
  icd10_code: z.string().optional(),
  name: z.string(),
  diagnosed_year: z.number().int().optional(),
  status: z.enum(['active', 'resolved', 'managed']),
  notes: z.string().optional(),
});

export const surgerySchema = z.object({
  name: z.string(),
  year: z.number().int().optional(),
  complications: z.string().optional(),
});

export const healthHistorySchema = z.object({
  conditions: z.array(conditionSchema).default([]),
  surgeries: z.array(surgerySchema).default([]),
  allergies: z.array(z.string()).default([]),
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
  hospitalizations: z.number().int().min(0).default(0),
});

export type HealthHistory = z.infer<typeof healthHistorySchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Surgery = z.infer<typeof surgerySchema>;
