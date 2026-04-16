// Prompt #86 — Medication Intelligence
// Regimen quality, interaction safety, optimization level.
// SPECIAL RULE: If ANY severe interaction is unresolved, hard-cap at 60.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

export function calculateMedicationIntelligence(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('medication_intel', data.activeLayers);

  // L1 Phase 6: medication inventory completeness + polypharmacy risk
  const medsActive = data.caq.medications.filter(m => m !== 'None' && m !== '').length;
  const polypharmacyPenalty = medsActive >= 5 ? 20 : 0;
  const medScore = Math.max(0, (medsActive === 0 ? 100 : 80) - polypharmacyPenalty);

  // L1 Phase 6: supplement match vs AI-identified needs
  const suppMatch = data.caq.supplementCoverageScore;

  // L6: interaction engine safety
  let interactionScore: number | null = null;
  if (data.protocol.available) {
    if (data.protocol.interactionCount === 0) {
      interactionScore = 100;
    } else {
      interactionScore = Math.max(0, 100 - data.protocol.interactionCount * 12);
      if (data.protocol.severeInteractionCount > 0) {
        interactionScore = Math.min(40, interactionScore);
      }
    }
  }

  // L6: protocol adherence
  const adherence = data.protocol.available ? data.protocol.completionRate : null;

  // L3: supplement gauge
  const dailySupp = data.daily.available ? data.daily.supplementsGauge : null;

  // L8: pharmacogenomic variants
  const geneticPharm = data.genetics.available
    ? Math.max(0, 90 - data.genetics.pharmacogenomicVariants.length * 10)
    : null;

  let rawScore = weightedAverage([
    { score: medScore, weight: w.caq_phase6_meds ?? 0 },
    { score: suppMatch, weight: w.caq_phase6_supps ?? 0 },
    { score: interactionScore, weight: w.interactions ?? 0 },
    { score: adherence, weight: w.adherence ?? 0 },
    { score: dailySupp, weight: w.daily_supplement ?? 0 },
    { score: geneticPharm, weight: w.genetic_data ?? 0 },
  ]);

  // HARD CAP: unresolved severe interactions
  if (data.protocol.unresolvedInteractionCount > 0 &&
      data.protocol.maxInteractionSeverity === 'severe') {
    rawScore = Math.min(60, rawScore);
  }

  const insights = [];
  if (medsActive === 0) {
    insights.push({ id: 'mi_no_meds', text: 'No medications reported; supplement safety is primary focus', severity: 'positive' as const });
  }
  if (data.protocol.available && data.protocol.interactionCount > 0) {
    insights.push({
      id: 'mi_interactions',
      text: `${data.protocol.interactionCount} drug supplement interaction(s) detected`,
      severity: data.protocol.severeInteractionCount > 0 ? 'critical' as const : 'warning' as const,
    });
  }
  if (data.protocol.available && data.protocol.interactionCount === 0) {
    insights.push({ id: 'mi_safe', text: 'No medication interactions detected; your current regimen appears safe', severity: 'positive' as const });
  }

  return {
    score: rawScore, rawScore,
    dataCompleteness: Object.keys(w).length / 6,
    trend: 'stable', trendDelta: 0, insights, recommendations: [],
  };
}
