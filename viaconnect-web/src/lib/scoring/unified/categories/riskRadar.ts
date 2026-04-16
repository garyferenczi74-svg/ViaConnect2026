// Prompt #86 — Risk Radar: cumulative health risk exposure
// Higher = lower risk (inverted). 100 = minimal risk profile.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

export function calculateRiskRadar(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('risk_radar', data.activeLayers);

  // L1 Phase 2: invert health concern burden
  const concernBurden = data.caq.healthConcernCount * data.caq.avgConcernSeverity;
  const familyRisk = data.caq.familyHistoryRiskLoad;
  const phase2Score = Math.max(0, 100 - concernBurden * 2 - familyRisk * 0.5);

  // L1 Phase 7: lifestyle risk factors
  const lifestyleRisk = (data.caq.smokingScore + data.caq.alcoholScore + data.caq.sedentaryScore) / 3;
  const phase7Score = Math.max(0, 100 - lifestyleRisk * 10);

  // L2: symptom severity risk
  const symptomRisk = data.symptoms.available
    ? Math.max(0, 100 - data.symptoms.highSeverityCount * 12)
    : null;

  // L4: body tracker risk indicators
  const bodyRisk = data.bodyTracker.available
    ? calculateBodyRisk(data)
    : null;

  // L7: lab anomalies
  const labRisk = data.labs.available
    ? Math.max(0, 100 - data.labs.outOfRangeCount * 8 - data.labs.criticalFlags * 20)
    : null;

  // L8: genetic risk variants
  const geneticRisk = data.genetics.available
    ? Math.max(0, 100 - data.genetics.riskVariantSeverity)
    : null;

  const rawScore = weightedAverage([
    { score: phase2Score, weight: w.caq_phase2 ?? 0 },
    { score: phase7Score, weight: w.caq_phase7 ?? 0 },
    { score: symptomRisk, weight: w.symptom_profile ?? 0 },
    { score: bodyRisk, weight: w.body_tracker ?? 0 },
    { score: labRisk, weight: w.lab_results ?? 0 },
    { score: geneticRisk, weight: w.genetic_data ?? 0 },
  ]);

  const insights = [];
  if (data.caq.familyHistoryCount > 0) {
    insights.push({ id: 'rr_family', text: `${data.caq.familyHistoryCount} family history factor(s) contribute to your risk profile`, severity: 'warning' as const });
  }
  if (!data.labs.available) {
    insights.push({ id: 'rr_labs', text: 'Adding lab results would improve Risk Radar accuracy significantly', severity: 'neutral' as const });
  }
  if (rawScore >= 80) {
    insights.push({ id: 'rr_good', text: 'Your overall risk profile is low; keep maintaining healthy habits', severity: 'positive' as const });
  }

  return {
    score: rawScore,
    rawScore,
    dataCompleteness: Object.keys(w).length / 6,
    trend: 'stable',
    trendDelta: 0,
    insights,
    recommendations: rawScore < 50
      ? [{ action: 'monitor', description: 'Consider uploading lab results for more accurate risk assessment', priority: 'high' as const }]
      : [],
  };
}

function calculateBodyRisk(data: UnifiedHealthData): number {
  let score = 80;
  if (data.bodyTracker.bmiOutOfRange) score -= 20;
  if (data.bodyTracker.restingHRAnomaly) score -= 15;
  if (data.bodyTracker.bodyFatPercent !== null && data.bodyTracker.bodyFatPercent > 30) score -= 10;
  return Math.max(0, score);
}
