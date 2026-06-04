// =============================================================================
// Prompt 173 Phase 4 + Prompt 173a Phase 8 (rebuild on main 2026-06-03):
// weight-goal-driven Gordon macro engine. PURE, I/O-free.
//
// Implements Prompt 173 Section 5.3 Steps 1-6 (Mifflin-St Jeor BMR, activity-
// scaled TDEE, goal-direction-clamped calorie target) AND the 173a Section 5
// amendments to those steps that landed in Phase 8:
//   * Protein basis: 0.8 g per pound of LEAN body mass with a goal
//     multiplier (Loss 0.9 / Maintain 0.8 / Gain 1.0). Section 5.3 Step 4
//     g-per-kg-of-reference-weight formula is RETIRED.
//   * Fat + carbohydrate split: governed by the user's dietary choice
//     (balanced / mediterranean / low_carb / higher_carb / plant_based /
//     keto). Non-keto diets: fat as a share of calorie target, carbs are the
//     balancer; low_carb additionally caps carbs at 25% of calorie target.
//     Keto inverts: carbs anchored at 30 g, fat is the balancer.
//   * Fiber: 14 g per 1000 kcal of the CALORIE TARGET (not consumed).
//   * Section 5.5 safety paths (169b safe-mode, sub-18.5 target BMI,
//     under-18 age) collapse to a maintenance + balanced conservative
//     target. Keto and low_carb are NEVER applied when the conservative
//     path is active (173a Section 9).
//
// The function returns a DISCRIMINATED result:
//   * { ok: false, reason: 'estimate_unavailable' } when a required input is
//     missing. Section 5.2 explicitly forbids fabricating defaults.
//   * { ok: true, targets, basis } when computed successfully. `basis`
//     captures every input + decision + clamp that fired so the resulting
//     target is auditable (Phase 5 nutrition_targets.macro_basis JSON
//     column persists this verbatim).
// =============================================================================

import { bmiFromKgCm } from '@/lib/weight-goals/guardrails';
import type { GoalDirection } from '@/lib/weight-goals/accessor';
import {
  ACTIVITY_MULTIPLIERS,
  LBS_PER_KG_MACRO,
  MACRO_CONFIG,
  type DietaryChoice,
  type MacroActivityLevel,
} from './macro-config';
import type { LbmResolution } from './lbm';

// ---------------------------------------------------------------------------
// Public input + output types
// ---------------------------------------------------------------------------

export type BiologicalSex = 'male' | 'female' | 'unspecified';

export interface BodyComposition {
  // CURRENT live weight in kilograms (the resolved value, not a snapshot).
  // BMR + fat hormonal-minimum + carb reconciliation use this.
  currentWeightKg: number;
  heightCm: number;
  age: number;
  biologicalSex: BiologicalSex;
}

export interface WeightGoalInput {
  goalWeightKg: number;
  goalDirection: GoalDirection;
}

export interface SafetyFlags {
  deSafetyActive: boolean;
}

export interface GenerateMacroTargetsInput {
  body: BodyComposition | null;
  activityLevel: MacroActivityLevel | null;
  weightGoal: WeightGoalInput | null;
  // 173a Phase 8: required. The LBM resolution from src/lib/gordon/lbm.ts
  // (measured precedence, Boer estimate fallback). Protein anchors here.
  leanBodyMass: LbmResolution | null;
  // 173a Phase 8: drives the fat + carbohydrate split. Defaults to
  // 'balanced' upstream (the API route) when the user has not made a
  // choice yet; this engine treats it as a required input so the missing
  // case is explicit.
  dietaryChoice: DietaryChoice | null;
  safety: SafetyFlags;
}

export interface MacroTargets {
  calorieTargetKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  // 173a Phase 8: added as a fourth tracked macro.
  fiberG: number;
}

export type ClampReason =
  | 'deficit_cap'
  | 'surplus_cap'
  | 'calorie_floor'
  | 'protein_pct_ceiling'      // protein factor reduced because kcal share > 40%
  | 'fat_hormonal_floor'       // fat raised to min_fat_g_per_kg * current_weight
  | 'low_carb_cap'             // carbs capped at low_carb_cap_pct; freed kcal to fat
  | 'keto_carb_cap'            // carbs anchored at keto_carb_cap_g
  | 'carb_reconcile_fat'       // fat reduced toward hormonal floor so carb >= 0
  | 'carb_reconcile_protein';  // protein reduced toward 1.2 g/kg LBM-derived floor so carb >= 0

export type ConservativeReason =
  | 'de_safety_mode'
  | 'goal_bmi_below_floor'
  | 'under_18'
  | null;

