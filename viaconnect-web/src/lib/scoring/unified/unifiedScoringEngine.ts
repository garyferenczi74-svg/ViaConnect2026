// Prompt #86 — Unified Scoring Engine orchestrator
// detectLayers → calculateAll → enforce ceilings → generate summary → persist

import type {
  DataLayer, CategoryId, UnifiedHealthData, UnifiedScoringResult,
  CAQData, SymptomProfileData, DailyScoresData, BodyTrackerData,
  NutritionData, ProtocolAdherenceData, LabResultsData, GeneticData,
  CategoryResult,
} from './types';
import { detectConfidenceTier, calculateConfidencePercentage, enforceScoreCeiling } from './confidenceTiers';
import { generateHealthSummary } from './insightGenerator';
import { calculateRiskRadar } from './categories/riskRadar';
import { calculateNutrientProfile } from './categories/nutrientProfile';
import { calculateProtocolEffectiveness } from './categories/protocolEffectiveness';
import { calculateMetabolicHealth } from './categories/metabolicHealth';
import { calculateImmuneInflammation } from './categories/immuneInflammation';
import { calculateBioOptimizationTrends } from './categories/bioOptimizationTrends';
import { calculateStressMood } from './categories/stressMood';
import { calculateSymptomLandscape } from './categories/symptomLandscape';
import { calculateMedicationIntelligence } from './categories/medicationIntelligence';
import { calculateSleepRecovery } from './categories/sleepRecovery';

const CALCULATORS: Record<CategoryId, (data: UnifiedHealthData) => CategoryResult> = {
  risk_radar: calculateRiskRadar,
  nutrient_profile: calculateNutrientProfile,
  protocol_effectiveness: calculateProtocolEffectiveness,
  metabolic_health: calculateMetabolicHealth,
  immune_inflammation: calculateImmuneInflammation,
  bio_optimization_trends: calculateBioOptimizationTrends,
  stress_mood: calculateStressMood,
  symptom_landscape: calculateSymptomLandscape,
  medication_intel: calculateMedicationIntelligence,
  sleep_recovery: calculateSleepRecovery,
};

const ALL_CATEGORIES: CategoryId[] = [
  'risk_radar', 'nutrient_profile', 'protocol_effectiveness',
  'metabolic_health', 'immune_inflammation', 'bio_optimization_trends',
  'stress_mood', 'symptom_landscape', 'medication_intel', 'sleep_recovery',
];

const ALL_LAYERS: DataLayer[] = [
  'L1_CAQ', 'L2_SYMPTOMS', 'L3_DAILY', 'L4_BODY',
  'L5_NUTRITION', 'L6_PROTOCOL', 'L7_LABS', 'L8_GENETICS',
];

/**
 * Main entry point. Takes pre-assembled UnifiedHealthData and returns
 * all 10 category scores with confidence tier and summary.
 */
export function calculateAllCategories(
  data: UnifiedHealthData,
  trigger: string = 'manual',
): UnifiedScoringResult {
  const confidence = detectConfidenceTier(data.activeLayers);

  // Run all 10 calculators
  const details: Record<string, CategoryResult> = {};
  const scores: Record<string, number> = {};

  for (const catId of ALL_CATEGORIES) {
    const calc = CALCULATORS[catId];
    const result = calc(data);
    // Bio Optimization Trends is NOT ceiling-gated (it follows Prompt #17 formula)
    const enforced = catId === 'bio_optimization_trends'
      ? result.score
      : enforceScoreCeiling(result.rawScore, confidence);
    details[catId] = { ...result, score: enforced };
    scores[catId] = enforced;
  }

  // Find top and low
  const sorted = ALL_CATEGORIES.slice().sort((a, b) => scores[b] - scores[a]);
  const topCategory = sorted[0];
  const lowCategory = sorted[sorted.length - 1];

  const activeLayers = Array.from(data.activeLayers) as DataLayer[];
  const missingLayers = ALL_LAYERS.filter(l => !data.activeLayers.has(l));

  const result: UnifiedScoringResult = {
    scores: scores as Record<CategoryId, number>,
    details: details as Record<CategoryId, CategoryResult>,
    confidence,
    activeLayers,
    missingLayers,
    topCategory,
    lowCategory,
    summary: '',
    calculatedAt: new Date().toISOString(),
    trigger,
  };

  result.summary = generateHealthSummary(result);
  return result;
}

