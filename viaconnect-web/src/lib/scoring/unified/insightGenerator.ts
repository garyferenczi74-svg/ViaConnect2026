// Prompt #86 — Dynamic health intelligence summary generator

import type { CategoryId, UnifiedScoringResult } from './types';

const CATEGORY_LABELS: Record<CategoryId, string> = {
  risk_radar: 'Risk Radar',
  nutrient_profile: 'Nutrient Profile',
  protocol_effectiveness: 'Protocol Effectiveness',
  metabolic_health: 'Metabolic Health',
  immune_inflammation: 'Immune & Inflammation',
  bio_optimization_trends: 'Bio Optimization Trends',
  stress_mood: 'Stress & Mood',
  symptom_landscape: 'Symptom Landscape',
  medication_intel: 'Medication Intelligence',
  sleep_recovery: 'Sleep & Recovery',
};

export function generateHealthSummary(result: UnifiedScoringResult): string {
  const bioOpt = result.scores.bio_optimization_trends;
  const tierLabel = result.confidence.label.toLowerCase();
  const top = CATEGORY_LABELS[result.topCategory];
  const low = CATEGORY_LABELS[result.lowCategory];

  return `Based on your ${tierLabel}, your Bio Optimization score is ${bioOpt}/100. Your strongest areas are ${top}. Your primary optimization opportunities are in ${low}.`;
}

export function formatCategoryName(id: CategoryId): string {
  return CATEGORY_LABELS[id] ?? id;
}
