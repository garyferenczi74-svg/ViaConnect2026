/**
 * Prompt 208b Task 4.1-T2: nutrient intake reconciliation engine.
 *
 * Reconciles per-nutrient daily intake from two sources, keyed ONLY to the
 * nutrients that have a Tolerable Upper Intake Level (UL) in NUTRIENT_UPPER_LIMITS:
 *
 *   FOOD        - the user's most recent day of logged meals. Micronutrients
 *                 live only in usda_food_cache.raw_payload (the USDA FDC
 *                 payload's foodNutrients array), joined via
 *                 meal_items.usda_fdc_id = usda_food_cache.fdc_id.
 *   SUPPLEMENTS - the user's current stack (user_current_supplements) resolved
 *                 against the FarmCeutica master formulations, which carry
 *                 structured mg-per-serving ingredient amounts.
 *
 * Outputs:
 *   getFoodContributions       - food micros per UL key + a completeness flag
 *                                (4.1-T3 appends these to the UL safety gate input).
 *   getSupplementContributions - supplement micros per UL key.
 *   buildNutrientIntakeLedger  - reconciled food+supplement rows, persisted to
 *                                nutrient_intake_ledger (display + Section 5).
 *
 * UNIT SAFETY is the central invariant. mg and mcg are NEVER cross-summed: every
 * amount is converted to the UL key's own unit via toUlUnit before it is added.
 * (folic_acid's UL is in mcg, so a 0.4 mg supplement is normalized to 400 mcg.)
 *
 * Food magnesium is deliberately EXCLUDED. The magnesium UL is supplemental-only
 * (excludes food/water), so USDA nutrient 1090 is omitted from USDA_NUTRIENT_TO_UL.
 *
 * Every public function is fail-open: it logs and returns an empty/incomplete
 * result rather than throwing. This module reads via the service-role admin
 * client; it owns no user-session auth and must never block a caller on a read.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { NUTRIENT_UPPER_LIMITS } from '@/lib/nutrients/upperLimits';
import { MASTER_FORMULATIONS } from '@/data/masterFormulations';

const SCOPE = 'nutrition.intakeReconciliation';

/** The UL nutrient keys - the ONLY nutrients this engine reconciles. */
export const UL_KEYS: string[] = Object.keys(NUTRIENT_UPPER_LIMITS);

// ---------------------------------------------------------------------------
// Per-nutrient contribution shapes
// ---------------------------------------------------------------------------

export interface NutrientContribution {
  /** A UL key from NUTRIENT_UPPER_LIMITS. */
  nutrient: string;
  /** Amount already normalized to the UL key's unit. */
  amount: number;
}

export interface FoodContributionResult {
  contributions: NutrientContribution[];
  /**
   * False when the day had no usable USDA micronutrient data (no meals, no item
   * with a usda_fdc_id, no matching cache row, or any read failure). Feeds the
   * Section 5 completeness check.
   */
  complete: boolean;
}

export interface NutrientLedgerRow {
  nutrient: string;
  food_contribution: number;
  supplement_contribution: number;
  total: number;
  unit: string;
  ul_status: 'within' | 'approaching' | 'exceeded' | 'unknown';
}

// ---------------------------------------------------------------------------
// ingredientToUlKey - map a supplement ingredient label to a UL key
// ---------------------------------------------------------------------------

/**
 * Ordered substring rules, most specific first. Each entry maps a lowercase
 * substring found in an ingredient label to a UL key. Order matters where one
 * token would otherwise shadow another (none currently overlap, but the list is
 * kept specific-first defensively).
 *
 * Only UL nutrients appear here; anything else returns undefined so it is not
 * reconciled. magnesium maps to magnesium_supplemental BY DESIGN: supplemental
 * magnesium DOES count toward that UL (only FOOD magnesium is excluded).
 */
