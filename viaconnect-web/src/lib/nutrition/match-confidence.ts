// Prompt 194a Task 2: the macros-vs-calories reconciliation band that gates
// user-facing source confidence on the analyze-text and analyze-photo channels.
//
// This restores the pre-194 177d/186 behavior: a meal is high-confidence only
// when its macro-derived calories agree with the advisory (stated) calories
// within 20 percent. Prompt 194 had briefly wired confidence to the 3 kcal
// engineering tripwire (kcalRecon.diverged); that guard is telemetry only and
// must never move a user-facing score. The band lives here as ONE shared
// constant so the routes and the EstimatedChip tooltip stay in lockstep.
//
// Pure module: no 'use client', no React, no server-only imports, no I/O. Both
// the server routes and a client component import it directly.

// 20 percent macros-vs-calories reconciliation band.
export const MATCH_CONFIDENCE_LOW_BAND = 0.20;

/**
 * True when macro-derived calories agree with the advisory (stated) calories
 * within the band. Pure; intentionally has NO recognition-confidence parameter,
 * so the match band cannot move with how confident the recognizer was, only
 * with whether the macros and the stated calories actually agree.
 */
export function macroCaloriesReconciled(
  derivedKcal: number,
  advisoryKcal: number | null,
  macrosKnown: boolean,
): boolean {
  if (!macrosKnown || advisoryKcal == null || advisoryKcal <= 0) return false;
  const ratio = derivedKcal / advisoryKcal;
  return ratio >= 1 - MATCH_CONFIDENCE_LOW_BAND && ratio <= 1 + MATCH_CONFIDENCE_LOW_BAND;
}

/**
 * The macro-derived / advisory calorie ratio recorded in the reconciliation
 * meta. Returns 0 when the ratio is not computable (macros unknown or the
 * advisory is missing or non-positive). Rounded to 4 decimals.
 */
export function reconciliationRatio(
  derivedKcal: number,
  advisoryKcal: number | null,
  macrosKnown: boolean,
): number {
  if (!macrosKnown || advisoryKcal == null || advisoryKcal <= 0) return 0;
  return Math.round((derivedKcal / advisoryKcal) * 10000) / 10000;
}
