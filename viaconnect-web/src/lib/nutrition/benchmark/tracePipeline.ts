/**
 * Prompt 184 Phase 0: per-item pipeline trace for both nutrition engines.
 *
 * This benchmark-only orchestrator runs items through the REAL engine stage
 * functions in the same order the routes use, and captures the intermediate
 * values the divergence report needs to attribute error by stage (quantity,
 * reference selection, raw vs cooked basis, reconciliation). It lives under
 * benchmark/ and is only invoked by the divergence harness; no production code
 * imports it.
 *
 * Faithfulness notes taken from the route handlers:
 *   Text (Log Your Meal): lookupFood per item, then aggregate(), then the
 *     Atwater reconciliation ratio. lookupFood does the unit to grams step
 *     internally, so its grams and per-100g are surfaced through the optional
 *     UsdaLookupTrace param rather than recomputed here.
 *   Photo (NutriVision): resolveNutrients then estimatePortion per item, then
 *     per-100g times grams over 100, then a manual sum (the photo route does
 *     not call aggregate). source, per-100g, fdcId, and the portion method all
 *     come straight from the return values.
 *
 * The AI recognition steps (Gemini text parse, vision detection) are not run
 * here: the harness feeds pinned parsed items and pinned detection items so the
 * measurement is deterministic, while the downstream stages run live.
 */

import { lookupFood, type UsdaLookupTrace } from '../usda-client';
import { aggregate, type AggregatedItem } from '../aggregate';
import { resolveNutrients } from '../databases/resolver';
import { estimatePortion } from '../portion/volume-estimate';
import type { ParsedItem } from '../parsed-meal-schema';
import type { VisionItem } from '../vision/types';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { isNutritionDiagnosticsEnabled } from '../diagnostic-flags';

const STAGE_TIMEOUT_MS = 5000;
const SCOPE = 'nutrition.accuracy.bench';

