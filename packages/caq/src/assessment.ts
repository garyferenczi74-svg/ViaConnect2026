import { z } from 'zod';
import { demographicsSchema } from './schemas/demographics';
import { healthHistorySchema } from './schemas/health-history';
import { currentSymptomsSchema } from './schemas/symptoms';
import { medicationsSchema } from './schemas/medications';
import { supplementHistorySchema } from './schemas/supplements';
import { dietNutritionSchema } from './schemas/diet-nutrition';
import { lifestyleSchema } from './schemas/lifestyle';
import { healthGoalsSchema } from './schemas/health-goals';
import { familyHistorySchema } from './schemas/family-history';
import { geneticStatusSchema } from './schemas/genetic-status';

export const CAQ_MODULES = [
  'demographics',
  'health_history',
  'current_symptoms',
  'medications',
  'supplements',
  'diet_nutrition',
  'lifestyle',
  'health_goals',
  'family_history',
  'genetic_status',
] as const;

export type CAQModule = typeof CAQ_MODULES[number];

export const CAQ_MODULE_LABELS: Record<CAQModule, string> = {
  demographics: 'Demographics',
  health_history: 'Health History',
  current_symptoms: 'Current Symptoms',
  medications: 'Medications',
  supplements: 'Supplement History',
  diet_nutrition: 'Diet & Nutrition',
  lifestyle: 'Lifestyle',
  health_goals: 'Health Goals',
  family_history: 'Family History',
  genetic_status: 'Genetic Status',
};

export const caqModuleSchemas = {
  demographics: demographicsSchema,
  health_history: healthHistorySchema,
  current_symptoms: currentSymptomsSchema,
  medications: medicationsSchema,
  supplements: supplementHistorySchema,
  diet_nutrition: dietNutritionSchema,
  lifestyle: lifestyleSchema,
  health_goals: healthGoalsSchema,
  family_history: familyHistorySchema,
  genetic_status: geneticStatusSchema,
} as const;

export const fullCAQSchema = z.object({
  demographics: demographicsSchema,
  health_history: healthHistorySchema,
  current_symptoms: currentSymptomsSchema,
  medications: medicationsSchema,
  supplements: supplementHistorySchema,
  diet_nutrition: dietNutritionSchema,
  lifestyle: lifestyleSchema,
  health_goals: healthGoalsSchema,
  family_history: familyHistorySchema,
  genetic_status: geneticStatusSchema,
});

export type FullCAQ = z.infer<typeof fullCAQSchema>;

export type CAQDraft = {
  id: string;
  patient_id: string;
  completed_modules: CAQModule[];
  current_module: CAQModule;
  data: Partial<FullCAQ>;
  version: number;
  last_saved_at: string;
  created_at: string;
  updated_at: string;
};

export type CAQCompletion = {
  id: string;
  patient_id: string;
  data: FullCAQ;
  version: number;
  completed_at: string;
  next_reassessment_at: string; // 3 months after completion
  phq9_score?: number;
  phq9_severity?: string;
  gad7_score?: number;
  gad7_severity?: string;
};

export function getModuleProgress(completedModules: CAQModule[]): number {
  return Math.round((completedModules.length / CAQ_MODULES.length) * 100);
}

export function getNextModule(completedModules: CAQModule[]): CAQModule | null {
  return CAQ_MODULES.find((m) => !completedModules.includes(m)) ?? null;
}

export function isCAQComplete(completedModules: CAQModule[]): boolean {
  return CAQ_MODULES.every((m) => completedModules.includes(m));
}

export function getReassessmentDate(completedAt: Date): Date {
  const date = new Date(completedAt);
  date.setMonth(date.getMonth() + 3);
  return date;
}