const INGREDIENT_RULES: ReadonlyArray<readonly [string, string]> = [
  // Folate: methylfolate / 5-MTHF / folate / folic acid -> folic_acid UL.
  ['methylfolate', 'folic_acid'],
  ['methyl folate', 'folic_acid'],
  ['5-mthf', 'folic_acid'],
  ['mthf', 'folic_acid'],
  ['folate', 'folic_acid'],
  ['folic', 'folic_acid'],
  // Vitamin D.
  ['cholecalciferol', 'vitamin_d'],
  ['vitamin d', 'vitamin_d'],
  // Vitamin A (preformed retinol only; carotenoids are not UL-bound).
  ['retinol', 'vitamin_a_preformed'],
  ['retinyl', 'vitamin_a_preformed'],
  // Vitamin C.
  ['ascorb', 'vitamin_c'],
  ['vitamin c', 'vitamin_c'],
  // Vitamin E.
  ['tocopherol', 'vitamin_e'],
  ['tocotrienol', 'vitamin_e'],
  ['vitamin e', 'vitamin_e'],
  // Vitamin B6.
  ['pyridox', 'vitamin_b6'],
  ['p-5-p', 'vitamin_b6'],
  ['p5p', 'vitamin_b6'],
  ['vitamin b6', 'vitamin_b6'],
  ['b6', 'vitamin_b6'],
  // Niacin (nicotinic acid / niacinamide).
  ['niacin', 'niacin'],
  ['nicotinamide', 'niacin'],
  ['nicotinic', 'niacin'],
  // Choline.
  ['choline', 'choline'],
  // Minerals. Iron before generic so "ferrous" is caught explicitly.
  ['ferrous', 'iron'],
  ['ferric', 'iron'],
  ['iron', 'iron'],
  ['zinc', 'zinc'],
  ['copper', 'copper'],
  ['selenium', 'selenium'],
  ['selenomethionine', 'selenium'],
  ['iodine', 'iodine'],
  ['iodide', 'iodine'],
  ['calcium', 'calcium'],
  // Supplemental magnesium counts toward the supplemental-only UL.
  ['magnesium', 'magnesium_supplemental'],
  ['manganese', 'manganese'],
];

/**
 * Map a supplement ingredient / label to a UL key, or undefined if it is not a
 * UL nutrient. Case-insensitive substring match against INGREDIENT_RULES.
 */
