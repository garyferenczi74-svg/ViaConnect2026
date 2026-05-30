/**
 * Voice add_item async orchestration per Prompt 170j §5.1.
 *
 * AddItem operations need a food-search round trip before they can apply,
 * which the synchronous operation-applicator cannot do. This handler:
 *   1. Queries /api/nutrition/foods/search for the top match
 *   2. Constructs a MealItemDraft from the result + voice-supplied portion
 *   3. Returns the constructed item for the caller (useVoiceSession) to
 *      hand to the appendItem mutator
 *
 * Pure orchestration; does not call mutators itself.
 */

import type { MealItemDraft } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { AddItemOperation } from '../types';

export interface AddItemResult {
  success: boolean;
  reason?: 'food_search_failed' | 'no_match' | 'invalid_response' | 'aborted';
  item?: MealItemDraft;
}

interface SearchPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

interface SearchHit {
  id: string;
  name: string;
  source: 'farmceutica_curated' | 'usda_fdc' | 'open_food_facts' | 'vision_provider';
  per_100g: SearchPer100g;
  cuisine_tag?: string;
  usda_fdc_id?: number;
  off_barcode?: string;
  curated_food_id?: string;
}

export async function searchAndBuildAddItem(
  op: AddItemOperation,
  signal?: AbortSignal
): Promise<AddItemResult> {
  let response: Response;
  try {
    response = await fetch(
      `/api/nutrition/foods/search?q=${encodeURIComponent(op.food_name)}&limit=1`,
      { signal }
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, reason: 'aborted' };
    }
    return { success: false, reason: 'food_search_failed' };
  }

  if (!response.ok) {
    return { success: false, reason: 'food_search_failed' };
  }

  let json: { results?: SearchHit[] };
  try {
    json = (await response.json()) as { results?: SearchHit[] };
  } catch {
    return { success: false, reason: 'invalid_response' };
  }

  const top = json.results?.[0];
  if (!top) {
    return { success: false, reason: 'no_match' };
  }

  const item = buildItemFromSearchResult(top, op.portion_grams, op.cooking_method);
  return { success: true, item };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundInt(n: number): number {
  return Math.round(n);
}

function buildItemFromSearchResult(
  food: SearchHit,
  portion_grams: number,
  cooking_method?: string
): MealItemDraft {
  const factor = portion_grams / 100;
  const id = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const item: MealItemDraft = {
    id,
    food_name: food.name,
    portion_grams,
    nutrient_source: food.source,
    per_100g: { ...food.per_100g },
    calories_kcal: roundInt(food.per_100g.calories_kcal * factor),
    protein_g: round1(food.per_100g.protein_g * factor),
    carbs_g: round1(food.per_100g.carbs_g * factor),
    fat_g: round1(food.per_100g.fat_g * factor),
    user_modified: true,
    confidence_band: 'medium',
    portion_estimation_method: 'user_override',
  };
  if (typeof food.per_100g.fiber_g === 'number') {
    item.fiber_g = round1(food.per_100g.fiber_g * factor);
  }
  if (typeof food.per_100g.sugar_g === 'number') {
    item.sugar_g = round1(food.per_100g.sugar_g * factor);
  }
  if (typeof food.per_100g.sodium_mg === 'number') {
    item.sodium_mg = round1(food.per_100g.sodium_mg * factor);
  }
  if (cooking_method) {
    item.cooking_method = cooking_method as MealItemDraft['cooking_method'];
  }
  if (typeof food.cuisine_tag === 'string') {
    item.cuisine_tag = food.cuisine_tag;
  }
  if (typeof food.usda_fdc_id === 'number') {
    item.usda_fdc_id = food.usda_fdc_id;
  }
  if (typeof food.off_barcode === 'string') {
    item.off_barcode = food.off_barcode;
  }
  if (typeof food.curated_food_id === 'string') {
    item.curated_food_id = food.curated_food_id;
  }
  return item;
}
