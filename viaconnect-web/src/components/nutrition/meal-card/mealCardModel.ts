// Prompt 172 Phase 1B: MealDraft + SaveResponse -> MealCardModel mapper.
//
// Pure function. No React, no DOM, no fetch, no Supabase. The orchestrator
// (AnalysisResult.tsx) calls toMealCardModel at the boundary and passes the
// result to the presentational MealCard. Pre save the orchestrator omits
// saveResponse; post save it threads SaveResponse through onSaveResponse
// and the next render carries the post save shape.
//
// Pre save  -> mealId null,  mealQualityScore null
// Post save -> mealId = SaveResponse.meal_id,
//              mealQualityScore = SaveResponse.gordon.quality_score
// safety   -> when safetyMode is true, per item kcal is suppressed to null
//              and macro chip rendering flips to ratios (170c section 8.4).
//              The model also clears mealQualityScore so the post save score
//              chip never renders for safety mode users even if the
//              orchestrator forgets to gate.
// bosLine  -> null in 1B; 172b wires the resolver.
// portion  -> built from 171b portion_display_unit + portion_display_value
//              when both are present; grams fallback when missing.
// degraded -> degradedServiceKind defaults to 'none'; when the upstream
//              pipeline (nutrition_photo_jobs phantom column) lands the
//              real kind, the orchestrator passes it through.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type {
  MealDraft,
  MealItemDraft,
  SaveResponse,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type {
  DegradedServiceKind,
  MealCardItem,
  MealCardModel,
  MealCardSource,
  MealMacros,
} from './MealCard.types';

export interface ToMealCardModelInput {
  draft: MealDraft;
  saveResponse?: SaveResponse;
  photoUrl: string | null;
  safetyMode: boolean;
  degradedService: boolean;
  recognitionConfidence: 'high' | 'medium' | 'low';
  /** Optional override for the source tag; defaults to 'photo' for now. */
  source?: MealCardSource;
  /** Optional override for the analyze kind; defaults to the legacy 'meal_analysis'. */
  analyzeKind?: string;
  /** Optional override for the title; defaults to the canonical microcopy. */
  title?: string;
  /**
   * Optional override for the degraded service kind. Defaults to 'none' so
   * downstream callers that have not adopted the 170c phantom column yet
   * still type check.
   */
  degradedServiceKind?: DegradedServiceKind;
}

function buildPortionLabel(item: MealItemDraft): string {
  if (
    typeof item.portion_display_value === 'number' &&
    typeof item.portion_display_unit === 'string' &&
    item.portion_display_unit.length > 0
  ) {
    return `${item.portion_display_value} ${item.portion_display_unit}`;
  }
  return `${item.portion_grams} g`;
}

function toItem(item: MealItemDraft, safetyMode: boolean): MealCardItem {
  return {
    id: item.id,
    name: item.food_name,
    portionLabel: buildPortionLabel(item),
    // 170c section 8.4: safety mode suppresses per item kcal. The model
    // honors this at the mapping layer so the component double check is
    // belt + suspenders rather than the source of truth.
    kcal: safetyMode
      ? null
      : typeof item.calories_kcal === 'number'
        ? Math.round(item.calories_kcal)
        : null,
    confidence:
      typeof item.recognition_confidence === 'number'
        ? item.recognition_confidence
        : 0,
  };
}

// Prompt 177g (2026-06-07): item-level known-nutrient check for fiber +
// sugar. Returns true when at least one item in the meal carries a
// numeric value for the field. When false the totals roll-up has no
// honest signal to display and the macro chip renders a dash per the
// 177d unknown-vs-zero contract.
function anyItemHas(
  draft: MealDraft,
  field: 'fiber_g' | 'sugar_g',
): boolean {
  for (const it of draft.items) {
    if (typeof it[field] === 'number') return true;
  }
  return false;
}

function deriveMacros(draft: MealDraft): MealMacros {
  const { calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g } = draft.totals;
  const sum = protein_g + carbs_g + fat_g;
  const proteinPct = sum > 0 ? Math.round((protein_g / sum) * 100) : 0;
  const carbsPct = sum > 0 ? Math.round((carbs_g / sum) * 100) : 0;
  const fatsPct = sum > 0 ? Math.round((fat_g / sum) * 100) : 0;
  return {
    kcal: calories_kcal,
    proteinG: protein_g,
    carbsG: carbs_g,
    fatsG: fat_g,
    fiberG: anyItemHas(draft, 'fiber_g') ? fiber_g : null,
    sugarG: anyItemHas(draft, 'sugar_g') ? sugar_g : null,
    proteinPct,
    carbsPct,
    fatsPct,
  };
}

export function toMealCardModel(input: ToMealCardModelInput): MealCardModel {
  const { draft, saveResponse, photoUrl, safetyMode, degradedService, recognitionConfidence } = input;
  return {
    mealId: saveResponse ? saveResponse.meal_id : null,
    title: input.title ?? 'Meal totals',
    items: draft.items.map((item) => toItem(item, safetyMode)),
    macros: deriveMacros(draft),
    // Safety mode hides the quality score per 170c section 8.4 regardless of
    // whether the orchestrator threads it through. The component layer also
    // gates rendering on safetyMode; this is the second line of defense.
    mealQualityScore:
      saveResponse && !safetyMode ? saveResponse.gordon.quality_score : null,
    source: input.source ?? 'photo',
    analyzeKind: input.analyzeKind ?? 'meal_analysis',
    photoUrl,
    recognitionConfidence,
    degradedService,
    degradedServiceKind: input.degradedServiceKind ?? 'none',
    safetyMode,
    // 172b wires the BOS line resolver. Always null in 1B.
    bosLine: null,
  };
}