export interface TargetBasis {
  bmr: number;
  tdee: number;
  activityMultiplier: number;
  effectiveDirection: GoalDirection;
  conservativePath: boolean;
  conservativeReason: ConservativeReason;
  sexEstimated: boolean;
  goalBmi: number | null;
  effectiveFloorKcal: number;
  weeklyRateKg: number;
  weeklyRateExceedsCap: boolean;
  clampsFired: ReadonlyArray<ClampReason>;
  // 173a Phase 8 additions.
  lbmKg: number;
  lbmSource: 'measured' | 'estimated';
  bodyFatFraction: number | null;
  // The dietary choice the engine actually USED (always 'balanced' on the
  // conservative path even when the user picked keto or low_carb, per
  // 173a Section 9).
  effectiveDietaryChoice: DietaryChoice;
}

export type GenerateMacroTargetsResult =
  | { ok: false; reason: 'estimate_unavailable'; missing: ReadonlyArray<string> }
  | { ok: true; targets: MacroTargets; basis: TargetBasis };

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function isPositiveFinite(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function mifflinStJeorBmr(body: BodyComposition): number {
  const sexTerm =
    body.biologicalSex === 'male' ? 5
      : body.biologicalSex === 'female' ? -161
      : -78;
  return 10 * body.currentWeightKg + 6.25 * body.heightCm - 5 * body.age + sexTerm;
}

function clampCalorieTarget(
  rawTarget: number,
  tdee: number,
  direction: GoalDirection,
  effectiveFloorKcal: number,
): { value: number; clamps: ClampReason[] } {
  const clamps: ClampReason[] = [];
  let value = rawTarget;
  if (direction === 'lose') {
    const minAllowed = tdee - MACRO_CONFIG.max_deficit_kcal;
    if (value < minAllowed) {
      value = minAllowed;
      clamps.push('deficit_cap');
    }
  } else if (direction === 'gain') {
    const maxAllowed = tdee + MACRO_CONFIG.max_surplus_kcal;
    if (value > maxAllowed) {
      value = maxAllowed;
      clamps.push('surplus_cap');
    }
  }
  if (value < effectiveFloorKcal) {
    value = effectiveFloorKcal;
    clamps.push('calorie_floor');
  }
  return { value, clamps };
}

// 173a Step 2: protein = 0.8 g/lb LBM * goal multiplier. Apply the 40% kcal
// ceiling (carried from 173 5.4) so very-low-calorie + high-multiplier
// combos cannot let protein dominate the day.
function resolveProteinGrams(
  direction: GoalDirection,
  lbmKg: number,
  calorieTargetKcal: number,
): { proteinG: number; clamps: ClampReason[] } {
  const clamps: ClampReason[] = [];
  const multiplier =
    direction === 'lose' ? MACRO_CONFIG.protein_multiplier_lose
      : direction === 'gain' ? MACRO_CONFIG.protein_multiplier_gain
      : MACRO_CONFIG.protein_multiplier_maintain;
  const lbmLbs = lbmKg * LBS_PER_KG_MACRO;
  let proteinG = MACRO_CONFIG.protein_g_per_lb_lbm * multiplier * lbmLbs;

  // 40% kcal-share sanity ceiling (carried from 173 5.4). When protein kcal
  // would exceed the ceiling, scale protein down to fit.
  const proteinKcalCeiling = calorieTargetKcal * MACRO_CONFIG.protein_max_pct_of_kcal;
  if (proteinG * 4 > proteinKcalCeiling) {
    proteinG = proteinKcalCeiling / 4;
    clamps.push('protein_pct_ceiling');
  }

  return { proteinG, clamps };
}

function fatPctForDiet(diet: DietaryChoice): number {
  switch (diet) {
    case 'mediterranean':
      return MACRO_CONFIG.fat_pct_mediterranean;
    case 'low_carb':
      return MACRO_CONFIG.fat_pct_low_carb;
    case 'higher_carb':
      return MACRO_CONFIG.fat_pct_higher_carb;
    case 'plant_based':
      return MACRO_CONFIG.fat_pct_plant_based;
    case 'keto':
      // Keto inverts the split; the keto branch in resolveFatAndCarb
      // does not use this value. The fat_pct_low_carb value is the
      // closest defensible default and is returned only for
      // completeness so the function is total.
      return MACRO_CONFIG.fat_pct_low_carb;
    case 'balanced':
    default:
      return MACRO_CONFIG.fat_pct_balanced;
  }
}

// 173a Section 5 Step 3: fat + carbohydrate by dietary choice.
function resolveFatAndCarb(
  diet: DietaryChoice,
  calorieTargetKcal: number,
  proteinG: number,
  currentWeightKg: number,
): { fatG: number; carbG: number; clamps: ClampReason[] } {
  const clamps: ClampReason[] = [];
  const proteinKcal = proteinG * 4;
  const remainingKcal = calorieTargetKcal - proteinKcal;
  const fatHormonalFloorG = MACRO_CONFIG.min_fat_g_per_kg * currentWeightKg;
  const fatHormonalFloorKcal = fatHormonalFloorG * 9;

  if (diet === 'keto') {
    // Keto inversion: carbs anchored at keto_carb_cap_g; fat absorbs the
    // remainder with the healthy-fat floor as the lower bound.
    const carbG = MACRO_CONFIG.keto_carb_cap_g;
    const carbKcal = carbG * 4;
    let fatKcal = remainingKcal - carbKcal;
    if (fatKcal < fatHormonalFloorKcal) {
      fatKcal = fatHormonalFloorKcal;
      clamps.push('fat_hormonal_floor');
    }
    const fatG = fatKcal / 9;
    clamps.push('keto_carb_cap');
    return { fatG, carbG, clamps };
  }

  // Non-keto path: fat as a share of calorie target with hormonal floor.
  let fatKcal = calorieTargetKcal * fatPctForDiet(diet);
  if (fatKcal < fatHormonalFloorKcal) {
    fatKcal = fatHormonalFloorKcal;
    clamps.push('fat_hormonal_floor');
  }

  let carbKcal = Math.max(0, remainingKcal - fatKcal);

  if (diet === 'low_carb') {
    // Cap carbs at low_carb_cap_pct of calorie target; freed calories
    // reallocate to fat per 173a Section 5 Step 3.
    const carbCapKcal = calorieTargetKcal * MACRO_CONFIG.low_carb_cap_pct;
    if (carbKcal > carbCapKcal) {
      const freedKcal = carbKcal - carbCapKcal;
      carbKcal = carbCapKcal;
      fatKcal += freedKcal;
      clamps.push('low_carb_cap');
    }
  }

  return { fatG: fatKcal / 9, carbG: carbKcal / 4, clamps };
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

export function generateMacroTargets(input: GenerateMacroTargetsInput): GenerateMacroTargetsResult {
  // Missing-input gate (Section 5.2).
  const missing: string[] = [];
  if (!input.body || !isPositiveFinite(input.body.currentWeightKg)) missing.push('currentWeightKg');
  if (!input.body || !isPositiveFinite(input.body.heightCm)) missing.push('heightCm');
  if (!input.body || !isPositiveFinite(input.body.age)) missing.push('age');
  if (!input.body || (input.body.biologicalSex !== 'male' && input.body.biologicalSex !== 'female' && input.body.biologicalSex !== 'unspecified')) missing.push('biologicalSex');
  if (!input.activityLevel || !(input.activityLevel in ACTIVITY_MULTIPLIERS)) missing.push('activityLevel');
  if (!input.weightGoal || !isPositiveFinite(input.weightGoal.goalWeightKg)) missing.push('goalWeightKg');
  if (!input.weightGoal || (input.weightGoal.goalDirection !== 'lose' && input.weightGoal.goalDirection !== 'gain' && input.weightGoal.goalDirection !== 'maintain')) missing.push('goalDirection');
  if (!input.leanBodyMass || !isPositiveFinite(input.leanBodyMass.lbmKg)) missing.push('leanBodyMass');
  if (!input.dietaryChoice) missing.push('dietaryChoice');

  if (missing.length > 0) {
    return { ok: false, reason: 'estimate_unavailable', missing };
  }

  const body = input.body as BodyComposition;
  const activityLevel = input.activityLevel as MacroActivityLevel;
  const weightGoal = input.weightGoal as WeightGoalInput;
  const leanBodyMass = input.leanBodyMass as LbmResolution;
  const dietaryChoice = input.dietaryChoice as DietaryChoice;

  // Step 1: BMR.
  const bmr = mifflinStJeorBmr(body);

  // Step 2: TDEE.
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const tdee = bmr * activityMultiplier;

  // Section 5.5 safety paths.
  const goalBmi = bmiFromKgCm(weightGoal.goalWeightKg, body.heightCm);
  let conservativePath = false;
  let conservativeReason: ConservativeReason = null;

  if (input.safety.deSafetyActive) {
    conservativePath = true;
    conservativeReason = 'de_safety_mode';
  } else if (body.age < MACRO_CONFIG.adult_age_threshold) {
    conservativePath = true;
    conservativeReason = 'under_18';
  } else if (goalBmi !== null && goalBmi < MACRO_CONFIG.healthy_bmi_min) {
    conservativePath = true;
    conservativeReason = 'goal_bmi_below_floor';
  }

  const effectiveDirection: GoalDirection = conservativePath
    ? 'maintain'
    : weightGoal.goalDirection;

  // 173a Section 9: conservative path overrides keto / low_carb to balanced.
  const effectiveDietaryChoice: DietaryChoice =
    conservativePath && (dietaryChoice === 'keto' || dietaryChoice === 'low_carb')
      ? 'balanced'
      : dietaryChoice;

  // Step 3: calorie target (unchanged from 173).
  const rawCalorieTarget =
    effectiveDirection === 'maintain'
      ? tdee
      : effectiveDirection === 'lose'
        ? tdee * (1 - MACRO_CONFIG.deficit_pct)
        : tdee * (1 + MACRO_CONFIG.surplus_pct);
  const sexFloor =
    body.biologicalSex === 'male'
      ? MACRO_CONFIG.calorie_floor_male
      : MACRO_CONFIG.calorie_floor_female;
  const effectiveFloorKcal = Math.max(sexFloor, bmr);
  const clamped = clampCalorieTarget(rawCalorieTarget, tdee, effectiveDirection, effectiveFloorKcal);
  const calorieTargetKcal = Math.round(clamped.value);
  const calorieClamps = clamped.clamps;

  // Step 4 (173a): protein = 0.8 g/lb LBM * goal multiplier with the 40% ceiling.
  const protein = resolveProteinGrams(effectiveDirection, leanBodyMass.lbmKg, calorieTargetKcal);
  let proteinG = protein.proteinG;

  // Step 5 (173a): fat + carb by dietary choice.
  const fatAndCarb = resolveFatAndCarb(
    effectiveDietaryChoice,
    calorieTargetKcal,
    proteinG,
    body.currentWeightKg,
  );
  let fatG = fatAndCarb.fatG;
  let carbG = fatAndCarb.carbG;
  const fatCarbClamps = fatAndCarb.clamps;

  // Reconciliation guard (173a Section 5). Non-keto: protein anchored, fat
  // floors to healthy minimum, carbs absorb remainder. Keto: carbs anchored
  // at the cap, fat is the balancer (handled inside resolveFatAndCarb).
  const reconcileClamps: ClampReason[] = [];
  if (effectiveDietaryChoice !== 'keto') {
    let carbKcal = carbG * 4;
    if (carbKcal < 0) {
      const fatHormonalFloorG = MACRO_CONFIG.min_fat_g_per_kg * body.currentWeightKg;
      // Reduce fat toward hormonal floor first.
      const fatExcessKcal = (fatG - fatHormonalFloorG) * 9;
      if (fatExcessKcal > 0) {
        const reduction = Math.min(fatExcessKcal, -carbKcal);
        fatG -= reduction / 9;
        carbKcal += reduction;
        reconcileClamps.push('carb_reconcile_fat');
      }
    }
    if (carbKcal < 0) {
      // Reduce protein toward a defensible floor (1.2 g/kg LBM).
      const proteinFloorG = 1.2 * leanBodyMass.lbmKg;
      const proteinExcessKcal = (proteinG - proteinFloorG) * 4;
      if (proteinExcessKcal > 0) {
        const reduction = Math.min(proteinExcessKcal, -carbKcal);
        proteinG -= reduction / 4;
        carbKcal += reduction;
        reconcileClamps.push('carb_reconcile_protein');
      }
    }
    carbG = Math.max(0, carbKcal / 4);
  }

  // Step 6 (173a): fiber = 14 g per 1000 kcal of calorie target, rounded.
  const fiberG = Math.round(
    (MACRO_CONFIG.fiber_g_per_1000_kcal * calorieTargetKcal) / 1000,
  );

  // Implied weekly rate of change in kg (Section 7).
  const weeklyKcalDelta = (tdee - calorieTargetKcal) * 7;
  const weeklyRateKg = Math.abs(weeklyKcalDelta) / 7700;
  const weeklyRateExceedsCap =
    weeklyRateKg / body.currentWeightKg > MACRO_CONFIG.weekly_rate_cap_pct;

  const clampsFired: ClampReason[] = [
    ...calorieClamps,
    ...protein.clamps,
    ...fatCarbClamps,
    ...reconcileClamps,
  ];

  return {
    ok: true,
    targets: {
      calorieTargetKcal,
      proteinG: round1(proteinG),
      fatG: round1(fatG),
      carbG: round1(carbG),
      fiberG,
    },
    basis: {
      bmr: round1(bmr),
      tdee: round1(tdee),
      activityMultiplier,
      effectiveDirection,
      conservativePath,
      conservativeReason,
      sexEstimated: body.biologicalSex === 'unspecified',
      goalBmi,
      effectiveFloorKcal,
      weeklyRateKg: round1(weeklyRateKg),
      weeklyRateExceedsCap,
      clampsFired,
      lbmKg: round1(leanBodyMass.lbmKg),
      lbmSource: leanBodyMass.source,
      bodyFatFraction: leanBodyMass.bodyFatFraction,
      effectiveDietaryChoice,
    },
  };
}
