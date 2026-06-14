// Prompt 194 Task A: the single shared calorie function.
//
// A meal's displayed calories must be a pure, deterministic function of that
// meal's stored macros, computed by THIS function, in both the text channel
// (Log a meal) and the photo channel (NutriVision), and in the Daily Macros
// rollup. Before this, calories came from USDA/Gemini independently of the
// macros, so a card could show 595 kcal next to 0 g fat (internally
// contradictory). This module is the only producer of a calorie value.
//
// Pure: no I/O, no network, no Supabase, no logging. Callers log divergences.

// Atwater coefficients (kcal per gram). Fiber contributes 0 kcal: it is
// removed from the carb pool (net carbs) rather than applied as a correction.
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

export interface MealMacros {
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

function coalesce(value: number | null): number {
  return value == null ? 0 : value;
}

/**
 * The macro-derived calorie value for a meal, using the net-carb model: fiber
 * contributes 0 kcal because it leaves the carb pool (netCarb = total carbs
 * minus fiber, clamped at 0) before the carb coefficient applies. carbsG stays
 * total carbohydrate (fiber inclusive) for storage and display; only the kcal
 * computation uses netCarb. Each macro coalesces to 0; full precision is kept
 * through the sum and rounded only at the end.
 */
export function computeMealKcal(macros: MealMacros): number {
  const netCarb = Math.max(0, coalesce(macros.carbsG) - coalesce(macros.fiberG));
  const kcal =
    KCAL_PER_G_PROTEIN * coalesce(macros.proteinG) +
    KCAL_PER_G_CARB * netCarb +
    KCAL_PER_G_FAT * coalesce(macros.fatG);
  return Math.round(kcal);
}

/**
 * True iff at least one of protein, carbs, or fat is non-null. A calories-only
 * entry (all three null) is not macro-bearing. Fiber alone does not count.
 */
export function isMacroBearing(macros: MealMacros): boolean {
  return macros.proteinG != null || macros.carbsG != null || macros.fatG != null;
}

// Rounding-only guard. A correct row's stored kcal is always produced by
// computeMealKcal, so it diverges from that same value by 0; the only
// legitimate non-zero divergence is rounding noise on legacy rows.
export const KCAL_RECONCILE_TOLERANCE = 1;

export interface MealKcalReconciliation {
  storedKcal: number;
  advisoryKcal: number | null;
  divergence: number | null;
  diverged: boolean;
}

/**
 * Compares the macro-derived calorie value (which always wins) against an
 * advisory value from USDA/Gemini. The advisory can only flag a divergence; it
 * never overrides storedKcal.
 */
export function reconcileMealKcal(
  macros: MealMacros,
  advisoryKcal: number | null,
): MealKcalReconciliation {
  const storedKcal = computeMealKcal(macros);
  const divergence = advisoryKcal == null ? null : Math.abs(advisoryKcal - storedKcal);
  const diverged = divergence != null && divergence > KCAL_RECONCILE_TOLERANCE;
  return { storedKcal, advisoryKcal, divergence, diverged };
}
