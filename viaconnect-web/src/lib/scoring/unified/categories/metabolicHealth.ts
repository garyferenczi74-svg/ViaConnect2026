// Prompt #86 — Metabolic Health
// Body composition, metabolic age, cardiovascular fitness, activity levels.

import type { UnifiedHealthData, CategoryResult } from '../types';
import { getEffectiveWeights, weightedAverage } from '../weightManager';

const GRADE_SCORES: Record<string, number> = {
  'A+': 100, A: 95, 'A-': 90, 'B+': 85, B: 80, 'B-': 75,
  'C+': 70, C: 65, 'C-': 60, 'D+': 55, D: 50, 'D-': 45, F: 30,
};

function gradeToScore(grade: string): number {
  return GRADE_SCORES[grade] ?? 50;
}

export function calculateMetabolicHealth(data: UnifiedHealthData): CategoryResult {
  const w = getEffectiveWeights('metabolic_health', data.activeLayers);

  // L1 Phase 1: age, BMI baseline
  const ageBaseline = data.caq.age <= 30 ? 90 : data.caq.age <= 50 ? 80 : data.caq.age <= 65 ? 70 : 60;
  const bmiPenalty = data.caq.bmi
    ? (data.caq.bmi >= 18.5 && data.caq.bmi <= 24.9 ? 0 : Math.min(20, Math.abs(data.caq.bmi - 22) * 2))
    : 0;
  const phase1Score = Math.max(0, ageBaseline - bmiPenalty);

  // L1 Phase 7: exercise + activity self-report
  const phase7Score = Math.min(100, data.caq.exerciseFrequency * 15 + (10 - data.caq.sedentaryScore) * 5);

  // L4: Body Tracker (primary driver)
  let bodyScore: number | null = null;
  if (data.bodyTracker.available) {
    const normalized = data.bodyTracker.bodyScore / 10; // 0-1000 → 0-100
    const contributorAvg = (
      gradeToScore(data.bodyTracker.compositionGrade) +
      gradeToScore(data.bodyTracker.weightGrade) +
      gradeToScore(data.bodyTracker.muscleGrade) +
      gradeToScore(data.bodyTracker.cardioGrade) +
      gradeToScore(data.bodyTracker.metabolicGrade)
    ) / 5;
    bodyScore = Math.round(normalized * 0.4 + contributorAvg * 0.6);
  }

  // L3: exercise + steps averaged
  const dailyActivity = data.daily.available
    ? Math.round((data.daily.exerciseGauge + data.daily.stepsGauge) / 2)
    : null;

  // L2: metabolic-correlated symptoms
  const symptomMetabolic = data.symptoms.available
    ? Math.max(0, 100 - data.symptoms.weightScore * 5 - (data.caq.physicalSymptomAvg > 5 ? 15 : 0))
    : null;

  // L7: metabolic lab markers
  const labMetabolic = data.labs.available
    ? calculateLabMetabolicScore(data)
    : null;

  // L8: hormonal/metabolic genetic variants
  const geneticMetabolic = data.genetics.available
    ? Math.max(0, 85 - data.genetics.riskVariantCount * 3)
    : null;

  const rawScore = weightedAverage([
    { score: phase1Score, weight: w.caq_phase1 ?? 0 },
    { score: phase7Score, weight: w.caq_phase7 ?? 0 },
    { score: bodyScore, weight: w.body_tracker ?? 0 },
    { score: dailyActivity, weight: w.daily_activity ?? 0 },
    { score: symptomMetabolic, weight: w.symptom_profile ?? 0 },
    { score: labMetabolic, weight: w.lab_results ?? 0 },
    { score: geneticMetabolic, weight: w.genetic_data ?? 0 },
  ]);

  const insights = [];
  if (data.bodyTracker.available && data.bodyTracker.metabolicAge !== null) {
    const diff = data.bodyTracker.metabolicAge - data.caq.age;
    insights.push({
      id: 'mh_metage',
      text: diff <= 0
        ? `Your metabolic age is ${Math.abs(diff)} year(s) younger than your actual age`
        : `Your metabolic age is ${diff} year(s) older than your actual age`,
      severity: diff <= 0 ? 'positive' as const : 'warning' as const,
    });
  }
  if (!data.bodyTracker.available) {
    insights.push({ id: 'mh_body', text: 'Add body composition measurements for a more accurate Metabolic Health score', severity: 'neutral' as const });
  }

  return {
    score: rawScore,
    rawScore,
    dataCompleteness: Object.keys(w).length / 7,
    trend: 'stable',
    trendDelta: 0,
    insights,
    recommendations: [],
  };
}

function calculateLabMetabolicScore(data: UnifiedHealthData): number {
  const m = data.labs.metabolicMarkers;
  const keys = Object.keys(m);
  if (keys.length === 0) return 70;
  const inRange = keys.filter(k => m[k] >= 40 && m[k] <= 100).length;
  return Math.round((inRange / keys.length) * 100);
}
