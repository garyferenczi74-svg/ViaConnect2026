// =============================================================================
// Prompt 173 Phase 4 (rebuild on main 2026-06-03): weight-goal-driven Gordon
// macro engine. PURE, I/O-free.
//
// Implements Prompt 173 Section 5.3 Steps 1-6 (Mifflin-St Jeor BMR, activity-
// scaled TDEE, goal-direction-clamped calorie target, goal-weight protein,
// fat with hormonal-health floor, carb remainder with reconciliation guard)
// and Section 5.5 safety paths (169b safe-mode signal, sub-18.5 target BMI,
// under-18 age) which collapse to a maintenance-only conservative target.
//
// The function returns a DISCRIMINATED result:
//   * { ok: false, reason: 'estimate_unavailable' } when a required input is
//     missing. Section 5.2 explicitly forbids fabricating defaults.
//   * { ok: true, targets, basis } when computed successfully. `basis`
//     captures every input + decision + clamp that fired so the resulting
//     target is auditable (the Phase 5 nutrition_targets.macro_basis JSON
//     column persists this verbatim).
//
// Phase 4 scope NOTE: this module deliberately does NOT include the 173a
// lean-mass protein amendment, per-diet fat split, or fiber as a fourth
// tracked macro. Those land in the 173a phase (rebuild Phase 8).
// =============================================================================

import { bmiFromKgCm } from '@/lib/weight-goals/guardrails';
import type { GoalDirection } from '@/lib/weight-goals/accessor';
import {
  ACTIVITY_MULTIPLIERS,
  MACRO_CONFIG,
  type MacroActivityLevel,
} from './macro-config';

// ---------------------------------------------------------------------------
// Public input + output types
// ---------------------------------------------------------------------------

export type BiologicalSex = 'male' | 'female' | 'unspecified';

export interface BodyComposition {
  // CURRENT live weight in kilograms (the resolved value, not a snapshot).
  // BMR + fat hormonal-minimum + carb reconciliation use this.
  currentWeightKg: number;
  heightCm: number;
  // Integer age in years (months precision is not material here).
  age: number;
  biologicalSex: BiologicalSex;
}

export interface WeightGoalInput {
  // Goal weight (kilograms) the macro target is computed against. The
  // protein reference weight uses this on Lose + Gain, and current weight on
  // Maintain (Step 4).
  goalWeightKg: number;
  // The DB-owned direction as read from public.user_weight_goals. Authoritative.
  goalDirection: GoalDirection;
}

export interface SafetyFlags {
  // 169b body_scan_de_response active history (currently OR in_the_past).
  // When true Step 3 routes to the conservative maintenance-only path.
  deSafetyActive: boolean;
}

export interface GenerateMacroTargetsInput {
  body: BodyComposition | null;
  activityLevel: MacroActivityLevel | null;
  weightGoal: WeightGoalInput | null;
  safety: SafetyFlags;
}

export interface MacroTargets {
  // Rounded to integer kcal so display + adherence math agree.
  calorieTargetKcal: number;
  // Macros rounded to 1 decimal of a gram so the trio reconciles tightly to
  // calorie target after Atwater (4/4/9). Consumers can round further.
  proteinG: number;
  fatG: number;
  carbG: number;
}

export type ClampReason =
  | 'deficit_cap'           // absolute deficit hit max_deficit_kcal
  | 'surplus_cap'           // absolute surplus hit max_surplus_kcal
  | 'calorie_floor'         // calorie target raised to max(sex floor, BMR)
  | 'protein_band_min'      // factor clamped UP to band min
  | 'protein_band_max'      // factor clamped DOWN to band max
  | 'protein_pct_ceiling'   // protein factor reduced because kcal share > 40%
  | 'fat_hormonal_floor'    // fat raised to min_fat_g_per_kg * current_weight
  | 'carb_reconcile_fat'    // fat reduced toward minimum so carb >= 0
  | 'carb_reconcile_protein';// protein reduced toward band min so carb >= 0

