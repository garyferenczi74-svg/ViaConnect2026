// Brief 3: map every capture path onto one MealCard contract.

import { computeMealKcal } from '@/lib/nutrition/compute-meal-kcal';
import type { NutritionAnalysis } from '@/lib/nutrition/schema';
import type { MealDraft } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { MealCardContract, MealCardEntrySource } from './types';
import { MEAL_CARD_ENTRY_SOURCES } from './types';

export function isMealCardEntrySource(value: unknown): value is MealCardEntrySource {
  return typeof value === 'string' && (MEAL_CARD_ENTRY_SOURCES as readonly string[]).includes(value);
}

export function logSourceForEntry(source: MealCardEntrySource): 'photo_ai' | 'manual_text' {
  if (source === 'photo' || source === 'upload') return 'photo_ai';
  return 'manual_text';
}

function coalesceMicroMap(
  items: ReadonlyArray<{ micronutrients?: Record<string, number> }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const micros = item.micronutrients;
    if (!micros) continue;
    for (const [key, value] of Object.entries(micros)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      out[key] = (out[key] ?? 0) + value;
    }
  }
  return out;
}

export function contractFromDraft(
  draft: MealDraft,
  source: MealCardEntrySource,
): MealCardContract {
  const foodNames = draft.items.map((item) => item.food_name).filter((name) => name.trim().length > 0);
  const servingDescription =
    foodNames.length > 0 ? foodNames.join(', ') : 'Analyzed meal';
  const protein = draft.totals.protein_g;
  const carbs = draft.totals.carbs_g;
  const fat = draft.totals.fat_g;
  const fiber = draft.totals.fiber_g;
  const calories = computeMealKcal({
    proteinG: protein,
    carbsG: carbs,
    fatG: fat,
    fiberG: fiber,
  });
  const analysis: NutritionAnalysis = {
    calories,
    protein_g: protein,
    carbs_g: carbs,
    total_fat_g: fat,
    saturated_fat_g: 0,
    sugar_g: draft.totals.sugar_g,
    fiber_g: fiber,
    confidence: Math.max(0, Math.min(1, draft.meal_confidence)),
    ai_notes: draft.warnings.join(' ').slice(0, 2000),
    serving_description: servingDescription.slice(0, 2000),
    data_source: 'mixed',
  };
  return {
    source,
    servingDescription: analysis.serving_description,
    foodNames,
    analysis,
    micronutrients: coalesceMicroMap(draft.items),
  };
}

export function contractFromAnalysis(
  analysis: NutritionAnalysis,
  source: MealCardEntrySource,
  extras?: {
    foodNames?: readonly string[];
    micronutrients?: Readonly<Record<string, number>>;
  },
): MealCardContract {
  const foodNames = extras?.foodNames?.filter((name) => name.trim().length > 0) ?? [];
  return {
    source,
    servingDescription: analysis.serving_description,
    foodNames: foodNames.length > 0 ? foodNames : [analysis.serving_description],
    analysis,
    micronutrients: { ...(extras?.micronutrients ?? {}) },
  };
}

export interface PendingRawInput {
  meal_card_source: MealCardEntrySource;
  micronutrients: Record<string, number>;
  food_names: string[];
}

export function encodePendingRawInput(contract: MealCardContract): string {
  const payload: PendingRawInput = {
    meal_card_source: contract.source,
    micronutrients: { ...contract.micronutrients },
    food_names: [...contract.foodNames],
  };
  return JSON.stringify(payload);
}

export function decodePendingRawInput(raw: string | null | unknown): Partial<PendingRawInput> {
  if (raw == null) return {};
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.trim().length === 0) return {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  const rec = parsed as Record<string, unknown>;
  const source = rec.meal_card_source;
  const micros = rec.micronutrients;
  const names = rec.food_names;
  const micronutrients: Record<string, number> = {};
  if (micros && typeof micros === 'object' && !Array.isArray(micros)) {
    for (const [key, value] of Object.entries(micros as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        micronutrients[key] = value;
      }
    }
  }
  return {
    meal_card_source: isMealCardEntrySource(source) ? source : undefined,
    micronutrients,
    food_names: Array.isArray(names)
      ? names.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      : undefined,
  };
}
