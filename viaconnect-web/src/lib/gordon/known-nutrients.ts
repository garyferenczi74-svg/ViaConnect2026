// Prompt 177d Phase D (2026-06-07): daily-aggregate honesty helpers.
//
// Reads the known_nutrients map off a meal's score_breakdown so
// per-day aggregators can skip a meal's contribution for any nutrient
// the originating channel could not determine, rather than counting
// it as 0 and showing a fictitious shortfall.
//
// Source of truth on a meal row:
//   score_breakdown.prompt_177d_meta.known_nutrients (set by analyze-text on save)
//   score_breakdown.prompt_177d_repair.known_nutrients (set on the
//     2026-06-07 historical repair pass for the 5 legacy full_manual rows)
//
// Missing or absent => every nutrient is treated as known, preserving
// the pre-177d behavior for Photo AI, Quick Log, and Connected Apps.

import type { KnownNutrients, Meal } from './types';

/**
 * Returns the channel-supplied known_nutrients map for a meal, or null
 * when no map is present (treat every nutrient as known).
 */
export function getKnownNutrients(meal: Meal): KnownNutrients | null {
  const sb = meal.scoreBreakdown as
    | {
        prompt_177d_meta?: { known_nutrients?: KnownNutrients };
        prompt_177d_repair?: { known_nutrients?: KnownNutrients };
      }
    | null
    | undefined;
  if (!sb) return null;
  return sb.prompt_177d_meta?.known_nutrients ?? sb.prompt_177d_repair?.known_nutrients ?? null;
}

/**
 * Returns true when the meal's known_nutrients map says the given key
 * is determinable, or when no map is attached (legacy callers + non-text
 * channels).
 */
export function isMealNutrientKnown(meal: Meal, key: keyof KnownNutrients): boolean {
  const map = getKnownNutrients(meal);
  if (!map) return true;
  const v = map[key];
  return v !== false;
}
