// Prompt #86 — Nutrient Profile: nutritional adequacy
// Higher = better nutritional status. 100 = optimal nutrient coverage.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

export function calculateNutrientProfile(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('nutrient_profile', data.activeLayers);

  // L1 Phase 7: self-reported diet quality
  const dietScore = Math.min(100, data.caq.dietScore * 10);

  // L1 Phase 6: supplement coverage vs AI-identified gaps
  const suppCoverage = data.caq.supplementCoverageScore;

  // L2: nutrient-deficiency-correlated symptoms
  const symptomNutrient = data.symptoms.available
    ? Math.max(0, 100 - (data.symptoms.hairNailScore + data.symptoms.skinScore) * 5)
    : null;

  // L5: nutrition tracking score
  const nutritionTracking = data.nutrition.available
    ? data.nutrition.nutritionScore
    : null;

  // L4: weight trend stability as nutrient absorption proxy
  const bodyProxy = data.bodyTracker.available
    ? (data.bodyTracker.weightTrendStable ? 80 : 50)
    : null;

  // L7: specific nutrient levels from lab work
  const labNutrient = data.labs.available
    ? calculateLabNutrientScore(data)
    : null;

  // L8: nutrigenomic variants
  const geneticNutrient = data.genetics.available
    ? Math.max(0, 100 - data.genetics.nutrigenomicVariants.length * 8)
    : null;

  const rawScore = weightedAverage([
    { score: dietScore, weight: w.caq_phase7_diet ?? 0 },
    { score: suppCoverage, weight: w.caq_phase6_supps ?? 0 },
    { score: symptomNutrient, weight: w.symptom_profile ?? 0 },
    { score: nutritionTracking, weight: w.nutrition ?? 0 },
    { score: bodyProxy, weight: w.body_tracker ?? 0 },
    { score: labNutrient, weight: w.lab_results ?? 0 },
    { score: geneticNutrient, weight: w.genetic_data ?? 0 },
  ]);

  const insights = [];
  if (data.caq.supplementCount === 0) {
    insights.push({ id: 'np_no_supps', text: 'No supplements reported; nutrient gaps likely exist', severity: 'warning' as const });
  }
  if (data.nutrition.available && data.nutrition.consecutiveDaysLogged >= 7) {
    insights.push({ id: 'np_tracking', text: `${data.nutrition.consecutiveDaysLogged} consecutive days of meal logging; great consistency`, severity: 'positive' as const });
  }
  if (!data.nutrition.available) {
    insights.push({ id: 'np_log', text: 'Start logging meals for a more accurate Nutrient Profile', severity: 'neutral' as const });
  }

  return {
    score: rawScore,
    rawScore,
    dataCompleteness: Object.keys(w).length / 7,
    trend: 'stable',
    trendDelta: 0,
    insights,
    recommendations: rawScore < 60
      ? [{ action: 'add', description: 'Consider a foundational supplement stack (Vitamin D, Omega 3, Magnesium)', priority: 'high' as const }]
      : [],
  };
}

function calculateLabNutrientScore(data: UnifiedHealthData): number {
  const markers = data.labs.nutrientLevels;
  const keys = Object.keys(markers);
  if (keys.length === 0) return 70;
  const inRange = keys.filter(k => markers[k] >= 50 && markers[k] <= 100).length;
  return Math.round((inRange / keys.length) * 100);
}
