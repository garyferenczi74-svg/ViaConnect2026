// Prompt #86 — Sleep & Recovery
// Sleep quality, duration, consistency, and recovery capacity.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

export function calculateSleepRecovery(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('sleep_recovery', data.activeLayers);

  // L1 Phase 7: self-reported sleep
  const sleepHrs = data.caq.sleepHours;
  const sleepNorm = sleepHrs >= 7 && sleepHrs <= 9 ? 100
    : sleepHrs >= 6 ? 75
    : sleepHrs > 9 && sleepHrs <= 10 ? 80
    : Math.max(20, sleepHrs * 10);
  const phase7Score = Math.round((sleepNorm + data.caq.sleepQuality * 10) / 2);

  // L3: sleep gauge + recovery gauge (primary driver)
  const dailySleep = data.daily.available
    ? Math.round((data.daily.sleepGauge * 0.6 + data.daily.recoveryGauge * 0.4))
    : null;

  // L4: HRV trend + resting HR during sleep
  let bodyRecovery: number | null = null;
  if (data.bodyTracker.available && (data.bodyTracker.hrvTrend !== null || data.bodyTracker.restingHR !== null)) {
    bodyRecovery = 65;
    if (data.bodyTracker.hrvTrend !== null) bodyRecovery += data.bodyTracker.hrvTrend > 0 ? 20 : -10;
    if (data.bodyTracker.restingHR !== null && data.bodyTracker.restingHR < 60) bodyRecovery += 10;
    bodyRecovery = Math.max(0, Math.min(100, bodyRecovery));
  }

  // L2: sleep-disruption symptoms (fatigue, cognitive fog)
  const symptomSleep = data.symptoms.available
    ? Math.max(0, 100 - data.symptoms.stressScore * 5 - (data.caq.neuroSymptomAvg > 5 ? 15 : 0))
    : null;

  // L1 Phase 4: neuro symptoms related to sleep
  const phase4Score = Math.max(0, 100 - data.caq.neuroSymptomAvg * 8);

  // L7: melatonin, cortisol, iron/ferritin
  const labSleep = data.labs.available ? 70 : null;

  // L8: circadian gene variants
  const geneticSleep = data.genetics.available
    ? Math.max(0, 90 - data.genetics.circadianVariants.length * 12)
    : null;

  const rawScore = weightedAverage([
    { score: phase7Score, weight: w.caq_phase7 ?? 0 },
    { score: dailySleep, weight: w.daily_sleep ?? 0 },
    { score: bodyRecovery, weight: w.body_tracker ?? 0 },
    { score: symptomSleep, weight: w.symptom_profile ?? 0 },
    { score: phase4Score, weight: w.caq_phase4 ?? 0 },
    { score: labSleep, weight: w.lab_results ?? 0 },
    { score: geneticSleep, weight: w.genetic_data ?? 0 },
  ]);

  const insights = [];
  if (sleepHrs >= 7 && sleepHrs <= 9) {
    insights.push({ id: 'sr_optimal', text: `Reported ${sleepHrs} hours of sleep; within optimal range`, severity: 'positive' as const });
  } else if (sleepHrs < 7) {
    insights.push({ id: 'sr_low', text: `Reported ${sleepHrs} hours of sleep; below the recommended 7 to 9 hours`, severity: 'warning' as const });
  }
  if (data.daily.available && data.daily.daysActive >= 7) {
    insights.push({ id: 'sr_tracking', text: `${data.daily.daysActive} days of sleep tracking contributing to score accuracy`, severity: 'positive' as const });
  }

  return {
    score: rawScore, rawScore,
    dataCompleteness: Object.keys(w).length / 7,
    trend: 'stable', trendDelta: 0, insights,
    recommendations: sleepHrs < 7
      ? [{ action: 'add', description: 'Consider Liposomal Magnesium L Threonate for sleep quality', priority: 'medium' as const }]
      : [],
  };
}
