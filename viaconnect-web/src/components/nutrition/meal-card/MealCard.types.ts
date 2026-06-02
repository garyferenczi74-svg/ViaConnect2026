// Prompt 172 Phase 1A: MealCard view model types.
//
// These types normalize the production MealDraft (pre save) and
// SaveResponse.gordon (post save) into the thin view model the MealCard
// presentational component consumes. Source of truth for the upstream shapes
// is src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts.
//
// Spec inheritance: 172 section 5.2 v3. Pre save renders a MealDraft with
// mealId null + mealQualityScore null; post save the orchestrator hands a
// SaveResponse to the mapper and the view model carries meal_id +
// gordon.quality_score.
//
// The BosLine type lives at @/lib/nutrition/bos-line/types and is owned by
// 172b; we re-export it here as BosLine | null so the model surface stays
// stable across the 172 series.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { BosLine } from '@/lib/nutrition/bos-line/types';

export type MealCardSource =
  | 'photo'
  | 'multi_photo'
  | 'restaurant'
  | 'recipe_match'
  | 'barcode'
  | 'voice_edit'
  | 'quicklog_text'
  | 'manual'
  | 'receipt'
  | 'photo_library';

export interface MealCardItem {
  /** Stable identifier from MealItemDraft.id. */
  id: string;
  /** Specific food name from recognition (MealItemDraft.food_name). */
  name: string;
  /**
   * Portion label built from 171b portion_display_unit and
   * portion_display_value when both are present; falls back to grams.
   */
  portionLabel: string;
  /** Per item kcal; null when split is off or safety mode hides it. */
  kcal: number | null;
  /** 0 to 1 normalized confidence from MealItemDraft.recognition_confidence. */
  confidence: number;
}

export interface MealMacros {
  /** Absolute kcal. Suppressed in safety mode rendering (170c 8.4). */
  kcal: number;
  /** Absolute grams; absolute values suppressed in safety mode. */
  proteinG: number;
  carbsG: number;
  fatsG: number;
  /**
   * Composition percent splits, derived from the macro grams. Used by the
   * safety mode ratio variant in 1B; included on every model so the future
   * variant has a single read path.
   */
  proteinPct: number;
  carbsPct: number;
  fatsPct: number;
}

export interface MealCardModel {
  /** Null pre save; populated from SaveResponse.meal_id post save. */
  mealId: string | null;
  /** Heading shown above the macro chip row (Meal totals in 1A). */
  title: string;
  /** Items in stable order (matches draft.items order). */
  items: ReadonlyArray<MealCardItem>;
  /** Computed macros + composition splits. */
  macros: MealMacros;
  /**
   * Null pre save; populated from SaveResponse.gordon.quality_score post
   * save. Hidden when safetyMode is true (170c 8.4).
   */
  mealQualityScore: number | null;
  /** Origin of the meal (photo, barcode, manual, etc). */
  source: MealCardSource;
  /** The existing analyze_kind enum value from the upstream job model. */
  analyzeKind: string;
  /** 171a signed url for the source photo; null when no photo or expired. */
  photoUrl: string | null;
  /** Banded confidence the orchestrator passes down. */
  recognitionConfidence: 'high' | 'medium' | 'low';
  /** True when the 170c degraded service signal is present. */
  degradedService: boolean;
  /** Read from useSafetyMode at the orchestrator boundary. */
  safetyMode: boolean;
  /**
   * BOS line resolved by 172b via /api/nutrition/bos-line/[mealId]. Always
   * null in 1A; 172b wires the resolver and post save retrieval.
   */
  bosLine: BosLine | null;
}

/** Re-exported so downstream consumers can import a single boundary. */
export type { BosLine };