export function ingredientToUlKey(name: string): string | undefined {
  if (typeof name !== 'string' || name.length === 0) return undefined;
  const hay = name.toLowerCase();
  for (const [needle, key] of INGREDIENT_RULES) {
    if (hay.includes(needle)) return key;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// toUlUnit - normalize an amount into the UL key's unit
// ---------------------------------------------------------------------------

function normalizeUnit(unit: string): 'mg' | 'mcg' | null {
  const u = unit.trim().toLowerCase();
  if (u === 'mg' || u === 'milligram' || u === 'milligrams') return 'mg';
  if (u === 'mcg' || u === 'ug' || u === 'µg' || u === 'microgram' || u === 'micrograms') {
    return 'mcg';
  }
  return null;
}

/**
 * Convert `amount` from `fromUnit` into the unit of `ulKey`'s UL entry.
 * Handles mg<->mcg (1 mg = 1000 mcg) and passes through when units match.
 * Returns null when the conversion is not clean (unknown key, unknown unit, or
 * a unit we do not convert such as IU or g). Never guesses.
 */
export function toUlUnit(ulKey: string, amount: number, fromUnit: string): number | null {
  const entry = NUTRIENT_UPPER_LIMITS[ulKey];
  if (!entry) return null;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;

  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(entry.unit);
  if (from === null || to === null) return null;

  if (from === to) return amount;
  if (from === 'mg' && to === 'mcg') return amount * 1000;
  if (from === 'mcg' && to === 'mg') return amount / 1000;
  return null;
}

// ---------------------------------------------------------------------------
// USDA FDC nutrient-number -> UL key map
// ---------------------------------------------------------------------------

/**
 * Standard USDA FoodData Central nutrient numbers mapped to UL keys plus the
 * USDA-reported unit for that nutrient. Only entries that convert cleanly to a
 * UL unit are included; the rest are deliberately omitted:
 *
 *   1090 magnesium    - OMITTED. The magnesium UL is supplemental-only; food
 *                       magnesium must not count toward it.
 *   1104 vitamin A IU - OMITTED. No clean IU->mcg-RAE factor without the food's
 *                       retinol/carotenoid split, and the UL is preformed-only.
 *   1177 folate total - OMITTED. Total folate (DFE) mixes food folate with
 *                       synthetic; the folic_acid UL is synthetic-only, so only
 *                       1187 (folic acid) is mapped.
 */
export const USDA_NUTRIENT_TO_UL: Record<number, { ulKey: string; unit: string }> = {
  1089: { ulKey: 'iron', unit: 'mg' },
  1087: { ulKey: 'calcium', unit: 'mg' },
  1095: { ulKey: 'zinc', unit: 'mg' },
  1098: { ulKey: 'copper', unit: 'mg' }, // copper UL is mcg; toUlUnit converts.
  1103: { ulKey: 'selenium', unit: 'mcg' },
  1100: { ulKey: 'iodine', unit: 'mcg' },
  1162: { ulKey: 'vitamin_c', unit: 'mg' },
  1109: { ulKey: 'vitamin_e', unit: 'mg' },
  1175: { ulKey: 'vitamin_b6', unit: 'mg' },
  1167: { ulKey: 'niacin', unit: 'mg' },
  1187: { ulKey: 'folic_acid', unit: 'mcg' },
  1114: { ulKey: 'vitamin_d', unit: 'mcg' },
  // 1090 magnesium, 1104 vitamin A IU, 1177 folate total: intentionally omitted.
};

// ---------------------------------------------------------------------------
// extractUsdaMicronutrients - pure parse of a USDA FDC payload
// ---------------------------------------------------------------------------

export interface UsdaMicro {
  ulKey: string;
  amountPer100g: number;
  unit: string;
}

/**
 * Parse rawPayload.foodNutrients and return the matched UL micros (per 100 g).
 * Defensive about both FDC shapes:
 *   { nutrient: { number }, amount }        (search/detail responses)
 *   { nutrientNumber, value }               (abridged responses)
 * Returns [] on any shape mismatch. Never throws. Unmapped and food-excluded
 * nutrient numbers (e.g. magnesium 1090) are skipped, as are non-finite or
 * negative amounts (negatives are corrupt data and would relax the UL gate).
 */
export function extractUsdaMicronutrients(rawPayload: unknown): UsdaMicro[] {
  try {
    if (!rawPayload || typeof rawPayload !== 'object') return [];
    const list = (rawPayload as { foodNutrients?: unknown }).foodNutrients;
    if (!Array.isArray(list)) return [];

    const out: UsdaMicro[] = [];
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const entry = raw as Record<string, unknown>;

      // Resolve the nutrient number from either shape.
      let numberRaw: unknown = entry.nutrientNumber;
      const nested = entry.nutrient;
      if (numberRaw === undefined && nested && typeof nested === 'object') {
        numberRaw = (nested as Record<string, unknown>).number;
      }
      const num = Number(numberRaw);
      if (!Number.isFinite(num)) continue;

      const mapped = USDA_NUTRIENT_TO_UL[num];
      if (!mapped) continue;

      // Resolve the amount from either shape.
      const amountRaw = entry.amount !== undefined ? entry.amount : entry.value;
      const amount = Number(amountRaw);
      // Drop non-finite AND negative amounts. A negative micronutrient amount is
      // garbage data (a corrupt raw_payload), and letting it through would feed a
      // negative contribution into the UL safety gate, SUBTRACTING from the
      // supplement total and relaxing the gate. The gate's monotonic guarantee
      // (food can only ever block MORE, never less) must be code-enforced here,
      // at the food boundary, not assumed of the data. Drop, do not flip sign.
      if (!Number.isFinite(amount) || amount < 0) continue;

      out.push({ ulKey: mapped.ulKey, amountPer100g: amount, unit: mapped.unit });
    }
    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Supplement resolution helpers
// ---------------------------------------------------------------------------

/** Normalize a product name/slug for loose matching against master formulations. */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Pre-index the master formulations by normalized name and slug.
const FORMULATION_INDEX: Map<string, (typeof MASTER_FORMULATIONS)[number]> = (() => {
  const idx = new Map<string, (typeof MASTER_FORMULATIONS)[number]>();
  for (const product of MASTER_FORMULATIONS) {
    idx.set(normalizeName(product.name), product);
    idx.set(normalizeName(product.slug), product);
  }
  return idx;
})();

function resolveFormulation(
  ...candidates: Array<string | null | undefined>
): (typeof MASTER_FORMULATIONS)[number] | undefined {
  for (const c of candidates) {
    if (!c) continue;
    const hit = FORMULATION_INDEX.get(normalizeName(c));
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Parse a free-text frequency into servings per day. Defaults to 1. Capped at 6
 * so a malformed value cannot inflate intake without bound.
 */
function frequencyPerDay(frequency: unknown): number {
  if (typeof frequency !== 'string') return 1;
  const f = frequency.toLowerCase();
  if (/(thrice|three\s*times|3\s*x|3x|tid)/.test(f)) return 3;
  if (/(twice|two\s*times|2\s*x|2x|bid)/.test(f)) return 2;
  if (/(four\s*times|4\s*x|4x|qid)/.test(f)) return 4;
  // A leading integer like "2 daily" or "2/day".
  const m = f.match(/^\s*(\d+)\b/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1) return Math.min(n, 6);
  }
  return 1;
}

// ---------------------------------------------------------------------------
// Aggregation helper - sum contributions per UL key into a stable map
// ---------------------------------------------------------------------------

function emptyTotals(): Map<string, number> {
  return new Map<string, number>();
}

function addTo(totals: Map<string, number>, key: string, amount: number): void {
  if (!Number.isFinite(amount)) return;
  totals.set(key, (totals.get(key) ?? 0) + amount);
}

function totalsToContributions(totals: Map<string, number>): NutrientContribution[] {
  const out: NutrientContribution[] = [];
  for (const [nutrient, amount] of totals.entries()) {
    out.push({ nutrient, amount });
  }
  return out;
}

// ---------------------------------------------------------------------------
// getSupplementContributions
// ---------------------------------------------------------------------------

/**
 * Read the user's current stack, resolve each item to its master formulation,
 * and sum every UL-bound ingredient (mg-per-serving * servings-per-day,
 * normalized to the UL key's unit) per UL key. Fail-open: returns [] on any
 * read or resolution error.
 */
export async function getSupplementContributions(
  userId: string,
): Promise<NutrientContribution[]> {
  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from('user_current_supplements')
      .select('supplement_name, product_name, frequency, is_current')
      .eq('user_id', userId)
      .eq('is_current', true);

    if (error) {
      safeLog.warn(SCOPE, 'supplement read failed; empty stack', { userId, error });
      return [];
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return [];

    const totals = emptyTotals();
    for (const row of rows as Array<Record<string, unknown>>) {
      const product = resolveFormulation(
        row.product_name as string | undefined,
        row.supplement_name as string | undefined,
      );
      if (!product) continue;

      const perDay = frequencyPerDay(row.frequency);
      for (const ing of product.ingredients) {
        const ulKey = ingredientToUlKey(ing.name);
        if (!ulKey) continue;
        const mg = Number(ing.mgPerServing);
        if (!Number.isFinite(mg)) continue;
        // Master formulation amounts are stored in mg.
        const normalized = toUlUnit(ulKey, mg * perDay, 'mg');
        if (normalized === null) continue;
        addTo(totals, ulKey, normalized);
      }
    }
    return totalsToContributions(totals);
  } catch (err) {
    safeLog.error(SCOPE, 'getSupplementContributions threw; empty stack', { userId, err });
    return [];
  }
}

// ---------------------------------------------------------------------------
// getFoodContributions
// ---------------------------------------------------------------------------

/** UTC calendar date (YYYY-MM-DD) of an ISO timestamp. */
function utcDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Sum the user's most recent day of logged foods' USDA micros per UL key.
 *
 * Join path (verified against the live schema):
 *   meals (user_id, logged_at, meal_id)
 *     -> meal_items (meal_id, usda_fdc_id, portion_grams)
 *       -> usda_food_cache (fdc_id, raw_payload.foodNutrients)
 *
 * The join is soft: usda_fdc_id is nullable (gemini-fallback / curated items
 * carry none) and usda_food_cache.fdc_id is not uniquely indexed. So we attempt
 * it and report complete=false whenever no usable USDA micro row contributes.
 *
 * Each per-100g micro is scaled by portion_grams/100 (factor 1 when grams are
 * missing). Fail-open: returns { contributions: [], complete: false } on any
 * read error.
 */
export async function getFoodContributions(userId: string): Promise<FoodContributionResult> {
  const EMPTY: FoodContributionResult = { contributions: [], complete: false };
  try {
    const sb = createAdminClient();

    // Most recent meals first so we can pick the latest logged day.
    const { data: mealData, error: mealErr } = await sb
      .from('meals')
      .select('meal_id, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(50);

    if (mealErr) {
      safeLog.warn(SCOPE, 'meals read failed; food incomplete', { userId, error: mealErr });
      return EMPTY;
    }

    const meals = (Array.isArray(mealData) ? mealData : []).filter(
      (m): m is { meal_id: string; logged_at: string } =>
        !!m && typeof (m as Record<string, unknown>).meal_id === 'string'
        && typeof (m as Record<string, unknown>).logged_at === 'string',
    );
    if (meals.length === 0) return EMPTY;

    // Restrict to the single most recent logged day (UTC).
    const latestDay = utcDate(meals[0].logged_at);
    const dayMealIds = meals
      .filter((m) => utcDate(m.logged_at) === latestDay)
      .map((m) => m.meal_id);
    if (dayMealIds.length === 0) return EMPTY;

    const { data: itemData, error: itemErr } = await sb
      .from('meal_items')
      .select('meal_id, usda_fdc_id, portion_grams')
      .in('meal_id', dayMealIds);

    if (itemErr) {
      safeLog.warn(SCOPE, 'meal_items read failed; food incomplete', { userId, error: itemErr });
      return EMPTY;
    }

    const items = (Array.isArray(itemData) ? itemData : []) as Array<Record<string, unknown>>;
    // Only items that carry a USDA id can contribute micros.
    const withFdc = items.filter((it) => {
      const id = Number(it.usda_fdc_id);
      return Number.isFinite(id) && id > 0;
    });
    if (withFdc.length === 0) return EMPTY;

    const fdcIds = Array.from(
      new Set(withFdc.map((it) => Number(it.usda_fdc_id)).filter((n) => Number.isFinite(n))),
    );

    const { data: cacheData, error: cacheErr } = await sb
      .from('usda_food_cache')
      .select('fdc_id, raw_payload')
      .in('fdc_id', fdcIds);

    if (cacheErr) {
      safeLog.warn(SCOPE, 'usda_food_cache read failed; food incomplete', { userId, error: cacheErr });
      return EMPTY;
    }

    // Index cache rows by fdc_id (first wins; fdc_id is not unique).
    const payloadByFdc = new Map<number, unknown>();
    for (const row of (Array.isArray(cacheData) ? cacheData : []) as Array<Record<string, unknown>>) {
      const id = Number(row.fdc_id);
      if (Number.isFinite(id) && !payloadByFdc.has(id)) payloadByFdc.set(id, row.raw_payload);
    }

    const totals = emptyTotals();
    let contributed = false;

    for (const it of withFdc) {
      const id = Number(it.usda_fdc_id);
      const payload = payloadByFdc.get(id);
      if (payload === undefined) continue;

      const micros = extractUsdaMicronutrients(payload);
      if (micros.length === 0) continue;

      const gramsRaw = Number(it.portion_grams);
      const grams = Number.isFinite(gramsRaw) && gramsRaw > 0 ? gramsRaw : 100;
      const factor = grams / 100;

      for (const micro of micros) {
        const normalized = toUlUnit(micro.ulKey, micro.amountPer100g * factor, micro.unit);
        if (normalized === null) continue;
        addTo(totals, micro.ulKey, normalized);
        contributed = true;
      }
    }

    if (!contributed) return EMPTY;
    return { contributions: totalsToContributions(totals), complete: true };
  } catch (err) {
    safeLog.error(SCOPE, 'getFoodContributions threw; food incomplete', { userId, err });
    return EMPTY;
  }
}

// ---------------------------------------------------------------------------
// buildNutrientIntakeLedger
// ---------------------------------------------------------------------------

export interface BuildLedgerOptions {
  /**
   * Test seam only: override the supplement contributions instead of reading the
   * stack. Production callers omit this. Food is still read normally.
   */
  supplementOverride?: NutrientContribution[];
}

function ulStatus(total: number, ul: number): NutrientLedgerRow['ul_status'] {
  if (!Number.isFinite(total) || total <= 0) return 'within';
  if (total > ul) return 'exceeded';
  if (total >= 0.8 * ul) return 'approaching';
  return 'within';
}

/**
 * Reconcile food + supplement per UL key, classify each against its UL, persist
 * one nutrient_intake_ledger row per nutrient, and return the rows.
 *
 *   total      = food_contribution + supplement_contribution (same UL unit)
 *   ul_status  = 'exceeded' if total > ul, 'approaching' if total >= 0.8*ul,
 *                else 'within'. 'unknown' is reserved for nutrients with no data
 *                (they are not emitted as rows).
 *   deficiency_gap = null. There is no RDA table yet; we do not fabricate one.
 *
 * Persistence is fail-open: an insert failure is logged but the rows are still
 * returned. The whole function is fail-open (returns []).
 */
export async function buildNutrientIntakeLedger(
  userId: string,
  options: BuildLedgerOptions = {},
): Promise<NutrientLedgerRow[]> {
  try {
    const [foodResult, supplementContribs] = await Promise.all([
      getFoodContributions(userId),
      options.supplementOverride
        ? Promise.resolve(options.supplementOverride)
        : getSupplementContributions(userId),
    ]);

    const foodByKey = new Map<string, number>();
    for (const c of foodResult.contributions) addTo(foodByKey, c.nutrient, c.amount);

    const suppByKey = new Map<string, number>();
    for (const c of supplementContribs) addTo(suppByKey, c.nutrient, c.amount);

    // Emit a row for every UL key that has any data from either source.
    const keys = new Set<string>([...foodByKey.keys(), ...suppByKey.keys()]);

    const rows: NutrientLedgerRow[] = [];
    for (const nutrient of keys) {
      const ulEntry = NUTRIENT_UPPER_LIMITS[nutrient];
      if (!ulEntry) continue; // safety: only UL nutrients
      const food = foodByKey.get(nutrient) ?? 0;
      const supplement = suppByKey.get(nutrient) ?? 0;
      const total = food + supplement;
      rows.push({
        nutrient,
        food_contribution: food,
        supplement_contribution: supplement,
        total,
        unit: ulEntry.unit,
        ul_status: ulStatus(total, ulEntry.ul),
      });
    }

    await persistLedger(userId, rows);
    return rows;
  } catch (err) {
    safeLog.error(SCOPE, 'buildNutrientIntakeLedger threw; returning empty', { userId, err });
    return [];
  }
}

/**
 * Persist the reconciled rows. Fail-open: a failure is logged and swallowed so
 * it never stops the caller from receiving the in-memory rows.
 */
async function persistLedger(userId: string, rows: NutrientLedgerRow[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    const sb = createAdminClient();
    const computedAt = new Date().toISOString();
    const payload = rows.map((r) => ({
      user_id: userId,
      nutrient: r.nutrient,
      food_contribution: r.food_contribution,
      supplement_contribution: r.supplement_contribution,
      total: r.total,
      unit: r.unit,
      ul_status: r.ul_status,
      deficiency_gap: null, // no RDA table yet; do not fabricate
      computed_at: computedAt,
    }));
    const builder = sb.from('nutrient_intake_ledger');
    const insertFn = (builder as { insert?: (v: unknown) => unknown }).insert;
    if (typeof insertFn !== 'function') return;
    const { error } = (await insertFn.call(builder, payload)) as { error?: unknown };
    if (error) {
      safeLog.warn(SCOPE, 'ledger persist failed; rows still returned', { userId, error });
    }
  } catch (err) {
    safeLog.error(SCOPE, 'ledger persist threw; rows still returned', { userId, err });
  }
}
