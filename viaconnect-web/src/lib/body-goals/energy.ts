// Prompt 179 Sections 5.1 to 5.4: the Gordon energy engine. PURE, I/O-free.
//   * BMR: Katch-McArdle when LBM is genuinely measured, else Mifflin-St Jeor.
//   * Initial TDEE: BMR * activity multiplier.
//   * Adaptive TDEE: intake reconciled against the smoothed weight delta.
//   * Calorie solver: rate or date driven, with DD-3 floor + rate-cap clamps
//     that bend the projected date, never the calories.

import { MACRO_CONFIG } from '@/lib/gordon/macro-config';
import type { LbmResolution } from '@/lib/gordon/lbm';
import type { BiologicalSex } from '@/lib/gordon/generateMacroTargets';
import type { BmrMethod, GoalActivityLevel, GoalDriver } from './types';
import { goalActivityMultiplier } from './activity';

// KCAL_PER_LB is the tissue-energy approximation (the discredited flat
// constant). It is NOT what makes the engine accurate: the adaptive
// reconciliation against the measured smoothed weight trend is. The constant
// only converts a measured weight delta into an energy delta.
export const KCAL_PER_LB = 3500;
const ADAPTIVE_ALPHA = 0.5;
const DAY_MS = 86_400_000;
const MAINTAIN_BAND_LB = 2.2; // ~1 kg, mirrors MACRO_CONFIG.maintain_threshold_kg
const MAX_RATE_LB_PER_WEEK = 2.0;

function pos(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

// ---------------------------------------------------------------------------
// BMR + TDEE (Sections 5.1 to 5.3)
// ---------------------------------------------------------------------------

export interface ComputeBmrInput {
  lbm: LbmResolution | null;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
}
export interface BmrResult { bmr: number; method: BmrMethod; }

export function computeBmr(input: ComputeBmrInput): BmrResult | null {
  // Katch-McArdle only when LBM is genuinely MEASURED (body fat present). A
  // Boer-estimated LBM derives from the same weight/height/sex as Mifflin, so
  // it adds no accuracy; route those to Mifflin (179 Section 5.1).
  if (input.lbm && input.lbm.source === 'measured' && pos(input.lbm.lbmKg)) {
    return { bmr: 370 + 21.6 * input.lbm.lbmKg, method: 'katch_mcardle' };
  }
  if (pos(input.weightKg) && pos(input.heightCm) && pos(input.age)) {
    const sexTerm = input.sex === 'male' ? 5 : input.sex === 'female' ? -161 : -78;
    return {
      bmr: 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexTerm,
      method: 'mifflin_st_jeor',
    };
  }
  return null;
}

export function computeInitialTdee(bmr: number, activity: GoalActivityLevel | null): number {
  return bmr * goalActivityMultiplier(activity);
}

export interface AdaptiveTdeeInput {
  avgLoggedKcal: number;
  weightChangeLb: number; // EWMA endpoint delta (negative when losing)
  windowDays: number;
  priorTdee: number | null;
  alpha?: number;
}

export function estimateAdaptiveTdee(input: AdaptiveTdeeInput): number {
  const raw = input.avgLoggedKcal - (input.weightChangeLb * KCAL_PER_LB) / input.windowDays;
  const alpha = input.alpha ?? ADAPTIVE_ALPHA;
  const blended = input.priorTdee === null ? raw : alpha * raw + (1 - alpha) * input.priorTdee;
  return Math.round(blended);
}

// ---------------------------------------------------------------------------
// Calorie solver (Section 5.4 + Section 8 safety)
// ---------------------------------------------------------------------------

export type SolverClamp = 'rate_cap' | 'calorie_floor';
export type SolverDirection = 'lose' | 'gain' | 'maintain';

export interface SolveCalorieTargetInput {
  tdee: number;
  driver: GoalDriver;
  targetRateLbPerWeek: number | null;
  targetDate: string | null;
  startWeightLb: number;
  goalWeightLb: number;
  startDate: string;
  sex: BiologicalSex;
  currentWeightLb: number;
}
export interface SolveCalorieTargetResult {
  calorieTargetKcal: number;
  effectiveRateLbPerWeek: number;
  direction: SolverDirection;
  projectedDate: string | null;
  clamps: SolverClamp[];
}

function diffDays(from: string, to: string): number {
  return (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS;
}
function addDays(from: string, days: number): string {
  return new Date(new Date(`${from}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function solveCalorieTarget(input: SolveCalorieTargetInput): SolveCalorieTargetResult {
  const clamps: SolverClamp[] = [];
  const deltaLb = input.startWeightLb - input.goalWeightLb; // >0 lose, <0 gain
  const direction: SolverDirection =
    Math.abs(deltaLb) <= MAINTAIN_BAND_LB ? 'maintain' : deltaLb > 0 ? 'lose' : 'gain';

  const floor =
    input.sex === 'male' ? MACRO_CONFIG.calorie_floor_male : MACRO_CONFIG.calorie_floor_female;

  if (direction === 'maintain') {
    return {
      calorieTargetKcal: Math.round(input.tdee),
      effectiveRateLbPerWeek: 0,
      direction,
      projectedDate: null,
      clamps,
    };
  }

  // Desired magnitude of the weekly rate.
  let rate: number;
  if (input.driver === 'rate') {
    rate = Math.abs(input.targetRateLbPerWeek ?? 0);
  } else {
    const weeks = Math.max(1 / 7, diffDays(input.startDate, input.targetDate ?? input.startDate) / 7);
    rate = Math.abs(deltaLb) / weeks;
  }

  // DD-3 rate cap: lesser of 2.0 lb/wk and 1% of current body weight per week.
  const rateCap = Math.min(MAX_RATE_LB_PER_WEEK, 0.01 * input.currentWeightLb);
  if (rate > rateCap) {
    rate = rateCap;
    clamps.push('rate_cap');
  }

  const dailyDelta = (rate * KCAL_PER_LB) / 7;
  let target = direction === 'lose' ? input.tdee - dailyDelta : input.tdee + dailyDelta;

  // DD-3 floor: never below the floor; bend the date instead.
  if (target < floor) {
    target = floor;
    clamps.push('calorie_floor');
  }
  target = Math.round(target);

  // Effective (post-clamp) achievable rate, from the realized deficit/surplus.
  const realizedDailyDelta = Math.abs(input.tdee - target);
  const effectiveRate = (realizedDailyDelta * 7) / KCAL_PER_LB;
  const projectedDate =
    effectiveRate > 0 ? addDays(input.startDate, (Math.abs(deltaLb) / effectiveRate) * 7) : null;

  return {
    calorieTargetKcal: target,
    effectiveRateLbPerWeek: Math.round(effectiveRate * 100) / 100,
    direction,
    projectedDate,
    clamps,
  };
}
