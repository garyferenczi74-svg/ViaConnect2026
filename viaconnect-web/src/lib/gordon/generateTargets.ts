// Gordon AI: daily nutrition target generator.
//
// Pure function. Mifflin-St Jeor BMR + activity factor + goal adjustment + CAQ
// flag tightening per planning doc section 3.2. The hook layer wraps this and
// persists the row to nutrition_targets at the Apply phases.
//
// USDA fallback path: when both caqSnapshot and bodySnapshot are null we
// produce a generic adult 2000 kcal profile inline. The existing
// src/lib/nutrition/target-fallback.ts module exports a different shape
// (computeFallbackTargets returning calories/carbs/bad_fat/good_fat only) and
// is the legacy protocol-engine bridge for Prompt 162. We do NOT call it here
// because its NutritionTargets shape does not match the SSOT shape this
// module returns. Inline USDA defaults are reported as a finding to Jeffery.

import type {
  MealDistribution,
  NutritionTargets,
} from './types';
import {
  ACTIVITY_FACTORS,
  DEFAULT_MEAL_DISTRIBUTION,
  GOAL_KCAL_ADJUSTMENT,
  GORDON_VERSION,
  PROTEIN_GRAMS_PER_KG_DEFAULT,
} from './constants';

export type BiologicalSex = 'male' | 'female';
export type CaqActivityLevel = keyof typeof ACTIVITY_FACTORS;
export type CaqWeightGoal = keyof typeof GOAL_KCAL_ADJUSTMENT;

export interface CaqSnapshot {
  activityLevel: CaqActivityLevel;
  weightGoal: CaqWeightGoal;
  cardiovascularRiskFlag?: boolean;
  hypertensionMedicationFlag?: boolean;
  diabetesFlag?: boolean;
  insulinResistanceFlag?: boolean;
  kidneyConcern?: boolean;
  digestiveFlag?: boolean;
}

export interface BodySnapshot {
  weightKg: number;
  heightCm: number;
  age: number;
  biologicalSex: BiologicalSex;
}

export interface MealPatternHistory {
  // Average meals per day over rolling 14-day window. Null when fewer than 7
  // days of data exist.
  avgMealsPerDay: number | null;
  // Number of days observed in the rolling window.
  daysObserved: number;
}

export interface GenerateTargetsInput {
  caqSnapshot: CaqSnapshot | null;
  bodySnapshot: BodySnapshot | null;
  bioOptDay: number | null;
  mealPatternHistory: MealPatternHistory | null;
}

const USDA_DEFAULT_KCAL = 2000;
const USDA_DEFAULT_PROTEIN_G = 50; // FDA daily value reference for 2,000 kcal diet
const USDA_DEFAULT_CARBS_G = 275; // 55% kcal at 2000 kcal
const USDA_DEFAULT_FAT_TOTAL_G = 78; // 35% kcal at 2000 kcal
const USDA_DEFAULT_FAT_SAT_G = 22; // 10% kcal cap at 2000 kcal
const USDA_DEFAULT_FIBER_G = 28;
const USDA_DEFAULT_SUGAR_G = 50; // FDA daily value reference
const USDA_DEFAULT_SODIUM_MG = 2300;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function nowIso(): string {
  return new Date(Date.now()).toISOString();
}

function pickDistribution(history: MealPatternHistory | null): MealDistribution {
  if (!history || history.avgMealsPerDay === null || history.daysObserved < 7) {
    return DEFAULT_MEAL_DISTRIBUTION;
  }
  const avg = history.avgMealsPerDay;
  if (avg <= 2) {
    // Two-meal pattern: 40/40 main meals, 10/10 snack pool.
    return {
      breakfast: 0.40,
      lunch: 0.40,
      dinner: 0.10,
      snack: 0.05,
      snackDivisorCap: 4,
    };
  }
  if (avg > 4) {
    // Flattened high-frequency pattern.
    return {
      breakfast: 0.20,
      lunch: 0.25,
      dinner: 0.25,
      snack: 0.075,
      snackDivisorCap: 4,
    };
  }
  return DEFAULT_MEAL_DISTRIBUTION;
}

