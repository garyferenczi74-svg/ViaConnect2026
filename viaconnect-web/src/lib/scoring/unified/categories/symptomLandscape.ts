// Prompt #86 — Symptom Landscape
// Overall symptom burden across all body systems.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

export function calculateSymptomLandscape(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('symptom_landscape', data.activeLayers);

  // L1 Phases 3-5: physical + neuro + emotional avgs (inverted)
  const compositeSymptom = (data.caq.physicalSymptomAvg + data.caq.neuroSymptomAvg + data.caq.emotionalSymptomAvg) / 3;
  const caqScore = Math.max(0, 100 - compositeSymptom * 10);

  // L2: all retake scores
  const symptomRetake = data.symptoms.available
    ? Math.max(0, 100 - (data.symptoms.allScores.reduce((a, b) => a + b, 0) / Math.max(1, data.symptoms.allScores.length)) * 10)
    : null;

  // L3: recovery gauge as symptom proxy
  const dailyRecovery = data.daily.available ? data.daily.recoveryGauge : null;

  // L4: weight + body composition changes
  const bodySymptom = data.bodyTracker.available
    ? (data.bodyTracker.weightTrendStable ? 75 : 55)
    : null;

  // L5: poor nutrition exacerbates symptoms
  const nutritionImpact = data.nutrition.available ? data.nutrition.nutritionScore : null;

  // L7: abnormal biomarkers correlating with symptoms
  const labSymptom = data.labs.available
    ? Math.max(0, 100 - data.labs.outOfRangeCount * 6)
    : null;

  // L8: symptom-associated genetic variants
  const geneticSymptom = data.genetics.available
    ? Math.max(0, 90 - data.genetics.riskVariantCount * 4)
    : null;

  const rawScore = weightedAverage([
    { score: caqScore, weight: w.caq_phases345 ?? 0 },
    { score: symptomRetake, weight: w.symptom_profile ?? 0 },
    { score: dailyRecovery, weight: w.daily_recovery ?? 0 },
    { score: bodySymptom, weight: w.body_tracker ?? 0 },
    { score: nutritionImpact, weight: w.nutrition ?? 0 },
    { score: labSymptom, weight: w.lab_results ?? 0 },
    { score: geneticSymptom, weight: w.genetic_data ?? 0 },
  ]);

  const insights = [];
  if (data.caq.physicalSymptomAvg > 5) {
    insights.push({ id: 'sl_phys', text: `Physical symptom load: ${data.caq.physicalSymptomAvg.toFixed(1)}/10; significant burden detected`, severity: 'warning' as const });
  }
  if (data.caq.neuroSymptomAvg > 5) {
    insights.push({ id: 'sl_neuro', text: `Cognitive symptom load: ${data.caq.neuroSymptomAvg.toFixed(1)}/10; brain fog and focus issues present`, severity: 'warning' as const });
  }
  if (data.caq.emotionalSymptomAvg > 5) {
    insights.push({ id: 'sl_emot', text: `Emotional symptom load: ${data.caq.emotionalSymptomAvg.toFixed(1)}/10; mood support recommended`, severity: 'warning' as const });
  }
  if (compositeSymptom <= 3) {
    insights.push({ id: 'sl_low', text: 'Overall symptom burden is low; wellness markers are strong', severity: 'positive' as const });
  }

  return {
    score: rawScore, rawScore,
    dataCompleteness: Object.keys(w).length / 7,
    trend: 'stable', trendDelta: 0, insights,
    recommendations: data.caq.physicalSymptomAvg > 5
      ? [{ action: 'monitor', description: 'Track physical symptoms daily to identify triggers', priority: 'high' as const }]
      : [],
  };
}
