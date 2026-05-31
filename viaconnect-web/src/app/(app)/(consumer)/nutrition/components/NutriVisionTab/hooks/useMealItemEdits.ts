'use client';

// Prompt #170 Phase 1l: optimistic edit hook for the NutriVision review screen.
//
// Holds the working MealDraft and exposes mutators (portion, food swap, oil,
// chips, add / remove). Each mutation recalculates the per-item macros from
// `per_100g` then rolls up the meal totals. Tracks a session edit_diff for
// the corpus writer. Also exposes buildSavePayload which produces the exact
// shape NutriVisionMealInsertSchema validates.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useMemo, useState } from 'react';
import type { CookingOilSelection } from '@/lib/nutrition/cooking-oil/types';
import type { NutriVisionMealInsertPayload } from '@/lib/nutrition/meals-insert-schema';
import type {
  MealDraft,
  MealItemDraft,
  MealTotals,
  EditDiff,
  FoodSwapReplacement,
  ModifierChip,
  MealType,
  PlateSelectorKind,
} from '../types';

export interface UseMealItemEditsArgs {
  initialDraft: MealDraft;
}

export interface UseMealItemEditsReturn {
  draft: MealDraft;
  editDiff: EditDiff;
  plateSize: PlateSelectorKind | undefined;
  setPortion: (itemId: string, grams: number) => void;
  swapFood: (itemId: string, replacement: FoodSwapReplacement) => void;
  setCookingOil: (itemId: string, selection: CookingOilSelection) => void;
  applyChip: (itemId: string | 'meal', chip: ModifierChip) => void;
  removeChip: (itemId: string | 'meal', chip: ModifierChip) => void;
  restoreSnapshot: (items: ReadonlyArray<MealItemDraft>) => void;
  addItem: () => void;
  appendItem: (item: MealItemDraft) => void;
  removeItem: (itemId: string) => void;
  markVerified: (itemId: string) => void;
  setPlateSize: (kind: PlateSelectorKind) => void;
  buildSavePayload: (mealType: MealType) => NutriVisionMealInsertPayload;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundInt(n: number): number {
  return Math.round(n);
}

function recalcItem(item: MealItemDraft, gramsOverride?: number): MealItemDraft {
  const grams = typeof gramsOverride === 'number' ? gramsOverride : item.portion_grams;
  const factor = grams / 100;
  const next: MealItemDraft = {
    ...item,
    portion_grams: grams,
    calories_kcal: roundInt(item.per_100g.calories_kcal * factor),
    protein_g: round1(item.per_100g.protein_g * factor),
    carbs_g: round1(item.per_100g.carbs_g * factor),
    fat_g: round1(item.per_100g.fat_g * factor),
  };
  if (typeof item.per_100g.fiber_g === 'number') {
    next.fiber_g = round1(item.per_100g.fiber_g * factor);
  }
  if (typeof item.per_100g.sugar_g === 'number') {
    next.sugar_g = round1(item.per_100g.sugar_g * factor);
  }
  if (typeof item.per_100g.sodium_mg === 'number') {
    next.sodium_mg = round1(item.per_100g.sodium_mg * factor);
  }
  return next;
}

function aggregate(items: ReadonlyArray<MealItemDraft>): MealTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let sugar = 0;
  let sodium = 0;
  let cholesterol = 0;
  for (const it of items) {
    calories += it.calories_kcal;
    protein += it.protein_g;
    carbs += it.carbs_g;
    fat += it.fat_g;
    if (typeof it.fiber_g === 'number') fiber += it.fiber_g;
    if (typeof it.sugar_g === 'number') sugar += it.sugar_g;
    if (typeof it.sodium_mg === 'number') sodium += it.sodium_mg;
    if (typeof it.cholesterol_mg === 'number') cholesterol += it.cholesterol_mg;
  }
  return {
    calories_kcal: roundInt(calories),
    protein_g: round1(protein),
    carbs_g: round1(carbs),
    fat_g: round1(fat),
    fiber_g: round1(fiber),
    sugar_g: round1(sugar),
    sodium_mg: round1(sodium),
    cholesterol_mg: round1(cholesterol),
  };
}