// ── Data assembly helpers ─────────────────────────────────

export function emptyCAQ(): CAQData {
  return {
    completed: false, daysSinceCompletion: 0,
    age: 30, sex: null, bmi: null,
    healthConcernCount: 0, avgConcernSeverity: 0, familyHistoryRiskLoad: 0, familyHistoryCount: 0,
    physicalSymptomAvg: 5, neuroSymptomAvg: 5, emotionalSymptomAvg: 5,
    physicalSymptomScores: [], neuroSymptomScores: [], emotionalSymptomScores: [],
    medicationCount: 0, medications: [], supplementCount: 0, supplementCoverageScore: 0, allergyCount: 0,
    smokingScore: 0, alcoholScore: 0, sedentaryScore: 5, sleepHours: 7, sleepQuality: 5,
    exerciseFrequency: 3, dietScore: 5, stressLevel: 5,
  };
}

export function emptySymptoms(): SymptomProfileData {
  return { available: false, retakenWithin30Days: false, retakenWithin14Days: false, stressScore: 5, hormonalScore: 5, hairNailScore: 5, skinScore: 5, weightScore: 5, highSeverityCount: 0, allScores: [] };
}

export function emptyDaily(): DailyScoresData {
  return { available: false, daysActive: 0, consecutiveDays: 0, sleepGauge: 0, exerciseGauge: 0, stepsGauge: 0, stressGauge: 0, recoveryGauge: 0, streakGauge: 0, supplementsGauge: 0, nutritionGauge: 0 };
}

export function emptyBody(): BodyTrackerData {
  return { available: false, weeksOfData: 0, bodyScore: 0, compositionGrade: 'C', weightGrade: 'C', muscleGrade: 'C', cardioGrade: 'C', metabolicGrade: 'C', bmiOutOfRange: false, restingHRAnomaly: false, bodyFatPercent: null, weightTrendStable: true, hrvTrend: null, restingHR: null, metabolicAge: null };
}

export function emptyNutrition(): NutritionData {
  return { available: false, mealsLogged: 0, consecutiveDaysLogged: 0, nutritionScore: 0, macroBalance: 0, micronutrientDensity: 0 };
}

export function emptyProtocol(): ProtocolAdherenceData {
  return { available: false, daysActive: 0, completionRate: 0, streakLength: 0, interactionCount: 0, severeInteractionCount: 0, maxInteractionSeverity: 'none', unresolvedInteractionCount: 0 };
}

export function emptyLabs(): LabResultsData {
  return { available: false, resultSets: 0, outOfRangeCount: 0, criticalFlags: 0, nutrientLevels: {}, metabolicMarkers: {}, inflammatoryMarkers: {} };
}

export function emptyGenetics(): GeneticData {
  return { available: false, panelCount: 0, riskVariantCount: 0, riskVariantSeverity: 0, nutrigenomicVariants: [], pharmacogenomicVariants: [], inflammatoryVariants: [], circadianVariants: [], optimizationBonus: 0 };
}

export function buildEmptyUnifiedData(userId: string): UnifiedHealthData {
  return {
    userId,
    activeLayers: new Set(),
    caq: emptyCAQ(),
    symptoms: emptySymptoms(),
    daily: emptyDaily(),
    bodyTracker: emptyBody(),
    nutrition: emptyNutrition(),
    protocol: emptyProtocol(),
    labs: emptyLabs(),
    genetics: emptyGenetics(),
    bioOptimizationScore: 0,
    bioOptimizationTier: 'Developing',
    helixTier: 'Bronze',
    daysSinceOnboarding: 0,
  };
}
