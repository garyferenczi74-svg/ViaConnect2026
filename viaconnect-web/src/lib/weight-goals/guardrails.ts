// =============================================================================
// Prompt 173 Task 3 (rebuild on main 2026-06-03): Weight Goals guardrail math.
// PURE, I/O-free.
//
// This module is the SINGLE home for the weight-goal plausibility + safety
// math used by the CAQ Weight Goals sub-section (lands in Phase 3 of the
// rebuild). It holds NO React, NO Supabase, NO user-facing copy: only numbers
// and decisions, so it can be unit-tested in isolation.
//
// What lives here:
//   * BMI from weight-kg + height-cm.
//   * kg <-> lbs conversion (single rounding-free source so display and
//     storage never drift).
//   * The plausibility band check (goal weight must imply a target BMI inside
//     a sane physiological band for the user's height).
//   * The sub-18.5 detection (target BMI below the commonly cited healthy
//     lower bound) used to surface a calm, non-alarming healthcare-
//     professional note.
//
// NOTE on direction: the goal DIRECTION (lose / gain / maintain) is NOT
// computed here. It is owned by the DB trigger and previewed client-side by
// previewGoalDirection in src/lib/weight-goals/accessor.ts. Do not duplicate
// it.
// =============================================================================

// Pounds per kilogram. One canonical factor for every kg <-> lbs conversion
// so the Demographics weight input, the goal-weight input, and storage all
// agree.
export const LBS_PER_KG = 2.20462 as const;

/**
 * Convert kilograms to pounds. Pure; no rounding (callers round for display).
 */
export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

/**
 * Convert pounds to kilograms. Pure; no rounding (callers round for display).
 */
export function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG;
}

/**
 * Body Mass Index from weight in kilograms and height in centimetres.
 * BMI = kg / (m^2). Returns null when inputs are missing, non-finite, or
 * non-positive (fail-safe: callers treat null as "cannot evaluate", never as
 * a passing or failing result).
 */
export function bmiFromKgCm(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (
    weightKg === null || weightKg === undefined || !Number.isFinite(weightKg) || weightKg <= 0 ||
    heightCm === null || heightCm === undefined || !Number.isFinite(heightCm) || heightCm <= 0
  ) {
    return null;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi) || bmi <= 0) return null;
  return bmi;
}

// ---------------------------------------------------------------------------
// Plausibility band (named, defensible bounds)
// ---------------------------------------------------------------------------

// Sane physiological band for a GOAL target, expressed as BMI so it scales
// with the user's height. These are deliberately WIDE: the band exists only
// to reject nonsensical / fat-finger targets (e.g. a 5 kg or 400 kg goal),
// not to police a healthy range. The healthy-range nudge is the SEPARATE
// sub-18.5 note below.
//
//   GOAL_BMI_MIN = 13: below the lowest BMI compatible with life in adults.
//     A target under this is an implausible / data-entry error, so we
//     reject it with a calm message.
//   GOAL_BMI_MAX = 60: BMI 60 corresponds to the upper edge of recorded
//     human class-III obesity; a target above this is almost certainly a
//     typo (e.g. lbs entered as kg) and is rejected.
export const GOAL_BMI_MIN = 13 as const;
export const GOAL_BMI_MAX = 60 as const;

// The commonly cited lower bound of the "healthy weight" BMI range. A target
// BMI strictly below this triggers a calm, non-alarming healthcare-
// professional note (NOT a block). Standard WHO/CDC healthy-range lower
// bound.
export const HEALTHY_BMI_MIN = 18.5 as const;

// Why a goal weight was rejected by the plausibility check. UI maps these to
// calm, specific messages; 'ok' means the value passed.
export type GoalPlausibility =
  | 'ok'
  | 'not_a_number'
  | 'not_positive'
  | 'no_height' // cannot evaluate the band without a height; treated as a soft pass
  | 'below_band'
  | 'above_band';

export interface GoalWeightEvaluation {
  // Whether the goal weight is acceptable to PERSIST.
  isValid: boolean;
  // The detailed plausibility verdict (drives the calm validation message).
  plausibility: GoalPlausibility;
  // The implied target BMI, or null when height is missing / inputs invalid.
  targetBmi: number | null;
  // True when a VALID target nonetheless lands below the healthy lower bound
  // (BMI < 18.5). This is NOT a block; it surfaces the professional-referral
  // note. False when height is missing (we cannot make the claim) or the
  // value is invalid for another reason.
  belowHealthyRange: boolean;
}

/**
 * Evaluate a candidate goal weight (in kg) against the plausibility band and
 * the healthy-range lower bound, given the user's height in cm. Pure + total.
 *
 * Rules:
 *   * A non-finite / NaN goal weight is 'not_a_number' and invalid.
 *   * A goal weight <= 0 is 'not_positive' and invalid (mirrors the DB > 0
 *     CHECK constraint, so we never attempt a write the DB would reject).
 *   * With NO usable height we CANNOT compute BMI, so we cannot band-check:
 *     the value is treated as a SOFT PASS ('no_height', isValid = true) as
 *     long as it is a positive number, and belowHealthyRange is false (we
 *     make no unsupported healthy-range claim without a height).
 *   * With a height: targetBmi is computed. Below GOAL_BMI_MIN -> 'below_band'
 *     (invalid); above GOAL_BMI_MAX -> 'above_band' (invalid); otherwise 'ok'
 *     (valid). belowHealthyRange is true only for an OK value whose BMI < 18.5.
 */
export function evaluateGoalWeight(
  goalWeightKg: number | null | undefined,
  heightCm: number | null | undefined,
): GoalWeightEvaluation {
  if (goalWeightKg === null || goalWeightKg === undefined || !Number.isFinite(goalWeightKg)) {
    return { isValid: false, plausibility: 'not_a_number', targetBmi: null, belowHealthyRange: false };
  }
  if (goalWeightKg <= 0) {
    return { isValid: false, plausibility: 'not_positive', targetBmi: null, belowHealthyRange: false };
  }

  const targetBmi = bmiFromKgCm(goalWeightKg, heightCm);

  // No usable height: cannot band-check. Soft pass on the positive value; no
  // healthy-range claim without a height to back it.
  if (targetBmi === null) {
    return { isValid: true, plausibility: 'no_height', targetBmi: null, belowHealthyRange: false };
  }

  if (targetBmi < GOAL_BMI_MIN) {
    return { isValid: false, plausibility: 'below_band', targetBmi, belowHealthyRange: false };
  }
  if (targetBmi > GOAL_BMI_MAX) {
    return { isValid: false, plausibility: 'above_band', targetBmi, belowHealthyRange: false };
  }

  return {
    isValid: true,
    plausibility: 'ok',
    targetBmi,
    // Strictly below the healthy lower bound. Exactly 18.5 is IN the healthy
    // range, so it does NOT trigger the note (boundary is inclusive of healthy).
    belowHealthyRange: targetBmi < HEALTHY_BMI_MIN,
  };
}
