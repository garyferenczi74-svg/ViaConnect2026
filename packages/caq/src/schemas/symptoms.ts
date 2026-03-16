import { z } from 'zod';

export const symptomSchema = z.object({
  name: z.string(),
  severity: z.number().int().min(1).max(10),
  duration: z.string(),
  frequency: z.enum(['constant', 'daily', 'weekly', 'monthly', 'intermittent']),
  pattern: z.enum(['improving', 'stable', 'worsening', 'fluctuating']).optional(),
  triggers: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const currentSymptomsSchema = z.object({
  symptoms: z.array(symptomSchema).default([]),
  primary_complaint: z.string().optional(),
  symptom_onset: z.string().optional(),
  overall_wellbeing: z.number().int().min(1).max(10).optional(),
});

export type Symptom = z.infer<typeof symptomSchema>;
export type CurrentSymptoms = z.infer<typeof currentSymptomsSchema>;
