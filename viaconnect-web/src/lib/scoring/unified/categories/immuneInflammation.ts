// Prompt #86 — Immune & Inflammation
// Immune system resilience, inflammatory load, recovery capacity.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

export function calculateImmuneInflammation(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('immune_inflammation', data.activeLayers);

  // L1 Phase 2: autoimmune/inflammatory concerns + allergy count
  const phase2Score = Math.max(0, 100 - data.caq.healthConcernCount * 4 - data.caq.allergyCount * 6);

  // L1 Phase 3: physical symptoms with inflammatory correlation
  const phase3Score = Math.max(0, 100 - data.caq.physicalSymptomAvg * 10);

  // L2: skin, hormonal, hair/nail (inflammation markers)
  const symptomInflam = data.symptoms.available
    ? Math.max(0, 100 - (data.symptoms.skinScore + data.symptoms.hormonalScore + data.symptoms.hairNailScore) * 3)
    : null;

  // L3: recovery + stress (inverted: low stress = high immune)
  const dailyImmune = data.daily.available
    ? Math.round((data.daily.recoveryGauge + data.daily.stressGauge) / 2)
    : null;

  // L4: body fat % (elevated = higher inflammatory load)
  const bodyInflam = data.bodyTracker.available
    ? (data.bodyTracker.bodyFatPercent !== null
      ? Math.max(0, 100 - Math.max(0, data.bodyTracker.bodyFatPercent - 20) * 3)
      : (data.bodyTracker.weightTrendStable ? 75 : 55))
    : null;

  // L7: CRP, ESR, WBC
  const labInflam = data.labs.available
    ? calculateLabInflamScore(data)
    : null;

  // L8: inflammatory gene variants
  const geneticInflam = data.genetics.available
    ? Math.max(0, 90 - data.genetics.inflammatoryVariants.length * 10)
    : null;

  const rawScore = weightedAverage([
    { score: phase2Score, weight: w.caq_phase2 ?? 0 },
    { score: phase3Score, weight: w.caq_phase3 ?? 0 },
    { score: symptomInflam, weight: w.symptom_profile ?? 0 },
    { score: dailyImmune, weight: w.daily_recovery ?? 0 },
    { score: bodyInflam, weight: w.body_tracker ?? 0 },
    { score: labInflam, weight: w.lab_results ?? 0 },
    { score: geneticInflam, weight: w.genetic_data ?? 0 },
  ]);

  const insights = [];
  if (data.caq.allergyCount > 3) {
    insights.push({ id: 'ii_allergy', text: `${data.caq.allergyCount} allergies contribute to immune load`, severity: 'warning' as const });
  }
  if (rawScore >= 75) {
    insights.push({ id: 'ii_good', text: 'Immune and inflammation markers are in a healthy range', severity: 'positive' as const });
  }

  return {
    score: rawScore, rawScore,
    dataCompleteness: Object.keys(w).length / 7,
    trend: 'stable', trendDelta: 0, insights, recommendations: [],
  };
}

function calculateLabInflamScore(data: UnifiedHealthData): number {
  const m = data.labs.inflammatoryMarkers;
  const keys = Object.keys(m);
  if (keys.length === 0) return 70;
  const inRange = keys.filter(k => m[k] >= 50 && m[k] <= 100).length;
  return Math.round((inRange / keys.length) * 100);
}