export const NUTRIENT_KEYS = [
  'calories_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'sugar_g',
  'sodium_mg',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type ItemTotals = Record<NutrientKey, number | null>;

export interface ItemTrace {
  engine: 'text' | 'photo';
  rawInput: string;
  identifiedLabel: string;
  referenceSource: string | null;
  referenceId: string | null;
  matchedName: string | null;
  // Photo: the vision cookingMethod, which the pipeline detects but does not
  // apply to nutrient selection. Text: null, since the text engine tracks no
  // basis at all. Either way the engine never adjusts for raw vs cooked.
  detectedBasis: string | null;
  per100g: Record<string, number> | null;
  estimatedGrams: number | null;
  conversionChain: string;
  // Text engine only: whether unitToGrams resolved the unit or fell back to a
  // default serving size. undefined for the photo engine.
  unitToGramsResolved?: boolean;
  itemTotals: ItemTotals;
  nullFields: string[];
  error: string | null;
}

export interface AtwaterCheck {
  macroDerivedKcal: number;
  ratio: number;
  passed: boolean;
}

export interface MealTrace {
  engine: 'text' | 'photo';
  items: ItemTrace[];
  mealTotals: ItemTotals;
  atwater: AtwaterCheck | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// The photo route integer-rounds per-item calories while rounding macros to one
// decimal, so the trace matches it field for field.
function roundInt(n: number): number {
  return Math.round(n);
}

// Normalize the text engine per-100g (ItemNutrients-style keys) to the same
// canonical keys the photo engine uses, so the divergence report reads per100g
// uniformly across engines. Text-only nutrients (saturated, trans, omega3) are
// kept as extras.
function textPer100gToRecord(p: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  total_fat_g: number;
  saturated_fat_g: number;
  trans_fat_g: number;
  omega3_g: number;
  sugar_g: number;
  fiber_g: number;
}): Record<string, number> {
  return {
    calories_kcal: p.calories,
    protein_g: p.protein_g,
    carbs_g: p.carbs_g,
    fat_g: p.total_fat_g,
    fiber_g: p.fiber_g,
    sugar_g: p.sugar_g,
    saturated_fat_g: p.saturated_fat_g,
    trans_fat_g: p.trans_fat_g,
    omega3_g: p.omega3_g,
  };
}

// Single error-branch builder for both engines, so the two catch blocks stay
// identical and the error trace never reflects a half-populated stage trace.
function errorTrace(
  engine: 'text' | 'photo',
  rawInput: string,
  identifiedLabel: string,
  detectedBasis: string | null,
  err: unknown
): ItemTrace {
  return {
    engine,
    rawInput,
    identifiedLabel,
    referenceSource: null,
    referenceId: null,
    matchedName: null,
    detectedBasis,
    per100g: null,
    estimatedGrams: null,
    conversionChain: 'errored before completion',
    itemTotals: emptyTotals(),
    nullFields: [...NUTRIENT_KEYS],
    error: err instanceof Error ? err.message : String(err),
  };
}

function emptyTotals(): ItemTotals {
  return {
    calories_kcal: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fiber_g: null,
    sugar_g: null,
    sodium_mg: null,
  };
}

function sumTotals(items: ItemTrace[]): ItemTotals {
  const out = emptyTotals();
  for (const key of NUTRIENT_KEYS) {
    let seen = false;
    let total = 0;
    for (const item of items) {
      const value = item.itemTotals[key];
      if (value !== null) {
        seen = true;
        total += value;
      }
    }
    out[key] = seen ? round1(total) : null;
  }
  return out;
}

function nullFieldsOf(totals: ItemTotals): string[] {
  return NUTRIENT_KEYS.filter((key) => totals[key] === null);
}

function diag(trace: MealTrace): void {
  if (!isNutritionDiagnosticsEnabled()) return;
  safeLog.info(SCOPE, 'meal trace', {
    engine: trace.engine,
    itemCount: trace.items.length,
    mealTotals: trace.mealTotals,
  });
}

function describeTextConversion(item: ParsedItem, trace: UsdaLookupTrace): string {
  const how =
    trace.unitToGramsResolved === undefined
      ? 'not run'
      : trace.unitToGramsResolved
        ? 'unitToGrams'
        : 'fallback serving size';
  const grams = trace.grams != null ? `${trace.grams}g` : 'unknown';
  return `unit=${item.unit} qty=${item.quantity} hint=${item.name} -> ${grams} via ${how}`;
}

function describePortion(
  vi: VisionItem,
  portion: { method: string; grams: number }
): string {
  const grams = vi.portionGramsHint != null ? `${vi.portionGramsHint}g` : 'none';
  const volume = vi.portionVolumeMlHint != null ? `${vi.portionVolumeMlHint}ml` : 'none';
  return `method=${portion.method} -> ${portion.grams}g (hint grams=${grams}, volume=${volume})`;
}

function per100gToRecord(per100g: {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
}): Record<string, number> {
  const out: Record<string, number> = {
    calories_kcal: per100g.calories_kcal,
    protein_g: per100g.protein_g,
    carbs_g: per100g.carbs_g,
    fat_g: per100g.fat_g,
  };
  if (per100g.fiber_g != null) out.fiber_g = per100g.fiber_g;
  if (per100g.sugar_g != null) out.sugar_g = per100g.sugar_g;
  if (per100g.sodium_mg != null) out.sodium_mg = per100g.sodium_mg;
  if (per100g.cholesterol_mg != null) out.cholesterol_mg = per100g.cholesterol_mg;
  return out;
}

/**
 * Run pinned parsed items through the text engine stages, capturing a trace per
 * item. Mirrors analyze-text: lookupFood per item, aggregate() for the meal,
 * then the Atwater reconciliation ratio.
 */
export async function traceTextPipeline(parsedItems: ParsedItem[]): Promise<MealTrace> {
  const items: ItemTrace[] = [];
  const aggItems: AggregatedItem[] = [];

  for (const item of parsedItems) {
    const rawInput = `${item.quantity} ${item.unit} ${item.name}`;
    const lookupTrace: UsdaLookupTrace = {};
    try {
      const nut = await withTimeout(
        lookupFood(item.name, item.quantity, item.unit, lookupTrace),
        STAGE_TIMEOUT_MS,
        `${SCOPE}.lookupFood`
      );
      if (!nut) {
        items.push({
          engine: 'text',
          rawInput,
          identifiedLabel: item.name,
          referenceSource: 'usda_miss',
          referenceId: null,
          matchedName: null,
          detectedBasis: null,
          per100g: null,
          estimatedGrams: lookupTrace.grams ?? null,
          conversionChain: describeTextConversion(item, lookupTrace),
          itemTotals: emptyTotals(),
          nullFields: [...NUTRIENT_KEYS],
          error: null,
        });
        continue;
      }
      aggItems.push({ parsed: item, nutrients: nut });
      const itemTotals: ItemTotals = {
        calories_kcal: nut.calories,
        protein_g: nut.protein_g,
        carbs_g: nut.carbs_g,
        fat_g: nut.total_fat_g,
        fiber_g: nut.fiber_g,
        sugar_g: nut.sugar_g,
        // the text engine (ItemNutrients) carries no sodium, so it stays null
        sodium_mg: null,
      };
      items.push({
        engine: 'text',
        rawInput,
        identifiedLabel: lookupTrace.matchedName ?? item.name,
        referenceSource: nut.source,
        referenceId: lookupTrace.fdcId != null ? String(lookupTrace.fdcId) : null,
        matchedName: lookupTrace.matchedName ?? null,
        detectedBasis: null,
        per100g: lookupTrace.per100g ? textPer100gToRecord(lookupTrace.per100g) : null,
        estimatedGrams: lookupTrace.grams ?? null,
        conversionChain: describeTextConversion(item, lookupTrace),
        unitToGramsResolved: lookupTrace.unitToGramsResolved,
        itemTotals,
        nullFields: nullFieldsOf(itemTotals),
        error: null,
      });
    } catch (err) {
      items.push(errorTrace('text', rawInput, item.name, null, err));
    }
  }

  let mealTotals = emptyTotals();
  let atwater: AtwaterCheck | null = null;
  if (aggItems.length > 0) {
    const analysis = aggregate(aggItems);
    mealTotals = {
      calories_kcal: analysis.calories,
      protein_g: analysis.protein_g,
      carbs_g: analysis.carbs_g,
      fat_g: analysis.total_fat_g,
      fiber_g: analysis.fiber_g,
      sugar_g: analysis.sugar_g,
      sodium_mg: null,
    };
    const macroDerivedKcal =
      4 * analysis.protein_g + 4 * analysis.carbs_g + 9 * analysis.total_fat_g;
    // Mirror analyze-text: ratio is 0 when calories is 0, so passed is false.
    const ratio = analysis.calories > 0 ? macroDerivedKcal / analysis.calories : 0;
    atwater = {
      macroDerivedKcal: round1(macroDerivedKcal),
      ratio: Math.round(ratio * 1000) / 1000,
      passed: ratio >= 0.8 && ratio <= 1.2,
    };
  }

  const trace: MealTrace = { engine: 'text', items, mealTotals, atwater };
  diag(trace);
  return trace;
}

/**
 * Run pinned vision detection items through the photo engine stages. Mirrors
 * the NutriVision route: resolveNutrients then estimatePortion per item, then
 * per-100g times grams over 100, then a manual sum (no aggregate()).
 */
export async function tracePhotoPipeline(
  detectionItems: ReadonlyArray<VisionItem>,
  photoRef: string
): Promise<MealTrace> {
  const items: ItemTrace[] = [];

  for (const vi of detectionItems) {
    try {
      const resolved = await withTimeout(
        resolveNutrients(vi.foodName, {
          requestId: `bench-${photoRef}`,
          cuisineTagHint: vi.cuisineTag,
        }),
        STAGE_TIMEOUT_MS,
        `${SCOPE}.resolveNutrients`
      );
      // Run the portion estimate even on a reference miss so the miss trace can
      // still report grams for attribution. This differs from the route, which
      // skips it on a miss, but it cannot affect totals (a miss reports null
      // totals regardless).
      const portion = estimatePortion({ item: vi });
      if (!resolved) {
        items.push({
          engine: 'photo',
          rawInput: photoRef,
          identifiedLabel: vi.foodName,
          referenceSource: 'resolve_miss',
          referenceId: null,
          matchedName: null,
          detectedBasis: vi.cookingMethod ?? null,
          per100g: null,
          estimatedGrams: portion.grams,
          conversionChain: describePortion(vi, portion),
          itemTotals: emptyTotals(),
          nullFields: [...NUTRIENT_KEYS],
          error: null,
        });
        continue;
      }
      const factor = portion.grams / 100;
      const per100g = resolved.per100g;
      const itemTotals: ItemTotals = {
        calories_kcal: roundInt(per100g.calories_kcal * factor),
        protein_g: round1(per100g.protein_g * factor),
        carbs_g: round1(per100g.carbs_g * factor),
        fat_g: round1(per100g.fat_g * factor),
        fiber_g: per100g.fiber_g != null ? round1(per100g.fiber_g * factor) : null,
        sugar_g: per100g.sugar_g != null ? round1(per100g.sugar_g * factor) : null,
        sodium_mg: per100g.sodium_mg != null ? round1(per100g.sodium_mg * factor) : null,
      };
      items.push({
        engine: 'photo',
        rawInput: photoRef,
        identifiedLabel: resolved.foodName,
        referenceSource: resolved.source,
        referenceId:
          resolved.usdaFdcId != null
            ? String(resolved.usdaFdcId)
            : resolved.offBarcode ?? resolved.curatedFoodId ?? null,
        matchedName: resolved.foodName,
        detectedBasis: vi.cookingMethod ?? null,
        per100g: per100gToRecord(per100g),
        estimatedGrams: portion.grams,
        conversionChain: describePortion(vi, portion),
        itemTotals,
        nullFields: nullFieldsOf(itemTotals),
        error: null,
      });
    } catch (err) {
      items.push(errorTrace('photo', photoRef, vi.foodName, vi.cookingMethod ?? null, err));
    }
  }

  const trace: MealTrace = {
    engine: 'photo',
    items,
    mealTotals: sumTotals(items),
    atwater: null,
  };
  diag(trace);
  return trace;
}
