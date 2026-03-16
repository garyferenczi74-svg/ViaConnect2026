import { z } from 'zod';

export const healthGoalSchema = z.object({
  goal: z.string(),
  category: z.enum([
    'energy', 'sleep', 'weight', 'digestion', 'mental_health', 'immunity',
    'hormones', 'pain', 'skin', 'cardiovascular', 'cognitive', 'longevity', 'other'
  ]),
  priority: z.number().int().min(1).max(5),
  timeline: z.enum(['1_month', '3_months', '6_months', '1_year', 'ongoing']).default('3_months'),
  budget_preference: z.enum(['minimal', 'moderate', 'flexible', 'no_limit']).default('moderate'),
});

export const healthGoalsSchema = z.object({
  goals: z.array(healthGoalSchema).min(1).max(10),
  primary_motivation: z.string().optional(),
  openness_to_natural: z.number().int().min(1).max(10).default(7),
});

export type HealthGoal = z.infer<typeof healthGoalSchema>;
export type HealthGoals = z.infer<typeof healthGoalsSchema>;
