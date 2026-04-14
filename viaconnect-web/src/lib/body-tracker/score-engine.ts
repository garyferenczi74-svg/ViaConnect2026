// Body Tracker — Score Engine (Arnold Sub-Agent)
// Calculates composite Body Score (0-1000) from 5 contributors.

import type { BodyScoreTier } from './types';
import { BODY_SCORE_WEIGHTS, TIER_THRESHOLDS, GRADE_THRESHOLDS } from './constants';

export interface BodyScoreInput {
  bodyFatPct?: number;
  segmentalFatBalance?: number;
  visceralFatRating?: number;
  weightTrend?: 'toward_goal' | 'away_from_goal' | 'stable' | 'no_goal';
  weightConsistency?: number;
  muscleMassTrend?: 'gaining' | 'losing' | 'stable';
  segmentalMuscleBalance?: number;
  restingHR?: number;
  hrv?: number;
  circadianAlignment?: number;
  metabolicAgeDelta?: number;
  metabolicCapacity?: number;
  strainBalance?: number;
}

export interface BodyScoreOutput {
  bodyScore: number;
  tier: BodyScoreTier;
  confidencePct: number;
  contributors: {
    composition: { score: number; grade: string };
    weight: { score: number; grade: string };
    muscle: { score: number; grade: string };
    cardiovascular: { score: number; grade: string };
    metabolic: { score: number; grade: string };
  };
}

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

function scoreToGrade(score: number): string {
  return GRADE_THRESHOLDS.find((t) => score >= t.min)?.grade ?? 'F';
}

function calculateCompositionScore(input: BodyScoreInput): number {
  let score = 50;
  if (input.bodyFatPct !== undefined) {
    const deviation = Math.abs(input.bodyFatPct - 18);
    score = Math.max(0, 100 - deviation * 3);
  }
  if (input.segmentalFatBalance !== undefined) {
    score = score * 0.7 + input.segmentalFatBalance * 100 * 0.3;
  }
  if (input.visceralFatRating !== undefined) {
    const penalty = Math.max(0, (input.visceralFatRating - 12) * 5);
    score = Math.max(0, score - penalty);
  }
  return clamp(score);
}

function calculateWeightScore(input: BodyScoreInput): number {
  let score = 50;
  if (input.weightTrend === 'toward_goal') score += 30;
  if (input.weightTrend === 'stable') score += 15;
  if (input.weightTrend === 'away_from_goal') score -= 20;
  if (input.weightConsistency !== undefined) score += input.weightConsistency * 20;
  return clamp(score);
}

function calculateMuscleScore(input: BodyScoreInput): number {
  let score = 50;
  if (input.muscleMassTrend === 'gaining') score += 25;
  if (input.muscleMassTrend === 'stable') score += 10;
  if (input.muscleMassTrend === 'losing') score -= 15;
  if (input.segmentalMuscleBalance !== undefined) {
    score = score * 0.7 + input.segmentalMuscleBalance * 100 * 0.3;
  }
  return clamp(score);
}

function calculateCardiovascularScore(input: BodyScoreInput): number {
  let score = 50;
  if (input.restingHR !== undefined) {
    if (input.restingHR >= 50 && input.restingHR <= 60) score += 25;
    else if (input.restingHR >= 45 && input.restingHR <= 70) score += 15;
    else if (input.restingHR > 80) score -= 15;
  }
  if (input.hrv !== undefined) {
    if (input.hrv >= 40 && input.hrv <= 60) score += 25;
    else if (input.hrv >= 30) score += 10;
    else score -= 10;
  }
  if (input.circadianAlignment !== undefined) score += input.circadianAlignment * 15;
  return clamp(score);
}

function calculateMetabolicScore(input: BodyScoreInput): number {
  let score = 50;
  if (input.metabolicAgeDelta !== undefined) score += Math.min(25, input.metabolicAgeDelta * 5);
  if (input.metabolicCapacity !== undefined) score += (input.metabolicCapacity / 100) * 15;
  if (input.strainBalance !== undefined) score += input.strainBalance * 10;
  return clamp(score);
}

export function calculateBodyScore(input: BodyScoreInput): BodyScoreOutput {
  const compositionScore = calculateCompositionScore(input);
  const weightScore = calculateWeightScore(input);
  const muscleScore = calculateMuscleScore(input);
  const cardiovascularScore = calculateCardiovascularScore(input);
  const metabolicScore = calculateMetabolicScore(input);

  const weightedAvg =
    compositionScore * BODY_SCORE_WEIGHTS.composition +
    weightScore * BODY_SCORE_WEIGHTS.weightManagement +
    muscleScore * BODY_SCORE_WEIGHTS.muscleHealth +
    cardiovascularScore * BODY_SCORE_WEIGHTS.cardiovascular +
    metabolicScore * BODY_SCORE_WEIGHTS.metabolic;

  const bodyScore = Math.round(weightedAvg * 10);

  const dataPoints = [
    input.bodyFatPct, input.weightTrend, input.muscleMassTrend,
    input.restingHR, input.metabolicAgeDelta,
  ].filter((v) => v !== undefined).length;
  const confidencePct = Math.round((dataPoints / 5) * 100);

  const tier =
    TIER_THRESHOLDS.find((t) => bodyScore >= t.min)?.tier ?? 'Critical';

  return {
    bodyScore,
    tier,
    confidencePct,
    contributors: {
      composition: { score: compositionScore, grade: scoreToGrade(compositionScore) },
      weight: { score: weightScore, grade: scoreToGrade(weightScore) },
      muscle: { score: muscleScore, grade: scoreToGrade(muscleScore) },
      cardiovascular: { score: cardiovascularScore, grade: scoreToGrade(cardiovascularScore) },
      metabolic: { score: metabolicScore, grade: scoreToGrade(metabolicScore) },
    },
  };
}
