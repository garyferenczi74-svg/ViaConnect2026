// Prompt 172e Phase B: hydration picker microcopy types.
//
// Parallel to src/lib/nutrition/microcopy/types.ts (172a meal card layer) but
// scoped to the hydration beverage section engine so the meal card key set
// stays clean. Every user facing literal in the picker UI consumes a key from
// HydrationMicrocopyKey via getHydrationMicrocopy().
//
// Variant axis follows 170c section 8.4: normal vs safety_mode. Most picker
// strings are identical across both variants because the spec 8 carve outs
// are about NOT displaying certain numbers (kcal, sugar, caffeine, ABV, drink
// counts), not about variant copy. Where copy does drift the safety_mode
// variant stays food positive per 170c section 8.4.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

export type HydrationMicrocopyVariant = 'normal' | 'safety_mode';

/**
 * Every microcopy key the BeveragePicker surface renders. The union is
 * exhaustive so the build time clinical claim lint sweep can enumerate it
 * (see HYDRATION_MICROCOPY_KEYS in ./index).
 */
export type HydrationMicrocopyKey =
  // Picker frame.
  | 'picker.title'
  | 'picker.search_placeholder'
  | 'picker.favorites_label'
  | 'picker.recents_label'
  | 'picker.no_recents'
  | 'picker.no_favorites_yet'
  | 'picker.empty_search'
  // Category labels (9 categories per spec section 4 + section 10).
  | 'category.water.label'
  | 'category.coffee.label'
  | 'category.tea.label'
  | 'category.juice.label'
  | 'category.pop.label'
  | 'category.sports_energy.label'
  | 'category.milk.label'
  | 'category.functional.label'
  | 'category.alcohol.label'
  // Volume picker.
  | 'volume.title'
  | 'volume.default_label'
  | 'volume.yours_label'
  | 'volume.decrement_label'
  | 'volume.increment_label'
  // Actions.
  | 'action.log'
  | 'action.logging'
  | 'action.back_to_categories'
  | 'action.back_to_beverages'
  | 'action.clear_search'
  // Error and loading.
  | 'error.fetch_failed'
  | 'state.loading_catalog'
  // Phase C: alcohol diuretic threshold note (spec 5.3 + 8.4).
  // Surfaces a short factual note when the user has logged alcohol above
  // the daily threshold. Normal carries a {count} placeholder for the
  // current day drink count; safety_mode strips both the count and the
  // threshold framing per 170c silent UX. The string never names the
  // threshold value itself to avoid implying medical advice.
  | 'hydration.alcohol.diuretic.threshold_note'
  // Phase D: breakdown section (spec 10).
  // Header line + per category label phrasing. Normal renders the
  // absolute ml + effective ml; safety_mode strips ml and renders
  // composition only per 170c section 8.
  | 'hydration.breakdown.title'
  | 'hydration.breakdown.gross_label'
  | 'hydration.breakdown.effective_label'
  | 'hydration.breakdown.empty_today'
  // Phase D: electrolyte summary (spec 10).
  // Normal interpolates {sodium}, {potassium}, {magnesium}; safety_mode
  // strips the numbers and renders a qualitative one liner per 170c
  // section 8.
  | 'hydration.electrolytes.summary'
  | 'hydration.electrolytes.label'
  // Phase D: caffeine overlay (spec 10).
  // Header label for the overlay. Overlay itself is hidden in safety
  // mode; keys still need a safety_mode variant for lint completeness.
  | 'hydration.caffeine_overlay.label'
  | 'hydration.caffeine_overlay.sleep_indicator_label';

export interface HydrationMicrocopyEntry {
  normal: string;
  safety_mode: string;
}

export type HydrationMicrocopyMap = Record<HydrationMicrocopyKey, HydrationMicrocopyEntry>;
