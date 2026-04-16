// Prompt #86 — Protocol Effectiveness
// Measures regimen quality, interaction safety, and adherence.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

export function calculateProtocolEffectiveness(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('protocol_effectiveness', data.activeLayers);

  // L1 Phase 6: medication inventory completeness + supplement match
  const phase6Score = Math.min(100, data.caq.supplementCoverageScore);

  // L6: adherence rate
  const adherence = data.protocol.available
    ? data.protocol.completionRate
    : null;

  // L6: interaction engine safety
  let interactionScore: number | null = null;
  if (data.protocol.available) {
    interactionScore = 100;
    if (data.protocol.interactionCount > 0) {
      interactionScore -= data.protocol.interactionCount * 10;
    }
    // Severe interactions hard-cap at 40
    if (data.protocol.severeInteractionCount > 0) {
      interactionScore = Math.min(40, interactionScore);
    }
    interactionScore = Math.max(0, interactionScore);
  }

  // L3: supplement gauge from daily scores
  const dailySupp = data.daily.available
    ? data.daily.supplementsGauge
    : null;

  // L4: body tracker trend improvement
  const bodyImprovement = data.bodyTracker.available && data.bodyTracker.weeksOfData >= 4
    ? (data.bodyTracker.weightTrendStable ? 75 : 50)
    : null;

  // L7: biomarker improvement (requires 2+ lab sets)
  const labImprovement = data.labs.available && data.labs.resultSets >= 2
    ? 70 // placeholder; trend comparison requires history
    : null;

  const rawScore = weightedAverage([
    { score: phase6Score, weight: w.caq_phase6 ?? 0 },
    { score: adherence, weight: w.adherence ?? 0 },
    { score: interactionScore, weight: w.interactions ?? 0 },
    { score: dailySupp, weight: w.daily_supplement ?? 0 },
    { score: bodyImprovement, weight: w.body_tracker ?? 0 },
    { score: labImprovement, weight: w.lab_results ?? 0 },
  ]);

  const insights = [];
  if (data.protocol.available && data.protocol.streakLength >= 14) {
    insights.push({ id: 'pe_streak', text: `${data.protocol.streakLength} day supplement adherence streak`, severity: 'positive' as const });
  }
  if (data.protocol.severeInteractionCount > 0) {
    insights.push({ id: 'pe_severe', text: `${data.protocol.severeInteractionCount} severe interaction(s) require immediate attention`, severity: 'critical' as const });
  }
  if (!data.protocol.available) {
    insights.push({ id: 'pe_start', text: 'Begin daily supplement check ins to track protocol effectiveness', severity: 'neutral' as const });
  }

  return {
    score: rawScore,
    rawScore,
    dataCompleteness: Object.keys(w).length / 6,
    trend: 'stable',
    trendDelta: 0,
    insights,
    recommendations: data.protocol.completionRate < 70
      ? [{ action: 'improve', description: 'Set daily reminders to improve supplement adherence', priority: 'high' as const }]
      : [],
  };
}