function usdaDefaults(input: GenerateTargetsInput): NutritionTargets {
  const distribution = pickDistribution(input.mealPatternHistory);
  return {
    targetId: '',
    userId: '',
    effectiveFrom: nowIso(),
    dailyKcal: USDA_DEFAULT_KCAL,
    dailyProteinG: USDA_DEFAULT_PROTEIN_G,
    dailyCarbsG: USDA_DEFAULT_CARBS_G,
    dailyFatTotalG: USDA_DEFAULT_FAT_TOTAL_G,
    dailyFatSaturatedG: USDA_DEFAULT_FAT_SAT_G,
    dailyFatUnsatG: USDA_DEFAULT_FAT_TOTAL_G - USDA_DEFAULT_FAT_SAT_G,
    dailyFiberG: USDA_DEFAULT_FIBER_G,
    dailySugarG: USDA_DEFAULT_SUGAR_G,
    dailySodiumMg: USDA_DEFAULT_SODIUM_MG,
    sourceCaqSnapshot: input.caqSnapshot ?? null,
    sourceBodySnapshot: input.bodySnapshot ?? null,
    bioOptDay: input.bioOptDay,
    mealDistribution: distribution,
    generatedByVersion: `gordon-${GORDON_VERSION}-usda-fallback`,
    generatedAt: nowIso(),
    supersededAt: null,
  };
}

export function generateTargets(input: GenerateTargetsInput): NutritionTargets {
  if (!input.caqSnapshot && !input.bodySnapshot) {
    return usdaDefaults(input);
  }

  // When only one is present, fill the other with safe defaults so we still
  // produce a personalized-shaped result instead of falling back to USDA.
  const body: BodySnapshot = input.bodySnapshot ?? {
    weightKg: 75,
    heightCm: 175,
    age: 35,
    biologicalSex: 'male',
  };
  const caq: CaqSnapshot = input.caqSnapshot ?? {
    activityLevel: 'moderate',
    weightGoal: 'maintenance',
  };

  // Mifflin-St Jeor.
  const sexConstant = body.biologicalSex === 'female' ? -161 : 5;
  const bmr = 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age + sexConstant;
  const tdee = bmr * ACTIVITY_FACTORS[caq.activityLevel];
  const totalKcal = Math.round(tdee + GOAL_KCAL_ADJUSTMENT[caq.weightGoal]);

  // Protein. g/kg per goal, kidney-tightened 30% down.
  const proteinPerKg = PROTEIN_GRAMS_PER_KG_DEFAULT[caq.weightGoal];
  let proteinG = body.weightKg * proteinPerKg;
  if (caq.kidneyConcern) proteinG = proteinG * 0.7;
  proteinG = round1(proteinG);

  // Fat. 30% of kcal as total, 10% as saturated, 65% of total as unsaturated.
  const fatTotalG = round1((totalKcal * 0.30) / 9);
  const fatSaturatedG = round1((totalKcal * 0.10) / 9);
  const fatUnsatG = round1(fatTotalG * 0.65);

  // Carbs. Remainder. Floor at 50g so the algorithm never produces a keto trap
  // when goal/activity combinations leave very little headroom.
  const proteinKcal = proteinG * 4;
  const fatKcal = fatTotalG * 9;
  let carbsG = round1((totalKcal - proteinKcal - fatKcal) / 4);
  if (carbsG < 50) carbsG = 50;

  // Fiber. Age and sex baseline, digestive ramp if flagged.
  let fiberG: number;
  if (body.biologicalSex === 'male') {
    fiberG = body.age > 50 ? 35 : 38;
  } else {
    fiberG = body.age > 50 ? 21 : 25;
  }
  if (caq.digestiveFlag) fiberG = round1(fiberG * 0.5);

  // Sugar. 10% kcal WHO ceiling, tightened 30% for diabetes/IR.
  let sugarG = round1((totalKcal * 0.10) / 4);
  if (caq.diabetesFlag || caq.insulinResistanceFlag) sugarG = round1(sugarG * 0.7);

  // Sodium. 2300 default, 1500 for CV or hypertension.
  const sodiumMg =
    caq.cardiovascularRiskFlag || caq.hypertensionMedicationFlag ? 1500 : 2300;

  const distribution = pickDistribution(input.mealPatternHistory);

  return {
    targetId: '',
    userId: '',
    effectiveFrom: nowIso(),
    dailyKcal: totalKcal,
    dailyProteinG: proteinG,
    dailyCarbsG: carbsG,
    dailyFatTotalG: fatTotalG,
    dailyFatSaturatedG: fatSaturatedG,
    dailyFatUnsatG: fatUnsatG,
    dailyFiberG: fiberG,
    dailySugarG: sugarG,
    dailySodiumMg: sodiumMg,
    sourceCaqSnapshot: input.caqSnapshot,
    sourceBodySnapshot: input.bodySnapshot,
    bioOptDay: input.bioOptDay,
    mealDistribution: distribution,
    generatedByVersion: `gordon-${GORDON_VERSION}`,
    generatedAt: nowIso(),
    supersededAt: null,
  };
}
