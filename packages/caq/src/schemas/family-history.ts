import { z } from 'zod';

export const familyConditionSchema = z.object({
  condition: z.string(),
  relationship: z.enum(['mother', 'father', 'sibling', 'maternal_grandparent', 'paternal_grandparent', 'aunt_uncle', 'other']),
  age_of_onset: z.number().int().optional(),
  notes: z.string().optional(),
});

export const familyHistorySchema = z.object({
  conditions: z.array(familyConditionSchema).default([]),
  cancer_history: z.boolean().default(false),
  cardiovascular_history: z.boolean().default(false),
  diabetes_history: z.boolean().default(false),
  autoimmune_history: z.boolean().default(false),
  mental_health_history: z.boolean().default(false),
  known_genetic_conditions: z.array(z.string()).default([]),
});

export type FamilyCondition = z.infer<typeof familyConditionSchema>;
export type FamilyHistory = z.infer<typeof familyHistorySchema>;