export type ConservativeReason =
  | 'de_safety_mode'
  | 'goal_bmi_below_floor'
  | 'under_18'
  | null;

export interface TargetBasis {
  bmr: number;
  tdee: number;
  activityMultiplier: number;
  // Effective goal direction AFTER the safety paths. Conservative paths
  // always read 'maintain' here even when the stored direction differs.
  effectiveDirection: GoalDirection;
  conservativePath: boolean;
  conservativeReason: ConservativeReason;
  sexEstimated: boolean;            // true when biological sex is 'unspecified'
  goalBmi: number | null;
  referenceWeightKg: number;
  effectiveFloorKcal: number;       // max(sex floor, BMR)
  weeklyRateKg: number;             // implied weekly change at the chosen kcal target
  weeklyRateExceedsCap: boolean;    // true if weeklyRateKg / current_weight > rate cap
  clampsFired: ReadonlyArray<ClampReason>;
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

// Step 1: Mifflin-St Jeor BMR with named sex-unspecified fallback. The
// unspecified path averages the male (+5) and female (-161) constant terms
// ((-161 + 5) / 2 = -78), exactly per Section 5.3. The result is labeled an
// estimate via TargetBasis.sexEstimated so the UI can disclose.
function mifflinStJeorBmr(body: BodyComposition): number {
  const sexTerm =
    body.biologicalSex === 'male' ? 5
      : body.biologicalSex === 'female' ? -161
      : /* unspecified */ -78;
  return 10 * body.currentWeightKg + 6.25 * body.heightCm - 5 * body.age + sexTerm;
}

// Step 3 inner: clamp the calorie target by the deficit / surplus absolute
// cap THEN by the effective floor (max(sex floor, BMR)). Returns the
// possibly-clamped target plus the clamp reasons that fired.
function clampCalorieTarget(
  rawTarget: number,
  tdee: number,
  direction: GoalDirection,
  effectiveFloorKcal: number,
): { value: number; clamps: ClampReason[] } {
  const clamps: ClampReason[] = [];
  let value = rawTarget;

  // Absolute deficit / surplus cap (Section 5.4: max_deficit_kcal /
  // max_surplus_kcal). Only fires on Lose and Gain respectively.
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

  // Calorie floor (Lose path only per Section 5.4: "the calorie target on
  // the Lose path is never set below the sex-based floor, and never below
  // the user's BMR"). Maintain / Gain are above TDEE so the floor never
  // binds in practice, but we apply it defensively in case future tuning
  // pushes Maintain below BMR.
  if (value < effectiveFloorKcal) {
    value = effectiveFloorKcal;
    clamps.push('calorie_floor');
  }

  return { value, clamps };
}

// Step 4 inner: pick the protein g/kg factor for the direction, clamp into
// the band, then enforce the kcal-share sanity ceiling. Returns the resolved
// protein grams plus the clamps that fired.
function resolveProteinGrams(
  direction: GoalDirection,
  referenceWeightKg: number,
  calorieTargetKcal: number,
): { proteinG: number; clamps: ClampReason[] } {
  const clamps: ClampReason[] = [];
  // Widen to number explicitly so the band clamp + ceiling reduction below
  // can assign values outside the narrow literal union MACRO_CONFIG carries.
  let factor: number =
    direction === 'lose' ? MACRO_CONFIG.protein_factor_lose
      : direction === 'gain' ? MACRO_CONFIG.protein_factor_gain
      : MACRO_CONFIG.protein_factor_maintain;

  // Band clamp BEFORE the kcal-share ceiling so the ceiling sees a sane
  // factor (a factor outside the band is a config / tuning error, but
  // defensive clamping keeps the engine total).
  if (factor < MACRO_CONFIG.protein_band_min) {
    factor = MACRO_CONFIG.protein_band_min;
    clamps.push('protein_band_min');
  } else if (factor > MACRO_CONFIG.protein_band_max) {
    factor = MACRO_CONFIG.protein_band_max;
    clamps.push('protein_band_max');
  }

  let proteinG = factor * referenceWeightKg;

  // kcal-share sanity ceiling: protein kcal must not exceed
  // protein_max_pct_of_kcal of the calorie target. When it would, reduce the
  // factor toward protein_band_min rather than letting it dominate.
  const proteinKcalCeiling = calorieTargetKcal * MACRO_CONFIG.protein_max_pct_of_kcal;
  if (proteinG * 4 > proteinKcalCeiling) {
    const reducedFactor = Math.max(
      MACRO_CONFIG.protein_band_min,
      proteinKcalCeiling / 4 / referenceWeightKg,
    );
    proteinG = reducedFactor * referenceWeightKg;
    clamps.push('protein_pct_ceiling');
  }

  return { proteinG, clamps };
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

export function generateMacroTargets(input: GenerateMacroTargetsInput): GenerateMacroTargetsResult {
  // Missing-input gate (Section 5.2): never fabricate defaults. Return a
  // structured estimate-unavailable result so the caller can show the
  // "complete your profile" state instead of a fake number.
  const missing: string[] = [];
  if (!input.body || !isPositiveFinite(input.body.currentWeightKg)) missing.push('currentWeightKg');
  if (!input.body || !isPositiveFinite(input.body.heightCm)) missing.push('heightCm');
  if (!input.body || !isPositiveFinite(input.body.age)) missing.push('age');
  if (!input.body || (input.body.biologicalSex !== 'male' && input.body.biologicalSex !== 'female' && input.body.biologicalSex !== 'unspecified')) missing.push('biologicalSex');
  if (!input.activityLevel || !(input.activityLevel in ACTIVITY_MULTIPLIERS)) missing.push('activityLevel');
  if (!input.weightGoal || !isPositiveFinite(input.weightGoal.goalWeightKg)) missing.push('goalWeightKg');
  if (!input.weightGoal || (input.weightGoal.goalDirection !== 'lose' && input.weightGoal.goalDirection !== 'gain' && input.weightGoal.goalDirection !== 'maintain')) missing.push('goalDirection');

  if (missing.length > 0) {
    return { ok: false, reason: 'estimate_unavailable', missing };
  }

  // Inputs are now narrowed.
  const body = input.body as BodyComposition;
  const activityLevel = input.activityLevel as MacroActivityLevel;
  const weightGoal = input.weightGoal as WeightGoalInput;

  // Step 1: BMR.
  const bmr = mifflinStJeorBmr(body);

  // Step 2: TDEE.
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const tdee = bmr * activityMultiplier;

  // Section 5.5: safety paths. Evaluate BEFORE choosing the calorie target
  // so the conservative branch can fully override direction to 'maintain'.
  const goalBmi = bmiFromKgCm(weightGoal.goalWeightKg, body.heightCm);
  let conservativePath = false;
  let conservativeReason: ConservativeReason = null;

  if (input.safety.deSafetyActive) {
    conservativePath = true;
    conservativeReason = 'de_safety_mode';
  } else if (body.age < MACRO_CONFIG.adult_age_threshold) {
    // Under-18 routes to conservative path (Section 5.5).
    conservativePath = true;
    conservativeReason = 'under_18';
  } else if (goalBmi !== null && goalBmi < MACRO_CONFIG.healthy_bmi_min) {
    // Goal weight implies a target BMI below the healthy floor.
    conservativePath = true;
    conservativeReason = 'goal_bmi_below_floor';
  }

  const effectiveDirection: GoalDirection = conservativePath
    ? 'maintain'
    : weightGoal.goalDirection;

  // Step 3: calorie target.
  const rawCalorieTarget =
    effectiveDirection === 'maintain'
      ? tdee
      : effectiveDirection === 'lose'
        ? tdee * (1 - MACRO_CONFIG.deficit_pct)
        : tdee * (1 + MACRO_CONFIG.surplus_pct);

  // Effective floor: max(sex-based floor, BMR). Unspecified-sex uses the
  // female floor as the conservative choice per compliance memo.
  const sexFloor =
    body.biologicalSex === 'male'
      ? MACRO_CONFIG.calorie_floor_male
      : MACRO_CONFIG.calorie_floor_female;
  const effectiveFloorKcal = Math.max(sexFloor, bmr);

  const clamped = clampCalorieTarget(rawCalorieTarget, tdee, effectiveDirection, effectiveFloorKcal);
  const calorieTargetKcal = Math.round(clamped.value);
  const calorieClamps = clamped.clamps;

  // Step 4: protein. Reference weight = goal for Lose + Gain, current for
  // Maintain (Section 5.3 Step 4). Conservative path runs as Maintain, so
  // it picks current weight too.
  const referenceWeightKg =
    effectiveDirection === 'lose' || effectiveDirection === 'gain'
      ? weightGoal.goalWeightKg
      : body.currentWeightKg;

  const protein = resolveProteinGrams(effectiveDirection, referenceWeightKg, calorieTargetKcal);

  // Step 5: fat. fat_g = (calorie_target * fat_pct) / 9, with hormonal-
  // health minimum min_fat_g_per_kg * current_weight_kg.
  const fatClamps: ClampReason[] = [];
  let fatG = (calorieTargetKcal * MACRO_CONFIG.fat_pct) / 9;
  const fatHormonalMin = MACRO_CONFIG.min_fat_g_per_kg * body.currentWeightKg;
  if (fatG < fatHormonalMin) {
    fatG = fatHormonalMin;
    fatClamps.push('fat_hormonal_floor');
  }

  // Step 6: carb fills the remainder with the reconciliation guard (reduce
  // fat toward minimum first, then protein toward band min) so no macro is
  // ever negative.
  let proteinG = protein.proteinG;
  const reconcileClamps: ClampReason[] = [];
  let carbKcal = calorieTargetKcal - (proteinG * 4) - (fatG * 9);

  if (carbKcal < 0) {
    // Reduce fat toward hormonal floor first.
    const fatExcessKcal = (fatG - fatHormonalMin) * 9;
    if (fatExcessKcal > 0) {
      const reduction = Math.min(fatExcessKcal, -carbKcal);
      fatG -= reduction / 9;
      carbKcal += reduction;
      reconcileClamps.push('carb_reconcile_fat');
    }
  }

  if (carbKcal < 0) {
    // Reduce protein toward band min next.
    const proteinFloorG = MACRO_CONFIG.protein_band_min * referenceWeightKg;
    const proteinExcessKcal = (proteinG - proteinFloorG) * 4;
    if (proteinExcessKcal > 0) {
      const reduction = Math.min(proteinExcessKcal, -carbKcal);
      proteinG -= reduction / 4;
      carbKcal += reduction;
      reconcileClamps.push('carb_reconcile_protein');
    }
  }

  // Final non-negative guard. Spec says the reconciliation must succeed at
  // any realistic calorie target; if a degenerate input still leaves
  // carb < 0 we floor at zero so the engine total never emits a negative.
  const carbG = round1(Math.max(0, carbKcal / 4));

  // Implied weekly rate of change in kg (Section 7 + 5.5: never imply
  // faster than weekly_rate_cap_pct of body weight per week).
  // Weekly kcal delta = (TDEE - target) * 7. 7700 kcal ~ 1 kg of body mass.
  const weeklyKcalDelta = (tdee - calorieTargetKcal) * 7;
  const weeklyRateKg = Math.abs(weeklyKcalDelta) / 7700;
  const weeklyRateExceedsCap =
    weeklyRateKg / body.currentWeightKg > MACRO_CONFIG.weekly_rate_cap_pct;

  const clampsFired: ClampReason[] = [
    ...calorieClamps,
    ...protein.clamps,
    ...fatClamps,
    ...reconcileClamps,
  ];

  return {
    ok: true,
    targets: {
      calorieTargetKcal,
      proteinG: round1(proteinG),
      fatG: round1(fatG),
      carbG,
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
      referenceWeightKg,
      effectiveFloorKcal,
      weeklyRateKg: round1(weeklyRateKg),
      weeklyRateExceedsCap,
      clampsFired,
    },
  };
}
