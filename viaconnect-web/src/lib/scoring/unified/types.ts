// Prompt #86 — Unified Scoring Architecture types

export type DataLayer =
  | 'L1_CAQ'
  | 'L2_SYMPTOMS'
  | 'L3_DAILY'
  | 'L4_BODY'
  | 'L5_NUTRITION'
  | 'L6_PROTOCOL'
  | 'L7_LABS'
  | 'L8_GENETICS';

export type CategoryId =
  | 'risk_radar'
  | 'nutrient_profile'
  | 'protocol_effectiveness'
  | 'metabolic_health'
  | 'immune_inflammation'
  | 'bio_optimization_trends'
  | 'stress_mood'
  | 'symptom_landscape'
  | 'medication_intel'
  | 'sleep_recovery';

export type ConfidenceTierName =
  | 'baseline'
  | 'engaged'
  | 'clinical'
  | 'precision'
  | 'full_stack';

export interface ConfidenceTier {
  name: ConfidenceTierName;
  label: string;
  percentage: number;
  scoreCeiling: number;
}

export interface CategoryResult {
  score: number;            // 0-100 (after ceiling enforcement)
  rawScore: number;         // 0-100 (before ceiling)
  dataCompleteness: number; // 0-1
  trend: 'improving' | 'stable' | 'declining';
  trendDelta: number;
  insights: CategoryInsight[];
  recommendations: CategoryRecommendation[];
}

export interface CategoryInsight {
  id: string;
  text: string;
  severity: 'positive' | 'neutral' | 'warning' | 'critical';
}

export interface CategoryRecommendation {
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export type WeightMap = Record<string, number>;

// Per-category weight definitions: layer key → base weight
export type CategoryWeightDef = Record<CategoryId, WeightMap>;

// ── Unified Health Data: single object carrying all inputs ──

export interface CAQData {
  completed: boolean;
  daysSinceCompletion: number;
  // Phase 1
  age: number;
  sex: string | null;
  bmi: number | null;
  // Phase 2
  healthConcernCount: number;
  avgConcernSeverity: number;
  familyHistoryRiskLoad: number;
  familyHistoryCount: number;
  // Phase 3 (physical symptoms, stored as scores 0-10)
  physicalSymptomAvg: number;
  physicalSymptomScores: number[];
  // Phase 4 (neuro)
  neuroSymptomAvg: number;
  neuroSymptomScores: number[];
  // Phase 5 (emotional)
  emotionalSymptomAvg: number;
  emotionalSymptomScores: number[];
  // Phase 6
  medicationCount: number;
  medications: string[];
  supplementCount: number;
  supplementCoverageScore: number;
  allergyCount: number;
  // Phase 7 (lifestyle)
  smokingScore: number;
  alcoholScore: number;
  sedentaryScore: number;
  sleepHours: number;
  sleepQuality: number;
  exerciseFrequency: number;
  dietScore: number;
  stressLevel: number;
}

export interface SymptomProfileData {
  available: boolean;
  retakenWithin30Days: boolean;
  retakenWithin14Days: boolean;
  stressScore: number;
  hormonalScore: number;
  hairNailScore: number;
  skinScore: number;
  weightScore: number;
  highSeverityCount: number; // symptoms >= 7/10
  allScores: number[];
}

export interface DailyScoresData {
  available: boolean;
  daysActive: number;
  consecutiveDays: number;
  sleepGauge: number;
  exerciseGauge: number;
  stepsGauge: number;
  stressGauge: number;
  recoveryGauge: number;
  streakGauge: number;
  supplementsGauge: number;
  nutritionGauge: number;
}

export interface BodyTrackerData {
  available: boolean;
  weeksOfData: number;
  bodyScore: number;         // 0-1000
  compositionGrade: string;
  weightGrade: string;
  muscleGrade: string;
  cardioGrade: string;
  metabolicGrade: string;
  bmiOutOfRange: boolean;
  restingHRAnomaly: boolean;
  bodyFatPercent: number | null;
  weightTrendStable: boolean;
  hrvTrend: number | null;
  restingHR: number | null;
  metabolicAge: number | null;
}

export interface NutritionData {
  available: boolean;
  mealsLogged: number;
  consecutiveDaysLogged: number;
  nutritionScore: number; // 0-100
  macroBalance: number;
  micronutrientDensity: number;
}

export interface ProtocolAdherenceData {
  available: boolean;
  daysActive: number;
  completionRate: number; // 0-100
  streakLength: number;
  interactionCount: number;
  severeInteractionCount: number;
  maxInteractionSeverity: 'info' | 'caution' | 'warning' | 'severe' | 'none';
  unresolvedInteractionCount: number;
}

export interface LabResultsData {
  available: boolean;
  resultSets: number;
  outOfRangeCount: number;
  criticalFlags: number;
  nutrientLevels: Record<string, number>; // vitamin_d, b12, iron, etc.
  metabolicMarkers: Record<string, number>; // glucose, hba1c, lipids, etc.
  inflammatoryMarkers: Record<string, number>; // crp, esr, etc.
}

export interface GeneticData {
  available: boolean;
  panelCount: number;
  riskVariantCount: number;
  riskVariantSeverity: number; // 0-100
  nutrigenomicVariants: string[];
  pharmacogenomicVariants: string[];
  inflammatoryVariants: string[];
  circadianVariants: string[];
  optimizationBonus: number; // 0-15 per Prompt #17
}

export interface UnifiedHealthData {
  userId: string;
  activeLayers: Set<DataLayer>;
  caq: CAQData;
  symptoms: SymptomProfileData;
  daily: DailyScoresData;
  bodyTracker: BodyTrackerData;
  nutrition: NutritionData;
  protocol: ProtocolAdherenceData;
  labs: LabResultsData;
  genetics: GeneticData;
  // Cross-cutting
  bioOptimizationScore: number;
  bioOptimizationTier: string;
  helixTier: string;
  daysSinceOnboarding: number;
}

export interface UnifiedScoringResult {
  scores: Record<CategoryId, number>;
  details: Record<CategoryId, CategoryResult>;
  confidence: ConfidenceTier;
  activeLayers: DataLayer[];
  missingLayers: DataLayer[];
  topCategory: CategoryId;
  lowCategory: CategoryId;
  summary: string;
  calculatedAt: string;
  trigger: string;
}
