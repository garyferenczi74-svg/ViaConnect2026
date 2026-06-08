// Prompt 179: shared Body Goals types. App-level camelCase; DB rows snake_case.

import type { BiologicalSex } from '@/lib/gordon/generateMacroTargets';

export type GoalDriver = 'date' | 'rate';
export type GoalActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned';
export type TargetSource = 'initial_plan' | 'weekly_recalibration' | 'manual_override' | 'revert';
export type BmrMethod = 'katch_mcardle' | 'mifflin_st_jeor';
// Prompt 179a: where a goal write originated, and the onboarding pace preset.
export type GoalOrigin = 'caq' | 'goals_tab' | 'weight_card' | 'caq_backfill';
export type PacePreset = 'gentle' | 'steady' | 'ambitious' | 'custom_date';

export interface BodyGoalRow {
  id: string;
  user_id: string;
  status: GoalStatus;
  driver: GoalDriver;
  start_weight_lb: number;
  goal_weight_lb: number;
  goal_bodyfat_pct: number | null;
  start_date: string;
  target_date: string | null;
  target_rate_lb_per_week: number | null;
  sex: BiologicalSex | null;
  age_years: number | null;
  height_in: number | null;
  activity_level: GoalActivityLevel | null;
  // Prompt 179a additions.
  origin: GoalOrigin | null;
  target_pace_preset: PacePreset | null;
  needs_resync: boolean;
  legacy_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BodyGoalTargetRow {
  id: string;
  goal_id: string;
  user_id: string;
  effective_date: string;
  source: TargetSource;
  estimated_tdee_kcal: number | null;
  calorie_target_kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  fiber_g: number;
  added_sugar_limit_g: number | null;
  hydration_ml: number | null;
  rationale: Record<string, unknown> | null;
  computed_at: string;
}

export interface BuiltGoalTarget {
  effectiveDate: string;
  source: TargetSource;
  estimatedTdeeKcal: number | null;
  calorieTargetKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  fiberG: number;
  addedSugarLimitG: number;
  hydrationMl: number;
  rationale: Record<string, unknown>;
  projectedDate: string | null;
}
