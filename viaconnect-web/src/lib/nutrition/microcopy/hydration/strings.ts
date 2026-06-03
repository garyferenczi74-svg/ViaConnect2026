// Prompt 172e Phase B: canonical hydration picker microcopy.
//
// Voice: neutral, factual, food positive. The picker describes beverages and
// volumes; it never coaches, never moralizes, never characterizes a beverage.
// All clinical or claim characterizations live one layer below in the catalog
// row metadata that Kelsey gates via requires_claim_review (catalog labels
// and insight templates are reviewed separately at the Marshall scanner).
//
// Safety mode variants per 170c section 8.4: identical for all picker
// chrome (titles, labels, actions) because the carve out is about hiding
// numbers (kcal, sugar, caffeine, ABV, drink counts) in the BeverageList
// row and VolumePicker, not about variant copy. The single drift case is
// the recents label, where safety mode drops the "Today" anchor since
// streak framing is suppressed; the label stays "Recent" which reads the
// same to the user without time framing.
//
// Hannah review: clinical framing on labels.
// Kelsey review: regulatory framing on labels.
//
// Hard rules honored: no em or en dashes, no emojis, no any. Use commas
// or middle dot (·) for dual line copy.

import type { HydrationMicrocopyMap } from './types';

export const HYDRATION_MICROCOPY_STRINGS: HydrationMicrocopyMap = {
  // Picker frame.
  'picker.title': {
    normal: 'Log a Beverage',
    safety_mode: 'Log a Beverage',
  },
  'picker.search_placeholder': {
    normal: 'Search beverages',
    safety_mode: 'Search beverages',
  },
  'picker.favorites_label': {
    normal: 'Favorites',
    safety_mode: 'Favorites',
  },
  'picker.recents_label': {
    normal: 'Recent',
    safety_mode: 'Recent',
  },
  'picker.no_recents': {
    normal: 'Nothing logged yet today.',
    safety_mode: 'Nothing logged yet today.',
  },
  'picker.no_favorites_yet': {
    normal: 'What you reach for most will show up here.',
    safety_mode: 'What you reach for most will show up here.',
  },
  'picker.empty_search': {
    normal: 'No beverages match that search.',
    safety_mode: 'No beverages match that search.',
  },

  // Category labels.
  'category.water.label': {
    normal: 'Water',
    safety_mode: 'Water',
  },
  'category.coffee.label': {
    normal: 'Coffee',
    safety_mode: 'Coffee',
  },
  'category.tea.label': {
    normal: 'Tea',
    safety_mode: 'Tea',
  },
  'category.juice.label': {
    normal: 'Juice',
    safety_mode: 'Juice',
  },
  'category.pop.label': {
    normal: 'Pop',
    safety_mode: 'Pop',
  },
  'category.sports_energy.label': {
    normal: 'Sports and Energy',
    safety_mode: 'Sports and Energy',
  },
  'category.milk.label': {
    normal: 'Milk',
    safety_mode: 'Milk',
  },
  'category.functional.label': {
    normal: 'Functional',
    safety_mode: 'Functional',
  },
  'category.alcohol.label': {
    normal: 'Alcohol',
    safety_mode: 'Alcohol',
  },

  // Volume picker.
  'volume.title': {
    normal: 'How much?',
    safety_mode: 'How much?',
  },
  'volume.default_label': {
    normal: 'Default',
    safety_mode: 'Default',
  },
  'volume.yours_label': {
    normal: 'Yours',
    safety_mode: 'Yours',
  },
  'volume.decrement_label': {
    normal: 'Decrease volume',
    safety_mode: 'Decrease volume',
  },
  'volume.increment_label': {
    normal: 'Increase volume',
    safety_mode: 'Increase volume',
  },

  // Actions.
  'action.log': {
    normal: 'Log',
    safety_mode: 'Log',
  },
  'action.logging': {
    normal: 'Logging...',
    safety_mode: 'Logging...',
  },
  'action.back_to_categories': {
    normal: 'Back to categories',
    safety_mode: 'Back to categories',
  },
  'action.back_to_beverages': {
    normal: 'Back to beverages',
    safety_mode: 'Back to beverages',
  },
  'action.clear_search': {
    normal: 'Clear search',
    safety_mode: 'Clear search',
  },

  // Error and loading.
  'error.fetch_failed': {
    normal: 'Could not load beverages. Please try again.',
    safety_mode: 'Could not load beverages. Please try again.',
  },
  'state.loading_catalog': {
    normal: 'Loading beverages...',
    safety_mode: 'Loading beverages...',
  },

  // Phase C: alcohol diuretic threshold note (spec 5.3 + 8.4).
  // Normal carries a {count} placeholder the caller interpolates with
  // the user's logged alcoholic drink count for the local day. The
  // wording stays factual ("can affect hydration"), never names the
  // numeric threshold, and never prescribes behavior.
  //
  // Safety mode strips the count and the threshold framing entirely;
  // it is a quiet single sentence that names alcohol and hydration
  // without numbers, matching Phase B's silent UX precedent for
  // drink counts. The string still has content so the lint sweep
  // entry not empty check stays green.
  'hydration.alcohol.diuretic.threshold_note': {
    normal: 'Alcohol can affect hydration with sustained intake. Logged drinks today: {count}.',
    safety_mode: 'Alcohol can affect hydration.',
  },

  // Phase D: breakdown section (spec 10).
  // Title reads identically in both modes per 170c section 8.4 silent UX.
  // The gross and effective labels carry the ml unit in normal; in safety
  // mode the breakdown surface is composition only (percentages only) so
  // these labels render the qualitative phrasing per spec section 8.
  'hydration.breakdown.title': {
    normal: 'Beverage breakdown',
    safety_mode: 'Beverage breakdown',
  },
  'hydration.breakdown.gross_label': {
    normal: 'Gross fluid',
    safety_mode: 'Composition',
  },
  'hydration.breakdown.effective_label': {
    normal: 'Effective',
    safety_mode: 'Share',
  },
  'hydration.breakdown.empty_today': {
    normal: "Log a beverage to see today's breakdown.",
    safety_mode: "Log a beverage to see today's breakdown.",
  },

  // Phase D: electrolyte summary (spec 10).
  // Normal interpolates the three minerals; the caller fills {sodium},
  // {potassium}, {magnesium} with whole mg values from the aggregator.
  // Safety mode strips the numbers and renders a qualitative one liner
  // per 170c section 8; the line still appears (silent UX, no visible
  // mode indicator) but without numeric medical framing.
  'hydration.electrolytes.summary': {
    normal: 'Today: {sodium} mg sodium, {potassium} mg potassium, {magnesium} mg magnesium from beverages.',
    safety_mode: 'Beverages today included electrolytes.',
  },
  'hydration.electrolytes.label': {
    normal: 'Electrolytes from beverages',
    safety_mode: 'Electrolytes from beverages',
  },

  // Phase D: caffeine overlay (spec 10).
  // The overlay surface itself is hidden in safety mode per spec section
  // 8; both variants carry the same label text so the lint sweep passes
  // and so the safety mode path keeps the silent UX invariant when the
  // overlay is hidden (no visible "you would be seeing X here" cue).
  'hydration.caffeine_overlay.label': {
    normal: 'Caffeine through the day',
    safety_mode: 'Caffeine through the day',
  },
  'hydration.caffeine_overlay.sleep_indicator_label': {
    normal: 'Estimated at sleep onset',
    safety_mode: 'Estimated at sleep onset',
  },
};