const EMPTY_DIFF: EditDiff = {
  itemsAdded: 0,
  itemsRemoved: 0,
  itemsModified: 0,
  oilSelections: 0,
  portionChanges: 0,
};

interface AddedItemFromSearch {
  // For new items, the user picks a food via FoodSearchDropdown which gives
  // us a per_100g pack. addItem() default is a 100 g empty placeholder; in
  // the UI flow today addItem creates a slot the user immediately fills via
  // swapFood. We keep the seed minimal so the meal totals do not jump.
  food_name: string;
  per_100g: FoodSwapReplacement['per_100g'];
  nutrient_source: FoodSwapReplacement['nutrient_source'];
}

const ADD_ITEM_PLACEHOLDER: AddedItemFromSearch = {
  food_name: 'New item',
  per_100g: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  nutrient_source: 'user_entered',
};

// Modifier chips. Per-item chips alter per_100g composition (eg butter adds
// fat). Whole-meal chips spawn a new item at the meal level. The per-item
// dose used here intentionally rounds to friendly small increments so the
// delta is visible to the user without overwhelming the macros.
interface ChipPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const PER_ITEM_CHIPS: Partial<Record<ModifierChip, ChipPer100g>> = {
  // Per-100g additions. Applied as a bump on the existing per_100g shape.
  butter: { calories_kcal: 90, protein_g: 0, carbs_g: 0, fat_g: 10 },
  cream:  { calories_kcal: 35, protein_g: 0.3, carbs_g: 1, fat_g: 3.5 },
  cheese: { calories_kcal: 80, protein_g: 5, carbs_g: 0.5, fat_g: 6.5 },
  sauce:  { calories_kcal: 25, protein_g: 0.5, carbs_g: 3, fat_g: 1 },
  grilled: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  baked:   { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  raw:     { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
};

const WHOLE_MEAL_CHIP_FOODS: Partial<Record<ModifierChip, { name: string; grams: number; per_100g: ChipPer100g }>> = {
  butter:  { name: 'Butter', grams: 10, per_100g: { calories_kcal: 717, protein_g: 0.9, carbs_g: 0,   fat_g: 81 } },
  cream:   { name: 'Cream',  grams: 30, per_100g: { calories_kcal: 340, protein_g: 2.8, carbs_g: 2.7, fat_g: 36 } },
  cheese:  { name: 'Cheese', grams: 28, per_100g: { calories_kcal: 402, protein_g: 25,  carbs_g: 1.3, fat_g: 33 } },
  sauce:   { name: 'Sauce',  grams: 30, per_100g: { calories_kcal: 95,  protein_g: 1.5, carbs_g: 12,  fat_g: 4 } },
};

function makeNewItem(seed: AddedItemFromSearch, grams: number): MealItemDraft {
  const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const factor = grams / 100;
  return {
    id,
    food_name: seed.food_name,
    portion_grams: grams,
    nutrient_source: seed.nutrient_source,
    per_100g: { ...seed.per_100g },
    calories_kcal: roundInt(seed.per_100g.calories_kcal * factor),
    protein_g: round1(seed.per_100g.protein_g * factor),
    carbs_g: round1(seed.per_100g.carbs_g * factor),
    fat_g: round1(seed.per_100g.fat_g * factor),
    user_modified: true,
    confidence_band: 'medium',
    portion_estimation_method: 'user_override',
  };
}

export function useMealItemEdits(args: UseMealItemEditsArgs): UseMealItemEditsReturn {
  const [items, setItems] = useState<MealItemDraft[]>(args.initialDraft.items);
  const [editDiff, setEditDiff] = useState<EditDiff>(EMPTY_DIFF);
  // #170a supplement §17.2: per-meal plate-size selection. Stays undefined
  // until the user picks a chip; the save payload only stamps plate_size
  // when this is set so older meals (without a chip choice) are unaffected.
  const [plateSize, setPlateSizeState] = useState<PlateSelectorKind | undefined>(
    args.initialDraft.plate_size,
  );

  const draft = useMemo<MealDraft>(() => ({
    ...args.initialDraft,
    items,
    totals: aggregate(items),
    ...(plateSize ? { plate_size: plateSize } : {}),
  }), [args.initialDraft, items, plateSize]);

  const setPortion = useCallback((itemId: string, grams: number) => {
    if (!Number.isFinite(grams) || grams < 0) return;
    setItems((curr) => curr.map((it) => {
      if (it.id !== itemId) return it;
      const next = recalcItem({ ...it, user_modified: true, portion_estimation_method: 'user_override' }, grams);
      return next;
    }));
    setEditDiff((d) => ({ ...d, portionChanges: d.portionChanges + 1, itemsModified: d.itemsModified + 1 }));
  }, []);

  const swapFood = useCallback((itemId: string, replacement: FoodSwapReplacement) => {
    setItems((curr) => curr.map((it) => {
      if (it.id !== itemId) return it;
      const swapped: MealItemDraft = {
        ...it,
        food_name: replacement.name,
        nutrient_source: replacement.nutrient_source,
        per_100g: { ...replacement.per_100g },
        user_modified: true,
      };
      if (typeof replacement.usda_fdc_id === 'number') swapped.usda_fdc_id = replacement.usda_fdc_id;
      if (typeof replacement.off_barcode === 'string') swapped.off_barcode = replacement.off_barcode;
      if (typeof replacement.curated_food_id === 'string') swapped.curated_food_id = replacement.curated_food_id;
      return recalcItem(swapped);
    }));
    setEditDiff((d) => ({ ...d, itemsModified: d.itemsModified + 1 }));
  }, []);

  const setCookingOil = useCallback((itemId: string, selection: CookingOilSelection) => {
    setItems((curr) => curr.map((it) => {
      if (it.id !== itemId) return it;
      return { ...it, cooking_oil: selection, user_modified: true };
    }));
    setEditDiff((d) => ({ ...d, oilSelections: d.oilSelections + 1, itemsModified: d.itemsModified + 1 }));
  }, []);

  const applyChip = useCallback((itemId: string | 'meal', chip: ModifierChip) => {
    if (itemId === 'meal') {
      const wholeMealSeed = WHOLE_MEAL_CHIP_FOODS[chip];
      if (!wholeMealSeed) return; // grilled / baked / raw at meal level do nothing.
      const seed: AddedItemFromSearch = {
        food_name: wholeMealSeed.name,
        per_100g: wholeMealSeed.per_100g,
        nutrient_source: 'user_entered',
      };
      const next = makeNewItem(seed, wholeMealSeed.grams);
      setItems((curr) => [...curr, next]);
      setEditDiff((d) => ({ ...d, itemsAdded: d.itemsAdded + 1 }));
      return;
    }

    const additive = PER_ITEM_CHIPS[chip];
    if (!additive) return;
    setItems((curr) => curr.map((it) => {
      if (it.id !== itemId) return it;
      // grilled / baked / raw chips zero out cooking_oil and reset cooking_method
      // so the macros do not double-count an oil bump.
      if (chip === 'grilled' || chip === 'baked' || chip === 'raw') {
        const cleared: MealItemDraft = { ...it, cooking_method: chip, user_modified: true };
        if (cleared.cooking_oil) {
          // remove cooking_oil entirely
          delete (cleared as { cooking_oil?: CookingOilSelection }).cooking_oil;
        }
        return recalcItem(cleared);
      }
      const bumped: MealItemDraft = {
        ...it,
        per_100g: {
          ...it.per_100g,
          calories_kcal: it.per_100g.calories_kcal + additive.calories_kcal,
          protein_g: it.per_100g.protein_g + additive.protein_g,
          carbs_g: it.per_100g.carbs_g + additive.carbs_g,
          fat_g: it.per_100g.fat_g + additive.fat_g,
        },
        user_modified: true,
      };
      return recalcItem(bumped);
    }));
    setEditDiff((d) => ({ ...d, itemsModified: d.itemsModified + 1 }));
  }, []);

  // Prompt 170j Phase 1b: voice RemoveModifier inverse of applyChip.
  // Whole-meal chips: remove the most recent matching spawned item.
  // Per-item additive chips: subtract the chip's per_100g bump (floored at 0).
  // Cooking-method chips (grilled / baked / raw) are state, not additive;
  // removal is a noop at this layer since the next chip overwrites cooking_method.
  const removeChip = useCallback((itemId: string | 'meal', chip: ModifierChip) => {
    if (itemId === 'meal') {
      const wholeMealSeed = WHOLE_MEAL_CHIP_FOODS[chip];
      if (!wholeMealSeed) return;
      setItems((curr) => {
        let lastIdx = -1;
        for (let i = curr.length - 1; i >= 0; i--) {
          if (curr[i].food_name === wholeMealSeed.name) {
            lastIdx = i;
            break;
          }
        }
        if (lastIdx === -1) return curr;
        return curr.filter((_, i) => i !== lastIdx);
      });
      setEditDiff((d) => ({ ...d, itemsRemoved: d.itemsRemoved + 1 }));
      return;
    }

    if (chip === 'grilled' || chip === 'baked' || chip === 'raw') {
      return;
    }

    const additive = PER_ITEM_CHIPS[chip];
    if (!additive) return;
    setItems((curr) => curr.map((it) => {
      if (it.id !== itemId) return it;
      const reduced: MealItemDraft = {
        ...it,
        per_100g: {
          ...it.per_100g,
          calories_kcal: Math.max(0, it.per_100g.calories_kcal - additive.calories_kcal),
          protein_g: Math.max(0, it.per_100g.protein_g - additive.protein_g),
          carbs_g: Math.max(0, it.per_100g.carbs_g - additive.carbs_g),
          fat_g: Math.max(0, it.per_100g.fat_g - additive.fat_g),
        },
        user_modified: true,
      };
      return recalcItem(reduced);
    }));
    setEditDiff((d) => ({ ...d, itemsModified: d.itemsModified + 1 }));
  }, []);

  // Prompt 170j Phase 1c: voice Undo restores a pre-apply items snapshot.
  // editDiff is intentionally NOT decremented; it is a session-cumulative
  // counter, not a state mirror. Use this only via useVoiceApply.undoLast.
  const restoreSnapshot = useCallback((snapshot: ReadonlyArray<MealItemDraft>) => {
    setItems([...snapshot]);
  }, []);

  const addItem = useCallback(() => {
    setItems((curr) => [...curr, makeNewItem(ADD_ITEM_PLACEHOLDER, 100)]);
    setEditDiff((d) => ({ ...d, itemsAdded: d.itemsAdded + 1 }));
  }, []);

  // Prompt 170j Phase 1c-3: voice AddItem pushes a fully-constructed item
  // (built from /api/nutrition/foods/search). Bypasses the placeholder +
  // swapFood pattern so the meal totals don't briefly read zero between
  // append and search-resolve.
  const appendItem = useCallback((item: MealItemDraft) => {
    setItems((curr) => [...curr, item]);
    setEditDiff((d) => ({ ...d, itemsAdded: d.itemsAdded + 1 }));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((curr) => curr.filter((it) => it.id !== itemId));
    setEditDiff((d) => ({ ...d, itemsRemoved: d.itemsRemoved + 1 }));
  }, []);

  const markVerified = useCallback((itemId: string) => {
    setItems((curr) => curr.map((it) => {
      if (it.id !== itemId) return it;
      return { ...it, user_modified: true };
    }));
    setEditDiff((d) => ({ ...d, itemsModified: d.itemsModified + 1 }));
  }, []);

  const setPlateSize = useCallback((kind: PlateSelectorKind) => {
    setPlateSizeState(kind);
  }, []);

  const buildSavePayload = useCallback((mealType: MealType): NutriVisionMealInsertPayload => {
    const payloadItems: NutriVisionMealInsertPayload['items'] = items.map((it) => {
      const row: NutriVisionMealInsertPayload['items'][number] = {
        food_name: it.food_name,
        portion_grams: it.portion_grams,
        calories_kcal: it.calories_kcal,
        protein_g: it.protein_g,
        carbs_g: it.carbs_g,
        fat_g: it.fat_g,
        user_modified: it.user_modified,
      };
      if (typeof it.cuisine_tag === 'string') row.cuisine_tag = it.cuisine_tag;
      if (it.bounding_box) row.bounding_box = it.bounding_box;
      if (it.recognition_provider !== undefined) row.recognition_provider = it.recognition_provider;
      if (typeof it.recognition_confidence === 'number') row.recognition_confidence = it.recognition_confidence;
      if (typeof it.portion_volume_ml === 'number') row.portion_volume_ml = it.portion_volume_ml;
      if (it.portion_estimation_method !== undefined) row.portion_estimation_method = it.portion_estimation_method;
      if (it.nutrient_source !== undefined) row.nutrient_source = it.nutrient_source;
      if (typeof it.usda_fdc_id === 'number') row.usda_fdc_id = it.usda_fdc_id;
      if (typeof it.off_barcode === 'string') row.off_barcode = it.off_barcode;
      // Prompt 170l Phase 1c-2: propagate OFF-derived metadata when the item
      // came from a barcode scan. Legacy items keep these fields undefined.
      if (typeof it.off_product_name === 'string') row.off_product_name = it.off_product_name;
      if (typeof it.off_brand === 'string') row.off_brand = it.off_brand;
      if (typeof it.off_serving_size_g === 'number') row.off_serving_size_g = it.off_serving_size_g;
      if (typeof it.off_completeness_score === 'number') row.off_completeness_score = it.off_completeness_score;
      if (typeof it.off_nova_group === 'number') row.off_nova_group = it.off_nova_group;
      if (typeof it.off_nutrition_grade_fr === 'string') row.off_nutrition_grade_fr = it.off_nutrition_grade_fr;
      if (typeof it.user_overrode_macros === 'boolean') row.user_overrode_macros = it.user_overrode_macros;
      // Prompt 171b Phase 2: propagate caffeine + display fields on save.
      if (typeof it.caffeine_mg === 'number') row.caffeine_mg = it.caffeine_mg;
      if (typeof it.portion_display_unit === 'string') row.portion_display_unit = it.portion_display_unit;
      if (typeof it.portion_display_value === 'number') row.portion_display_value = it.portion_display_value;
      if (typeof it.curated_food_id === 'string') row.curated_food_id = it.curated_food_id;
      if (typeof it.fiber_g === 'number') row.fiber_g = it.fiber_g;
      if (typeof it.sugar_g === 'number') row.sugar_g = it.sugar_g;
      if (typeof it.sodium_mg === 'number') row.sodium_mg = it.sodium_mg;
      if (typeof it.cholesterol_mg === 'number') row.cholesterol_mg = it.cholesterol_mg;
      if (it.micronutrients) row.micronutrients = it.micronutrients;
      if (typeof it.cooking_method === 'string') row.cooking_method = it.cooking_method;
      if (it.cooking_oil) {
        row.cooking_oil = {
          type: it.cooking_oil.type,
          amount_ml: it.cooking_oil.amount_ml,
          was_suggested_default: it.cooking_oil.was_suggested_default,
          suggested_default_type: it.cooking_oil.suggested_default_type,
          suggested_default_amount_ml: it.cooking_oil.suggested_default_amount_ml,
        };
      }
      return row;
    });

    const payload: NutriVisionMealInsertPayload = {
      source: 'nutrivision',
      meal_type: mealType,
      logged_at: new Date().toISOString(),
      items: payloadItems,
      edit_diff: editDiff,
    };
    if (typeof draft.meal_confidence === 'number') payload.meal_confidence = draft.meal_confidence;
    if (draft.recognition_provider_primary !== undefined) {
      payload.recognition_provider_primary = draft.recognition_provider_primary;
    }
    if (draft.recognition_provider_secondary !== undefined) {
      payload.recognition_provider_secondary = draft.recognition_provider_secondary;
    }
    if (typeof draft.source_photo_blob_id === 'string') {
      payload.source_photo_blob_id = draft.source_photo_blob_id;
    }
    if (plateSize) {
      payload.plate_size = plateSize;
    }
    return payload;
  }, [items, editDiff, draft, plateSize]);

  return {
    draft,
    editDiff,
    plateSize,
    setPortion,
    swapFood,
    setCookingOil,
    applyChip,
    removeChip,
    restoreSnapshot,
    addItem,
    appendItem,
    removeItem,
    markVerified,
    setPlateSize,
    buildSavePayload,
  };
}
