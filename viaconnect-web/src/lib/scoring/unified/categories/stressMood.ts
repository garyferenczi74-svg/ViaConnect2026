// Prompt #86 — Stress & Mood
// Psychological wellbeing, emotional resilience, mood stability.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

export function calculateStressMood(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('stress_mood', data.activeLayers);

  // L1 Phase 5: emotional symptom aggregate (inverted)
  const phase5Score = Math.max(0, 100 - data.caq.emotionalSymptomAvg * 10);

  // L2: stress + hormonal scores
  const symptomStress = data.symptoms.available
    ? Math.max(0, 100 - (data.symptoms.stressScore + data.symptoms.hormonalScore) * 5)
    : null;

  // L3: stress gauge + recovery gauge
  const dailyStress = data.daily.available
    ? Math.round((data.daily.stressGauge + data.daily.recoveryGauge) / 2)
    : null;

  // L4: HRV trend + resting HR trend
  let bodyStress: number | null = null;
  if (data.bodyTracker.available && (data.bodyTracker.hrvTrend !== null || data.bodyTracker.restingHR !== null)) {
    bodyStress = 70;
    if (data.bodyTracker.hrvTrend !== null) bodyStress += data.bodyTracker.hrvTrend > 0 ? 15 : -10;
    if (data.bodyTracker.restingHR !== null) bodyStress += data.bodyTracker.restingHR < 65 ? 10 : data.bodyTracker.restingHR > 80 ? -10 : 0;
    bodyStress = Math.max(0, Math.min(100, bodyStress));
  }

  // L1 Phase 7: self-reported stress
  const phase7Stress = Math.max(0, 100 - data.caq.stressLevel * 10);

  // L7: cortisol, hormone panel
  const labStress = data.labs.available ? 70 : null; // baseline; would refine with actual markers

  const rawScore = weightedAverage([
    { score: phase5Score, weight: w.caq_phase5 ?? 0 },
    { score: symptomStress, weight: w.symptom_profile ?? 0 },
    { score: dailyStress, weight: w.daily_stress ?? 0 },
    { score: bodyStress, weight: w.body_tracker ?? 0 },
    { score: phase7Stress, weight: w.caq_phase7 ?? 0 },
    { score: labStress, weight: w.lab_results ?? 0 },
  ]);

  const insights = [];
  if (data.caq.emotionalSymptomAvg > 5) {
    insights.push({ id: 'sm_elevated', text: 'Elevated emotional symptom load detected; adaptogenic support recommended', severity: 'warning' as const });
  }
  if (rawScore >= 75) {
    insights.push({ id: 'sm_good', text: 'Stress and mood indicators are within a healthy range', severity: 'positive' as const });
  }

  return {
    score: rawScore, rawScore,
    dataCompleteness: Object.keys(w).length / 6,
    trend: 'stable', trendDelta: 0, insights,
    recommendations: data.caq.emotionalSymptomAvg > 5
      ? [{ action: 'add', description: 'Consider Micellar Ashwagandha (KSM 66) for stress resilience', priority: 'high' as const }]
      : [],
  };
}
