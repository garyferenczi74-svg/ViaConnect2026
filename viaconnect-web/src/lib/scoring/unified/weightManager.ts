// Prompt #86 — Dynamic weight redistribution
// When a data layer is unavailable, its weight redistributes proportionally
// to remaining active layers so scores are always calculable.

import type { DataLayer, CategoryId, WeightMap } from './types';

// Base weight definitions per category per data layer.
// Keys match the layer identifiers used in each calculator.
// Weights sum to 1.0 per category.

export const CATEGORY_WEIGHTS: Record<CategoryId, Record<string, { weight: number; layer: DataLayer }>> = {
  risk_radar: {
    caq_phase2:       { weight: 0.35, layer: 'L1_CAQ' },
    caq_phase7:       { weight: 0.10, layer: 'L1_CAQ' },
    symptom_profile:  { weight: 0.15, layer: 'L2_SYMPTOMS' },
    body_tracker:     { weight: 0.10, layer: 'L4_BODY' },
    lab_results:      { weight: 0.20, layer: 'L7_LABS' },
    genetic_data:     { weight: 0.10, layer: 'L8_GENETICS' },
  },
  nutrient_profile: {
    caq_phase7_diet:  { weight: 0.20, layer: 'L1_CAQ' },
    caq_phase6_supps: { weight: 0.20, layer: 'L1_CAQ' },
    symptom_profile:  { weight: 0.10, layer: 'L2_SYMPTOMS' },
    nutrition:        { weight: 0.25, layer: 'L5_NUTRITION' },
    body_tracker:     { weight: 0.05, layer: 'L4_BODY' },
    lab_results:      { weight: 0.15, layer: 'L7_LABS' },
    genetic_data:     { weight: 0.05, layer: 'L8_GENETICS' },
  },
  protocol_effectiveness: {
    caq_phase6:       { weight: 0.20, layer: 'L1_CAQ' },
    adherence:        { weight: 0.30, layer: 'L6_PROTOCOL' },
    interactions:     { weight: 0.20, layer: 'L6_PROTOCOL' },
    daily_supplement: { weight: 0.10, layer: 'L3_DAILY' },
    body_tracker:     { weight: 0.10, layer: 'L4_BODY' },
    lab_results:      { weight: 0.10, layer: 'L7_LABS' },
  },
  metabolic_health: {
    caq_phase1:       { weight: 0.15, layer: 'L1_CAQ' },
    caq_phase7:       { weight: 0.10, layer: 'L1_CAQ' },
    body_tracker:     { weight: 0.30, layer: 'L4_BODY' },
    daily_activity:   { weight: 0.15, layer: 'L3_DAILY' },
    symptom_profile:  { weight: 0.10, layer: 'L2_SYMPTOMS' },
    lab_results:      { weight: 0.15, layer: 'L7_LABS' },
    genetic_data:     { weight: 0.05, layer: 'L8_GENETICS' },
  },
  immune_inflammation: {
    caq_phase2:       { weight: 0.25, layer: 'L1_CAQ' },
    caq_phase3:       { weight: 0.15, layer: 'L1_CAQ' },
    symptom_profile:  { weight: 0.20, layer: 'L2_SYMPTOMS' },
    daily_recovery:   { weight: 0.15, layer: 'L3_DAILY' },
    body_tracker:     { weight: 0.05, layer: 'L4_BODY' },
    lab_results:      { weight: 0.15, layer: 'L7_LABS' },
    genetic_data:     { weight: 0.05, layer: 'L8_GENETICS' },
  },
  bio_optimization_trends: {
    // Delegates to Prompt #17 formula; weights here are for reference only.
    caq_all:          { weight: 0.80, layer: 'L1_CAQ' },
    daily_composite:  { weight: 0.20, layer: 'L3_DAILY' },
  },
  stress_mood: {
    caq_phase5:       { weight: 0.25, layer: 'L1_CAQ' },
    symptom_profile:  { weight: 0.25, layer: 'L2_SYMPTOMS' },
    daily_stress:     { weight: 0.25, layer: 'L3_DAILY' },
    body_tracker:     { weight: 0.10, layer: 'L4_BODY' },
    caq_phase7:       { weight: 0.10, layer: 'L1_CAQ' },
    lab_results:      { weight: 0.05, layer: 'L7_LABS' },
  },
  symptom_landscape: {
    caq_phases345:    { weight: 0.35, layer: 'L1_CAQ' },
    symptom_profile:  { weight: 0.30, layer: 'L2_SYMPTOMS' },
    daily_recovery:   { weight: 0.10, layer: 'L3_DAILY' },
    body_tracker:     { weight: 0.05, layer: 'L4_BODY' },
    nutrition:        { weight: 0.05, layer: 'L5_NUTRITION' },
    lab_results:      { weight: 0.10, layer: 'L7_LABS' },
    genetic_data:     { weight: 0.05, layer: 'L8_GENETICS' },
  },
  medication_intel: {
    caq_phase6_meds:  { weight: 0.25, layer: 'L1_CAQ' },
    caq_phase6_supps: { weight: 0.20, layer: 'L1_CAQ' },
    interactions:     { weight: 0.25, layer: 'L6_PROTOCOL' },
    adherence:        { weight: 0.15, layer: 'L6_PROTOCOL' },
    daily_supplement: { weight: 0.10, layer: 'L3_DAILY' },
    genetic_data:     { weight: 0.05, layer: 'L8_GENETICS' },
  },
  sleep_recovery: {
    caq_phase7:       { weight: 0.20, layer: 'L1_CAQ' },
    daily_sleep:      { weight: 0.35, layer: 'L3_DAILY' },
    body_tracker:     { weight: 0.15, layer: 'L4_BODY' },
    symptom_profile:  { weight: 0.10, layer: 'L2_SYMPTOMS' },
    caq_phase4:       { weight: 0.10, layer: 'L1_CAQ' },
    lab_results:      { weight: 0.05, layer: 'L7_LABS' },
    genetic_data:     { weight: 0.05, layer: 'L8_GENETICS' },
  },
};

/**
 * Returns effective weights for a category, redistributing weight from
 * inactive layers proportionally to active layers.
 */
export function getEffectiveWeights(
  categoryId: CategoryId,
  activeLayers: Set<DataLayer>,
): WeightMap {
  const baseDef = CATEGORY_WEIGHTS[categoryId];
  if (!baseDef) return {};

  const effective: WeightMap = {};
  let totalInactive = 0;
  let totalActive = 0;

  // First pass: classify active vs inactive
  for (const [key, def] of Object.entries(baseDef)) {
    if (activeLayers.has(def.layer)) {
      effective[key] = def.weight;
      totalActive += def.weight;
    } else {
      totalInactive += def.weight;
    }
  }

  // Second pass: redistribute inactive weight proportionally
  if (totalInactive > 0 && totalActive > 0) {
    const factor = totalInactive / totalActive;
    for (const key of Object.keys(effective)) {
      effective[key] *= 1 + factor;
    }
  }

  return effective;
}

/**
 * Compute weighted average from scored inputs; ignores null entries.
 */
export function weightedAverage(
  inputs: Array<{ score: number | null; weight: number }>,
): number {
  let totalWeight = 0;
  let totalScore = 0;
  for (const { score, weight } of inputs) {
    if (score !== null && score !== undefined) {
      totalScore += score * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}
