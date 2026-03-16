import { z } from 'zod';

export const medicationSchema = z.object({
  name: z.string(),
  rxnorm_code: z.string().optional(),
  dosage: z.string(),
  frequency: z.string(),
  route: z.enum(['oral', 'topical', 'injection', 'inhalation', 'sublingual', 'other']).default('oral'),
  start_date: z.string().optional(),
  prescriber: z.string().optional(),
  reason: z.string().optional(),
});

export const medicationsSchema = z.object({
  current_medications: z.array(medicationSchema).default([]),
  past_medications: z.array(medicationSchema).default([]),
  otc_medications: z.array(medicationSchema).default([]),
  known_drug_allergies: z.array(z.string()).default([]),
});

export type Medication = z.infer<typeof medicationSchema>;
export type Medications = z.infer<typeof medicationsSchema>;
