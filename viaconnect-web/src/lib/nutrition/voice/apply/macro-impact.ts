/**
 * Cumulative macro impact computation for the Voice operation preview per §11.4.
 *
 * Pure function: aggregates the NLU's per-operation macro_impact_estimate values
 * into a single delta the §11.4 cumulative impact chip can display.
 *
 * Does NOT simulate operations against the meal draft. The NLU provides
 * per-op estimates from its own knowledge of food macros; this layer trusts
 * those estimates for the preview display. Truth is settled at apply time
 * by the existing recalcItem path in useMealItemEdits.
 */

import type { VoiceOperation } from '../types';

export interface CumulativeImpact {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

const ZERO_IMPACT: CumulativeImpact = {
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundInt(n: number): number {
  return Math.round(n);
}

export function computeCumulativeImpact(
  operations: VoiceOperation[]
): CumulativeImpact {
  const acc = { ...ZERO_IMPACT };
  for (const op of operations) {
    const est = op.macro_impact_estimate;
    if (!est) continue;
    acc.calories_kcal += est.calories_kcal ?? 0;
    acc.protein_g += est.protein_g ?? 0;
    acc.carbs_g += est.carbs_g ?? 0;
    acc.fat_g += est.fat_g ?? 0;
    acc.fiber_g += est.fiber_g ?? 0;
    acc.sugar_g += est.sugar_g ?? 0;
    acc.sodium_mg += est.sodium_mg ?? 0;
  }
  return {
    calories_kcal: roundInt(acc.calories_kcal),
    protein_g: round1(acc.protein_g),
    carbs_g: round1(acc.carbs_g),
    fat_g: round1(acc.fat_g),
    fiber_g: round1(acc.fiber_g),
    sugar_g: round1(acc.sugar_g),
    sodium_mg: round1(acc.sodium_mg),
  };
}

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/**
 * Compact preview string for the §11.4 cumulative impact chip.
 * Returns only macro families with non-zero impact; "No macro change"
 * when all are zero (e.g., remove_modifier on grilled which is state).
 */
export function formatImpactPreview(impact: CumulativeImpact): string {
  const parts: string[] = [];
  if (impact.calories_kcal !== 0) parts.push(`${formatSigned(impact.calories_kcal)} kcal`);
  if (impact.protein_g !== 0) parts.push(`P ${formatSigned(impact.protein_g)}g`);
  if (impact.carbs_g !== 0) parts.push(`C ${formatSigned(impact.carbs_g)}g`);
  if (impact.fat_g !== 0) parts.push(`F ${formatSigned(impact.fat_g)}g`);
  return parts.length > 0 ? parts.join(', ') : 'No macro change';
}

/**
 * Plausibility check per §6.4. Flags implausibly large single-op impacts
 * so the §11.4 preview can render an Orange warning border with a
 * "Confirm this is correct" affordance.
 */
export function isImplausibleImpact(impact: CumulativeImpact): boolean {
  return (
    Math.abs(impact.calories_kcal) >= 3000 ||
    Math.abs(impact.protein_g) >= 200 ||
    Math.abs(impact.carbs_g) >= 400 ||
    Math.abs(impact.fat_g) >= 200
  );
}
