// Bio Optimization Score Engine
// Calculates initial score from CAQ data and daily blended scores

export interface BioOptimizationInput {
  age: number;
  bmi: number | null;
  healthConcernCount: number;
  familyHistoryRiskLoad: number;
  physicalSymptomAvg: number;
  neuroSymptomAvg: number;
  emotionalSymptomAvg: number;
  medicationCount: number;
  interactionCount: number;
  supplementCoverageScore: number;
  allergyCount: number;
  sleepScore: number;
  exerciseScore: number;
  stressScore: number;
  dietScore: number;
  hasGenex360: boolean;
  genex360OptimizationBonus: number;
}

export function calculateInitialBioOptimization(input: BioOptimizationInput): number {
  const physicalHealth = Math.max(0, 100 - (input.physicalSymptomAvg * 10));
  const neuroHealth = Math.max(0, 100 - (input.neuroSymptomAvg * 10));
  const emotionalHealth = Math.max(0, 100 - (input.emotionalSymptomAvg * 10));

  const ageBaseline = input.age <= 30 ? 90 : input.age <= 50 ? 80 : input.age <= 65 ? 70 : 60;
  const bmiPenalty = input.bmi ? (input.bmi >= 18.5 && input.bmi <= 24.9 ? 0 : Math.min(20, Math.abs(input.bmi - 22) * 2)) : 0;
  const demographicScore = Math.max(0, ageBaseline - bmiPenalty);

  const concernScore = Math.max(0, 100 - (input.healthConcernCount * 5) - (input.familyHistoryRiskLoad * 3));
  const medScore = Math.max(0, 100 - (input.medicationCount * 8) - (input.interactionCount * 12));
  const suppScore = input.supplementCoverageScore;
  const allergyScore = Math.max(0, 100 - (input.allergyCount * 10));
  const lifestyleScore = ((input.sleepScore + input.exerciseScore + (10 - input.stressScore) + input.dietScore) / 40) * 100;

  const baseScore =
    (demographicScore * 0.05) +
    (concernScore * 0.15) +
    (physicalHealth * 0.15) +
    (neuroHealth * 0.10) +
    (emotionalHealth * 0.10) +
    (medScore * 0.10) +
    (suppScore * 0.10) +
    (allergyScore * 0.05) +
    (lifestyleScore * 0.20);

  const geneticBonus = input.hasGenex360 ? input.genex360OptimizationBonus : 0;
  return Math.round(Math.min(100, Math.max(0, baseScore + geneticBonus)));
}

export interface DailyScores {
  recovery: number;
  sleep: number;
  steps: number;
  strain: number;
  exercise: number;
  regimen: number;
}

export function calculateDailyBioOptimization(baselineScore: number, daily: DailyScores, streak: number): number {
  const dailyComposite =
    (daily.recovery * 0.15) +
    (daily.sleep * 0.20) +
    (daily.steps * 0.10) +
    (daily.strain * 0.15) +
    (daily.exercise * 0.15) +
    (daily.regimen * 0.25);

  const dailyWeight = Math.min(0.60, 0.20 + (streak * 0.01));
  const baseWeight = 1 - dailyWeight;
  const blendedScore = (baselineScore * baseWeight) + (dailyComposite * dailyWeight);
  const streakBonus = Math.min(5, streak * 0.17);
  return Math.round(Math.min(100, Math.max(0, blendedScore + streakBonus)));
}

export function normalizeSteps(stepCount: number): number {
  return Math.round(Math.min(100, (stepCount / 10000) * 100));
}

export function normalizeSleep(hours: number): number {
  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6 && hours < 7) return 70;
  if (hours >= 5 && hours < 6) return 40;
  if (hours > 9 && hours <= 10) return 80;
  if (hours > 10) return 60;
  return Math.max(0, hours * 10);
}

export function normalizeExercise(minutes: number): number {
  return Math.round(Math.min(100, (minutes / 30) * 100));
}

export function getBioOptimizationTier(score: number): { label: string; color: string; badgeClass: string } {
  if (score >= 85) return { label: "Optimized", color: "#2DA5A0", badgeClass: "bg-teal-400/15 text-teal-400 border-teal-400/30" };
  if (score >= 70) return { label: "Strong", color: "#60A5FA", badgeClass: "bg-blue-400/15 text-blue-400 border-blue-400/30" };
  if (score >= 50) return { label: "Developing", color: "#FBBF24", badgeClass: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30" };
  if (score >= 30) return { label: "Needs Attention", color: "#B75E18", badgeClass: "bg-orange-400/15 text-orange-400 border-orange-400/30" };
  return { label: "Critical", color: "#EF4444", badgeClass: "bg-red-400/15 text-red-400 border-red-400/30" };
}
