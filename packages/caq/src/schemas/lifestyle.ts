import { z } from 'zod';

export const phq9Schema = z.object({
  interest_pleasure: z.number().int().min(0).max(3),
  feeling_down: z.number().int().min(0).max(3),
  sleep_issues: z.number().int().min(0).max(3),
  tiredness: z.number().int().min(0).max(3),
  appetite_changes: z.number().int().min(0).max(3),
  self_criticism: z.number().int().min(0).max(3),
  concentration: z.number().int().min(0).max(3),
  psychomotor: z.number().int().min(0).max(3),
  self_harm_thoughts: z.number().int().min(0).max(3),
});

export const gad7Schema = z.object({
  feeling_anxious: z.number().int().min(0).max(3),
  uncontrollable_worry: z.number().int().min(0).max(3),
  excessive_worry: z.number().int().min(0).max(3),
  trouble_relaxing: z.number().int().min(0).max(3),
  restlessness: z.number().int().min(0).max(3),
  irritability: z.number().int().min(0).max(3),
  feeling_afraid: z.number().int().min(0).max(3),
});

export const lifestyleSchema = z.object({
  sleep_hours: z.number().min(0).max(24).optional(),
  sleep_quality: z.number().int().min(1).max(10).optional(),
  exercise_minutes_per_week: z.number().min(0).default(0),
  exercise_types: z.array(z.string()).default([]),
  stress_level: z.number().int().min(1).max(10).optional(),
  smoking_status: z.enum(['never', 'former', 'current', 'vaping']).default('never'),
  occupation: z.string().optional(),
  screen_time_hours: z.number().min(0).max(24).optional(),
  phq9: phq9Schema.optional(),
  gad7: gad7Schema.optional(),
});

export type PHQ9 = z.infer<typeof phq9Schema>;
export type GAD7 = z.infer<typeof gad7Schema>;
export type Lifestyle = z.infer<typeof lifestyleSchema>;

export function calculatePHQ9Score(phq9: PHQ9): { score: number; severity: string } {
  const score = Object.values(phq9).reduce((sum, val) => sum + val, 0);
  let severity: string;
  if (score <= 4) severity = 'minimal';
  else if (score <= 9) severity = 'mild';
  else if (score <= 14) severity = 'moderate';
  else if (score <= 19) severity = 'moderately_severe';
  else severity = 'severe';
  return { score, severity };
}

export function calculateGAD7Score(gad7: GAD7): { score: number; severity: string } {
  const score = Object.values(gad7).reduce((sum, val) => sum + val, 0);
  let severity: string;
  if (score <= 4) severity = 'minimal';
  else if (score <= 9) severity = 'mild';
  else if (score <= 14) severity = 'moderate';
  else severity = 'severe';
  return { score, severity };
}
