/**
 * Prompt 170o Phase 1 Phase B: target personalization.
 *
 * Default formula per spec §4.1: body_weight_kg * 33.
 * Fallback 1890 ml (64 oz) when body weight absent per §4.1.
 * Activity multiplier per §4.2, climate per §4.3, pregnancy/lactation §4.5.
 * Custom override per §4.4 supersedes all computed adjustments.
 *
 * Activity multiplier per pre-build issue #4: defaults to 1.0x (sedentary)
 * if the Activity tracking surface lacks a sufficient API for today's
 * activity-minutes lookup. Phase 1.1 supplement wires the real multiplier
 * once the Activity surface is verified.
 */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'intense';
export type ClimateLevel = 'cool' | 'moderate' | 'warm' | 'hot';

export interface PersonalizeTargetArgs {
  body_weight_kg: number | null;
  custom_target_ml_per_day: number | null;
  activity_level?: ActivityLevel;
  climate_level?: ClimateLevel;
  pregnant?: boolean;
  lactating?: boolean;
}

const FALLBACK_TARGET_ML = 1890;
const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.0,
  light: 1.1,
  moderate: 1.2,
  intense: 1.4,
};
const CLIMATE_MULTIPLIER: Record<ClimateLevel, number> = {
  cool: 1.0,
  moderate: 1.0,
  warm: 1.1,
  hot: 1.2,
};
const PREGNANCY_BONUS_ML = 300;
const LACTATION_BONUS_ML = 700;

export function personalizeHydrationTarget(args: PersonalizeTargetArgs): number {
  if (typeof args.custom_target_ml_per_day === 'number' && args.custom_target_ml_per_day > 0) {
    return Math.round(args.custom_target_ml_per_day);
  }
  const baseTarget = typeof args.body_weight_kg === 'number' && args.body_weight_kg > 0
    ? args.body_weight_kg * 33
    : FALLBACK_TARGET_ML;
  const activityMul = ACTIVITY_MULTIPLIER[args.activity_level ?? 'sedentary'];
  const climateMul = CLIMATE_MULTIPLIER[args.climate_level ?? 'moderate'];
  const pregnancyBonus = args.pregnant ? PREGNANCY_BONUS_ML : 0;
  const lactationBonus = args.lactating ? LACTATION_BONUS_ML : 0;
  const computed = baseTarget * activityMul * climateMul + pregnancyBonus + lactationBonus;
  return Math.round(computed);
}
