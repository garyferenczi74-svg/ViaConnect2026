// Prompt #170 Phase 1g: barrel for the NutriVision cooking-oil smart-default
// logic. Downstream callers (NutriVisionTab picker, meal-write route)
// import from here.

export {
  suggestCookingOil,
  oilMacroDelta,
  type CookingOilType,
  type CookingOilSelection,
  type OilSuggestionInput,
  type OilSuggestion,
  type OilMacroDelta,
} from './suggester';
