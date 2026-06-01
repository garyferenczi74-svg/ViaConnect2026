// Prompt 170n Phase C: map VoiceNativeParseResult into the existing MealDraft
// shape so ReviewingSurface renders identically across photo/barcode/quick-log/
// voice-native entry paths. Macros stay at zero in v1; user resolves via the
// existing FoodSearchDropdown swap affordance on the review screen. Matches
// the 170m mapper pattern exactly with the addition of combined_voice_confidence
// driving the confidence band classification (voice-native uses combined NLU
// plus STT geometric mean rather than NLU alone per Section 9 calibration).

import type { VoiceNativeParseResult } from '@/lib/nutrition/voice-native/types';
import type {
  MealDraft,
  MealItemDraft,
  MealTotals,
} from '../types';
import { classifyConfidence } from '../types';

const EMPTY_PER_100G = {
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
};

const EMPTY_TOTALS: MealTotals = {
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
  cholesterol_mg: 0,
};

export function voiceNativeToMealDraft(parse: VoiceNativeParseResult): MealDraft {
  const items: MealItemDraft[] = parse.meal_items.map((it, idx) => ({
    id: `voice-native-item-${Date.now().toString(36)}-${idx}`,
    food_name: it.food_name,
    portion_grams: it.portion_grams,
    nutrient_source: 'user_entered',
    per_100g: { ...EMPTY_PER_100G },
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    cholesterol_mg: 0,
    cooking_method: it.cooking_method ?? undefined,
    user_modified: false,
    confidence_band: classifyConfidence(it.combined_voice_confidence),
    recognition_confidence: it.combined_voice_confidence,
    caffeine_mg: typeof it.caffeine_mg === 'number' && it.caffeine_mg > 0 ? it.caffeine_mg : undefined,
  }));

  const meanCombined = parse.meal_items.length > 0
    ? parse.meal_items.reduce((s, it) => s + it.combined_voice_confidence, 0) / parse.meal_items.length
    : 0.5;

  return {
    id: `voice-native-meal-${Date.now().toString(36)}`,
    items,
    totals: { ...EMPTY_TOTALS },
    meal_confidence: meanCombined,
    warnings: [],
    credit_card_detected: true,
  };
}
