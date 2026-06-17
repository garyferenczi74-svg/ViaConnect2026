// Prompt 203 (2026-06-17): how the meal-result card frames its confidence.
//
// The text and photo-AI analyze paths derive analysis.confidence as the USDA
// MATCH RATE (aggregate.ts: usdaCount / total), NOT a measure of how good the
// estimate is. A meal whose foods simply are not in USDA (branded, restaurant,
// or whole foods USDA indexes poorly) therefore scored "Low confidence" even
// when the numbers were sound. Gary 2026-06-17: that match rate is meaningless
// to a member, so a low-match meal now reads as "Estimated", and the alarming
// red "review" state is reserved for a GENUINE quality concern: a portion
// default or plausibility-flagged item (Prompt 186 -> nutrient_flags.downgraded).
import type { NutritionAnalysis } from '@/lib/nutrition/schema';

export type MealConfidenceTone = 'high' | 'estimated' | 'low';

export function resolveMealConfidenceTone(
  analysis: Pick<NutritionAnalysis, 'data_source' | 'nutrient_flags'>,
): MealConfidenceTone {
  const flags = analysis.nutrient_flags;
  // A real quality downgrade is the ONLY thing that warrants the red state.
  if (flags?.downgraded === true) return 'low';
  const hasUnknowns =
    (flags?.unknown?.length ?? 0) > 0 || (flags?.partial?.length ?? 0) > 0;
  // A clean, fully USDA-matched meal is the only "high"; everything else is an
  // honest estimate, never a low-confidence alarm.
  if (analysis.data_source === 'usda' && !hasUnknowns) return 'high';
  return 'estimated';
}
