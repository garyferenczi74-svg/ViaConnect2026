// Prompt 179a: map the CAQ Weight Goals pace preset to the body_goals driver.
// PURE. Gentle 0.5, Steady 1.0, Ambitious 1.5 lb/week (rate driven); the
// "Pick a target date" preset is date driven. A maintain goal (start and goal
// within the maintain band) stores driver rate with rate 0 and shows no pace.

import type { GoalDriver, PacePreset } from './types';

const PRESET_RATE_LB_PER_WEEK: Record<'gentle' | 'steady' | 'ambitious', number> = {
  gentle: 0.5,
  steady: 1.0,
  ambitious: 1.5,
};

// ~1 kg, matches the engine and the macro-config maintain band.
const MAINTAIN_BAND_LB = 2.2;

export function presetRateLbPerWeek(preset: 'gentle' | 'steady' | 'ambitious'): number {
  return PRESET_RATE_LB_PER_WEEK[preset];
}

export interface CaqGoalDriverInput {
  currentWeightLb: number;
  goalWeightLb: number;
  pace: PacePreset;
  targetDate: string | null;
}

export interface CaqGoalDriverResult {
  driver: GoalDriver;
  targetRateLbPerWeek: number | null;
  targetDate: string | null;
  pacePreset: PacePreset;
  isMaintain: boolean;
}

/**
 * Resolve the body_goals driver fields from the CAQ pace capture. Defaults a
 * missing or custom-date-without-a-date selection to Steady so the goal is
 * always persistable.
 */
export function resolveCaqGoalDriver(input: CaqGoalDriverInput): CaqGoalDriverResult {
  const deltaLb = Math.abs(input.currentWeightLb - input.goalWeightLb);
  if (deltaLb <= MAINTAIN_BAND_LB) {
    return {
      driver: 'rate',
      targetRateLbPerWeek: 0,
      targetDate: null,
      pacePreset: 'steady',
      isMaintain: true,
    };
  }

  if (input.pace === 'custom_date' && input.targetDate) {
    return {
      driver: 'date',
      targetRateLbPerWeek: null,
      targetDate: input.targetDate,
      pacePreset: 'custom_date',
      isMaintain: false,
    };
  }

  // Rate driven (gentle / steady / ambitious, or custom_date with no date set).
  const preset: 'gentle' | 'steady' | 'ambitious' =
    input.pace === 'gentle' || input.pace === 'ambitious' ? input.pace : 'steady';
  return {
    driver: 'rate',
    targetRateLbPerWeek: PRESET_RATE_LB_PER_WEEK[preset],
    targetDate: null,
    pacePreset: preset,
    isMaintain: false,
  };
}
