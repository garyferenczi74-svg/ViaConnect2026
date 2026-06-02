// Prompt 172 Phase 1A: MealDraft + SaveResponse -> MealCardModel mapper.
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
// bosLine   -> null in 1A; 172b wires the resolver.
// portion   -> built from 171b portion_display_unit + portion_display_value
//              when both are present; grams fallback when missing.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type {
  MealDraft,
  MealItemDraft,
  SaveResponse,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type {
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
  /** Optional override for the title; defaults to the pre refactor 'Meal totals' copy. */
  title?: string;
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

function toItem(item: MealItemDraft): MealCardItem {
  return {
    id: item.id,
    name: item.food_name,
    portionLabel: buildPortionLabel(item),
    kcal:
      typeof item.calories_kcal === 'number'
        ? Math.round(item.calories_kcal)
        : null,
    confidence:
      typeof item.recognition_confidence === 'number'
        ? item.recognition_confidence
        : 0,
  };
}

function deriveMacros(draft: MealDraft): MealMacros {
  const { calories_kcal, protein_g, carbs_g, fat_g } = draft.totals;
  const sum = protein_g + carbs_g + fat_g;
  const proteinPct = sum > 0 ? Math.round((protein_g / sum) * 100) : 0;
  const carbsPct = sum > 0 ? Math.round((carbs_g / sum) * 100) : 0;
  const fatsPct = sum > 0 ? Math.round((fat_g / sum) * 100) : 0;
  return {
    kcal: calories_kcal,
    proteinG: protein_g,
    carbsG: carbs_g,
    fatsG: fat_g,
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
    items: draft.items.map(toItem),
    macros: deriveMacros(draft),
    mealQualityScore: saveResponse ? saveResponse.gordon.quality_score : null,
    source: input.source ?? 'photo',
    analyzeKind: input.analyzeKind ?? 'meal_analysis',
    photoUrl,
    recognitionConfidence,
    degradedService,
    safetyMode,
    // 172b wires the BOS line resolver. Always null in 1A.
    bosLine: null,
  };
}
