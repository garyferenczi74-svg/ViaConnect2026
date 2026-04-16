// Prompt #86 — Routes data events to affected analytics categories

import type { CategoryId } from './types';

export const CATEGORY_TRIGGER_MAP: Record<string, CategoryId[]> = {
  'caq.completed':             ['risk_radar', 'nutrient_profile', 'protocol_effectiveness', 'metabolic_health', 'immune_inflammation', 'bio_optimization_trends', 'stress_mood', 'symptom_landscape', 'medication_intel', 'sleep_recovery'],
  'caq.retake':                ['risk_radar', 'nutrient_profile', 'protocol_effectiveness', 'metabolic_health', 'immune_inflammation', 'bio_optimization_trends', 'stress_mood', 'symptom_landscape', 'medication_intel', 'sleep_recovery'],
  'symptom_profile.retake':    ['risk_radar', 'immune_inflammation', 'stress_mood', 'symptom_landscape'],
  'daily_score.updated':       ['sleep_recovery', 'stress_mood', 'metabolic_health', 'bio_optimization_trends', 'protocol_effectiveness'],
  'body_tracker.measurement':  ['metabolic_health', 'risk_radar', 'immune_inflammation'],
  'nutrition.meal_logged':     ['nutrient_profile', 'metabolic_health'],
  'protocol.supplement_checkin': ['protocol_effectiveness', 'medication_intel', 'nutrient_profile'],
  'lab_results.uploaded':      ['risk_radar', 'nutrient_profile', 'protocol_effectiveness', 'metabolic_health', 'immune_inflammation', 'bio_optimization_trends', 'stress_mood', 'symptom_landscape', 'medication_intel', 'sleep_recovery'],
  'genex360.results_processed': ['risk_radar', 'nutrient_profile', 'protocol_effectiveness', 'metabolic_health', 'immune_inflammation', 'bio_optimization_trends', 'stress_mood', 'symptom_landscape', 'medication_intel', 'sleep_recovery'],
  'wearable.sync_complete':    ['sleep_recovery', 'stress_mood', 'metabolic_health'],
  'cron.6am':                  ['risk_radar', 'nutrient_profile', 'protocol_effectiveness', 'metabolic_health', 'immune_inflammation', 'bio_optimization_trends', 'stress_mood', 'symptom_landscape', 'medication_intel', 'sleep_recovery'],
  'manual.refresh':            ['risk_radar', 'nutrient_profile', 'protocol_effectiveness', 'metabolic_health', 'immune_inflammation', 'bio_optimization_trends', 'stress_mood', 'symptom_landscape', 'medication_intel', 'sleep_recovery'],
};

export function getAffectedCategories(eventType: string): CategoryId[] {
  return CATEGORY_TRIGGER_MAP[eventType] ?? [];
}

export function isFullRecalc(eventType: string): boolean {
  return ['caq.completed', 'caq.retake', 'lab_results.uploaded', 'genex360.results_processed', 'cron.6am', 'manual.refresh'].includes(eventType);
}
