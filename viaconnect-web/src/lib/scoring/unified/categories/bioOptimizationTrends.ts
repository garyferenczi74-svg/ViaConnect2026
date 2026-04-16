// Prompt #86 — Bio Optimization Trends
// DELEGATES to the Prompt #17 formula in bio-optimization.ts.
// This category wraps the existing calculation into the unified shape.

import type { UnifiedHealthData, CategoryResult } from '../types';
import {
  calculateInitialBioOptimization,
  calculateDailyBioOptimization,
  type BioOptimizationInput,
  type DailyScores,
} from '@/lib/scoring/bio-optimization';

export function calculateBioOptimizationTrends(data: UnifiedHealthData): CategoryResult {
  // Build the Prompt #17 input from unified data
  const bioInput: BioOptimizationInput = {
    age: data.caq.age,
    bmi: data.caq.bmi,
    healthConcernCount: data.caq.healthConcernCount,
    familyHistoryRiskLoad: data.caq.familyHistoryRiskLoad,
    physicalSymptomAvg: data.caq.physicalSymptomAvg,
    neuroSymptomAvg: data.caq.neuroSymptomAvg,
    emotionalSymptomAvg: data.caq.emotionalSymptomAvg,
    medicationCount: data.caq.medicationCount,
    interactionCount: data.protocol.interactionCount,
    supplementCoverageScore: data.caq.supplementCoverageScore,
    allergyCount: data.caq.allergyCount,
    sleepScore: data.caq.sleepQuality,
    exerciseScore: data.caq.exerciseFrequency,
    stressScore: data.caq.stressLevel,
    dietScore: data.caq.dietScore,
    hasGenex360: data.genetics.available,
    genex360OptimizationBonus: data.genetics.optimizationBonus,
  };

  const baselineScore = calculateInitialBioOptimization(bioInput);

  // If daily data is available, blend via Prompt #17 formula
  let finalScore = baselineScore;
  if (data.daily.available && data.daily.daysActive > 0) {
    const dailyScores: DailyScores = {
      recovery: data.daily.recoveryGauge,
      sleep: data.daily.sleepGauge,
      steps: data.daily.stepsGauge,
      strain: data.daily.exerciseGauge,
      exercise: data.daily.exerciseGauge,
      regimen: data.daily.supplementsGauge,
    };
    finalScore = calculateDailyBioOptimization(
      baselineScore,
      dailyScores,
      data.daily.consecutiveDays,
    );
  }

  // Use the platform's stored score if available (authoritative)
  if (data.bioOptimizationScore > 0) {
    finalScore = data.bioOptimizationScore;
  }

  const insights = [];
  insights.push({
    id: 'bot_score',
    text: `Bio Optimization score: ${finalScore}/100 (${data.bioOptimizationTier || 'Developing'})`,
    severity: finalScore >= 70 ? 'positive' as const : 'neutral' as const,
  });
  if (data.daily.available && data.daily.consecutiveDays > 0) {
    insights.push({
      id: 'bot_streak',
      text: `${data.daily.consecutiveDays} day check in streak contributing to score refinement`,
      severity: 'positive' as const,
    });
  }

  return {
    score: finalScore,
    rawScore: finalScore,
    dataCompleteness: data.daily.available ? 0.8 : 0.5,
    trend: 'stable',
    trendDelta: 0,
    insights,
    recommendations: [],
  };
}
