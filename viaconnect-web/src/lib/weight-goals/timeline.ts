// =============================================================================
// Prompt 173 Phase 7 (rebuild on main 2026-06-03): rate-capped timeline
// projection for the Body Tracker goal card. PURE, I/O-free.
//
// Given a current weight, a goal weight, and the engine's implied weekly rate
// of change (kg/week), compute the number of weeks to reach the goal capped
// at MACRO_CONFIG.weekly_rate_cap_pct of current body weight per week.
//
// The cap matches the engine (generateMacroTargets) so the timeline never
// implies a faster trajectory than the macros support. If the user is
// already at goal (within MACRO_CONFIG.maintain_threshold_kg) the
// projection returns "at goal" rather than zero weeks. If the rate is
// effectively zero or the direction contradicts the goal, the projection
// returns null so the UI hides the card rather than showing nonsense.
// =============================================================================

import { MACRO_CONFIG } from '@/lib/gordon/macro-config';

export interface TimelineProjection {
  // Weeks remaining (integer, rounded up so partial weeks read as full).
  // Always >= 1 when set.
  weeksToGoal: number;
  // True when the engine's implied rate is HIGHER than the configured cap
  // and the projection had to be slowed to the cap. The UI surfaces a
  // small note explaining that the timeline reflects the safety cap.
  rateWasCapped: boolean;
  // The rate used for the projection (kg/week). When rateWasCapped this is
  // the cap, not the engine's higher value.
  effectiveRateKgPerWeek: number;
  // Goal direction the projection assumes (derived from current vs goal).
  direction: 'lose' | 'gain';
}

export type ProjectionResult =
  | { kind: 'at_goal' }
  | { kind: 'projection'; data: TimelineProjection }
  | { kind: 'unavailable'; reason: 'missing_inputs' | 'rate_too_small' | 'direction_mismatch' };

export function projectWeeksToGoal(
  currentWeightKg: number | null,
  goalWeightKg: number | null,
  weeklyRateKg: number | null,
): ProjectionResult {
  if (
    currentWeightKg === null || !Number.isFinite(currentWeightKg) || currentWeightKg <= 0 ||
    goalWeightKg === null || !Number.isFinite(goalWeightKg) || goalWeightKg <= 0 ||
    weeklyRateKg === null || !Number.isFinite(weeklyRateKg)
  ) {
    return { kind: 'unavailable', reason: 'missing_inputs' };
  }

  const delta = goalWeightKg - currentWeightKg;

  // Inside the maintain band: already at goal.
  if (Math.abs(delta) <= MACRO_CONFIG.maintain_threshold_kg) {
    return { kind: 'at_goal' };
  }

  const targetDirection: 'lose' | 'gain' = delta < 0 ? 'lose' : 'gain';

  // The engine emits weeklyRateKg as an absolute magnitude. If it is
  // effectively zero (Maintain target) we cannot project; the UI hides the
  // card and just shows the goal line on the chart.
  if (weeklyRateKg <= 0.001) {
    return { kind: 'unavailable', reason: 'rate_too_small' };
  }

  // Cap the rate at MACRO_CONFIG.weekly_rate_cap_pct of CURRENT body weight
  // per week. Mirrors the engine's weeklyRateExceedsCap calculation.
  const cap = currentWeightKg * MACRO_CONFIG.weekly_rate_cap_pct;
  const rateWasCapped = weeklyRateKg > cap;
  const effectiveRateKgPerWeek = rateWasCapped ? cap : weeklyRateKg;

  const weeks = Math.ceil(Math.abs(delta) / effectiveRateKgPerWeek);

  return {
    kind: 'projection',
    data: {
      weeksToGoal: Math.max(1, weeks),
      rateWasCapped,
      effectiveRateKgPerWeek,
      direction: targetDirection,
    },
  };
}
