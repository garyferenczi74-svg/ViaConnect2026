/**
 * Prompt 208b Task 4.1-T2: nutrient intake reconciliation engine tests.
 *
 * Reconciles per-nutrient daily intake from FOOD (usda_food_cache.raw_payload
 * micros via meal_items.usda_fdc_id) + SUPPLEMENTS (the stack resolved through
 * masterFormulations), keyed ONLY to the existing upper-limit nutrients.
 *
 * Unit safety is the central invariant: mg and mcg are never cross-summed. Food
 * magnesium is excluded from the supplemental-only magnesium UL. Every public
 * function is fail-open and never throws.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks: admin client + safe-log. The admin client exposes a single
// `from` that the test configures per-table with a chainable builder.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  adminFrom: vi.fn(),
  safeLogError: vi.fn(),
  safeLogWarn: vi.fn(),
  safeLogInfo: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mocks.adminFrom }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    error: mocks.safeLogError,
    warn: mocks.safeLogWarn,
    info: mocks.safeLogInfo,
    debug: vi.fn(),
  },
}));

import {
  UL_KEYS,
  ingredientToUlKey,
  toUlUnit,
  USDA_NUTRIENT_TO_UL,
  extractUsdaMicronutrients,
  getSupplementContributions,
  getFoodContributions,
  buildNutrientIntakeLedger,
} from '../intakeReconciliation';

// ---------------------------------------------------------------------------
// Builder helpers - a tiny thenable query builder so `await sb.from(t)...`
// resolves to a configured { data, error }. Chained methods return `this`.
// ---------------------------------------------------------------------------
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const ret = () => builder;
  for (const m of ['select', 'eq', 'in', 'gte', 'lt', 'order', 'limit', 'not']) {
    builder[m] = vi.fn(ret);
  }
  // Resolve when awaited (PostgREST builders are thenables).
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return builder;
}

/** Route `from(table)` to a per-table result map. */
function routeTables(map: Record<string, { data: unknown; error: unknown }>) {
  mocks.adminFrom.mockImplementation((table: string) => {
    const r = map[table] ?? { data: [], error: null };
    return makeBuilder(r);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.adminFrom.mockReset();
});

// ===========================================================================
// UL_KEYS
// ===========================================================================
describe('UL_KEYS', () => {
  it('mirrors the upper-limit nutrient keys', () => {
    expect(UL_KEYS).toContain('iron');
    expect(UL_KEYS).toContain('folic_acid');
    expect(UL_KEYS).toContain('magnesium_supplemental');
    expect(UL_KEYS.length).toBeGreaterThan(10);
  });
});

// ===========================================================================
// ingredientToUlKey
// ===========================================================================
describe('ingredientToUlKey', () => {
  it('maps methyl folate to folic_acid', () => {
    expect(ingredientToUlKey('Methyl Folate (5-MTHF)')).toBe('folic_acid');
    expect(ingredientToUlKey('Liposomal B9 - Methyl Folate (5-MTHF)')).toBe('folic_acid');
  });

  it('maps ferrous forms to iron', () => {
    expect(ingredientToUlKey('Ferrous bisglycinate')).toBe('iron');
    expect(ingredientToUlKey('Iron (as Ferrous Bisglycinate)')).toBe('iron');
  });

  it('maps zinc forms to zinc', () => {
    expect(ingredientToUlKey('Zinc picolinate')).toBe('zinc');
    expect(ingredientToUlKey('Zinc (Bisglycinate)')).toBe('zinc');
  });

  it('maps cholecalciferol / vitamin d to vitamin_d', () => {
    expect(ingredientToUlKey('Cholecalciferol')).toBe('vitamin_d');
    expect(ingredientToUlKey('Liposomal Vitamin D3 (Cholecalciferol)')).toBe('vitamin_d');
  });

  it('maps ascorbic acid / vitamin c to vitamin_c', () => {
    expect(ingredientToUlKey('Liposomal Vitamin C (Ascorbic Acid)')).toBe('vitamin_c');
  });

  it('maps retinol forms to vitamin_a_preformed', () => {
    expect(ingredientToUlKey('Retinyl palmitate')).toBe('vitamin_a_preformed');
  });

  it('maps magnesium forms to magnesium_supplemental', () => {
    expect(ingredientToUlKey('Magnesium Bisglycinate')).toBe('magnesium_supplemental');
  });

  it('returns undefined for non-UL ingredients', () => {
    expect(ingredientToUlKey('Coenzyme Q10')).toBeUndefined();
    expect(ingredientToUlKey('L-Theanine')).toBeUndefined();
    expect(ingredientToUlKey('')).toBeUndefined();
  });
});

// ===========================================================================
// toUlUnit
// ===========================================================================
describe('toUlUnit', () => {
  it('converts mg to mcg for a mcg-UL nutrient', () => {
    // folic_acid UL is mcg; a 0.4 mg supplement is 400 mcg.
    expect(toUlUnit('folic_acid', 0.4, 'mg')).toBe(400);
  });

  it('passes through when units already match', () => {
    expect(toUlUnit('iron', 18, 'mg')).toBe(18);
    expect(toUlUnit('folic_acid', 400, 'mcg')).toBe(400);
  });

  it('converts mcg to mg for a mg-UL nutrient', () => {
    // iron UL is mg; 5000 mcg = 5 mg
    expect(toUlUnit('iron', 5000, 'mcg')).toBe(5);
  });

  it('treats ug / microgram aliases as mcg', () => {
    // 'ug' must be recognized as mcg: passthrough into a mcg-UL, and 5000 ug
    // converts to 5 mg for a mg-UL (proving it is not treated as unconvertible).
    expect(toUlUnit('folic_acid', 0.4, 'ug')).toBe(0.4);
    expect(toUlUnit('iron', 5000, 'ug')).toBe(5);
  });

  it('returns null when the unit is not convertible', () => {
    expect(toUlUnit('iron', 18, 'IU')).toBeNull();
    expect(toUlUnit('iron', 18, 'g')).toBeNull();
  });

  it('returns null for an unknown UL key', () => {
    expect(toUlUnit('not_a_nutrient', 1, 'mg')).toBeNull();
  });
});

// ===========================================================================
// USDA_NUTRIENT_TO_UL
// ===========================================================================
describe('USDA_NUTRIENT_TO_UL', () => {
  it('maps iron 1089 to iron in mg', () => {
    expect(USDA_NUTRIENT_TO_UL[1089]).toEqual({ ulKey: 'iron', unit: 'mg' });
  });

  it('maps folic acid 1187 to folic_acid in mcg', () => {
    expect(USDA_NUTRIENT_TO_UL[1187]).toEqual({ ulKey: 'folic_acid', unit: 'mcg' });
  });

  it('excludes food magnesium 1090 from the supplemental-only UL', () => {
    expect(USDA_NUTRIENT_TO_UL[1090]).toBeUndefined();
  });

  it('omits vitamin a IU 1104 (no clean IU->mcg factor)', () => {
    expect(USDA_NUTRIENT_TO_UL[1104]).toBeUndefined();
  });
});

// ===========================================================================
// extractUsdaMicronutrients (pure)
// ===========================================================================
describe('extractUsdaMicronutrients', () => {
  it('reads the {nutrient:{number}, amount} shape', () => {
    const payload = { foodNutrients: [{ nutrient: { number: '1089' }, amount: 2.5 }] };
    expect(extractUsdaMicronutrients(payload)).toEqual([
      { ulKey: 'iron', amountPer100g: 2.5, unit: 'mg' },
    ]);
  });

  it('reads the {nutrientNumber, value} shape', () => {
    const payload = { foodNutrients: [{ nutrientNumber: 1162, value: 30 }] };
    expect(extractUsdaMicronutrients(payload)).toEqual([
      { ulKey: 'vitamin_c', amountPer100g: 30, unit: 'mg' },
    ]);
  });

  it('skips unmapped and food-excluded nutrient numbers', () => {
    const payload = {
      foodNutrients: [
        { nutrient: { number: '1090' }, amount: 80 }, // magnesium - excluded
        { nutrient: { number: '9999' }, amount: 1 }, // unknown
        { nutrient: { number: '1089' }, amount: 2 }, // iron - kept
      ],
    };
    expect(extractUsdaMicronutrients(payload)).toEqual([
      { ulKey: 'iron', amountPer100g: 2, unit: 'mg' },
    ]);
  });

  it('returns [] on garbage shapes and never throws', () => {
    expect(extractUsdaMicronutrients(null)).toEqual([]);
    expect(extractUsdaMicronutrients(undefined)).toEqual([]);
    expect(extractUsdaMicronutrients('nope')).toEqual([]);
    expect(extractUsdaMicronutrients({})).toEqual([]);
    expect(extractUsdaMicronutrients({ foodNutrients: 'x' })).toEqual([]);
    expect(extractUsdaMicronutrients({ foodNutrients: [null, 5, {}] })).toEqual([]);
  });
});

// ===========================================================================
// getSupplementContributions
// ===========================================================================
describe('getSupplementContributions', () => {
  it('resolves a folate supplement to folic_acid in mcg', async () => {
    // Creatine HCL+ contains Methylfolate (5-MTHF) 0.4 mg -> 400 mcg folic_acid.
    routeTables({
      user_current_supplements: {
        data: [{ product_name: 'Creatine HCL+', supplement_name: 'Creatine HCL+', frequency: 'daily' }],
        error: null,
      },
    });
    const out = await getSupplementContributions('u1');
    const folate = out.find((c) => c.nutrient === 'folic_acid');
    expect(folate).toBeDefined();
    expect(folate?.amount).toBeCloseTo(400, 5);
  });

  it('multiplies by frequency per day', async () => {
    routeTables({
      user_current_supplements: {
        data: [
          { product_name: 'Creatine HCL+', supplement_name: 'Creatine HCL+', frequency: 'twice daily' },
        ],
        error: null,
      },
    });
    const out = await getSupplementContributions('u1');
    const folate = out.find((c) => c.nutrient === 'folic_acid');
    // 0.4 mg * 2 = 0.8 mg = 800 mcg
    expect(folate?.amount).toBeCloseTo(800, 5);
  });

  it('returns [] (fail-open) on a read error', async () => {
    routeTables({
      user_current_supplements: { data: null, error: { message: 'boom' } },
    });
    const out = await getSupplementContributions('u1');
    expect(out).toEqual([]);
  });

  it('returns [] when the stack is empty', async () => {
    routeTables({ user_current_supplements: { data: [], error: null } });
    expect(await getSupplementContributions('u1')).toEqual([]);
  });

  it('never throws even if the client itself blows up', async () => {
    mocks.adminFrom.mockImplementation(() => {
      throw new Error('client exploded');
    });
    const out = await getSupplementContributions('u1');
    expect(out).toEqual([]);
  });
});

// ===========================================================================
// getFoodContributions
// ===========================================================================
describe('getFoodContributions', () => {
  it('is incomplete when there are no meals', async () => {
    routeTables({ meals: { data: [], error: null } });
    const out = await getFoodContributions('u1');
    expect(out).toEqual({ contributions: [], complete: false });
  });

  it('is incomplete when no meal item carries a usda_fdc_id', async () => {
    routeTables({
      meals: { data: [{ meal_id: 'm1', logged_at: '2026-06-22T12:00:00Z' }], error: null },
      meal_items: {
        data: [{ meal_id: 'm1', usda_fdc_id: null, portion_grams: 100 }],
        error: null,
      },
    });
    const out = await getFoodContributions('u1');
    expect(out.complete).toBe(false);
    expect(out.contributions).toEqual([]);
  });

  it('sums USDA micros scaled by portion grams and reports complete', async () => {
    routeTables({
      meals: { data: [{ meal_id: 'm1', logged_at: '2026-06-22T12:00:00Z' }], error: null },
      meal_items: {
        data: [{ meal_id: 'm1', usda_fdc_id: 1111, portion_grams: 200 }],
        error: null,
      },
      usda_food_cache: {
        data: [
          {
            fdc_id: 1111,
            raw_payload: { foodNutrients: [{ nutrient: { number: '1089' }, amount: 2.5 }] },
          },
        ],
        error: null,
      },
    });
    const out = await getFoodContributions('u1');
    expect(out.complete).toBe(true);
    const iron = out.contributions.find((c) => c.nutrient === 'iron');
    // 2.5 mg per 100 g, 200 g -> 5 mg
    expect(iron?.amount).toBeCloseTo(5, 5);
  });

  it('does not produce a magnesium contribution from food', async () => {
    routeTables({
      meals: { data: [{ meal_id: 'm1', logged_at: '2026-06-22T12:00:00Z' }], error: null },
      meal_items: {
        data: [{ meal_id: 'm1', usda_fdc_id: 1111, portion_grams: 100 }],
        error: null,
      },
      usda_food_cache: {
        data: [
          {
            fdc_id: 1111,
            raw_payload: {
              foodNutrients: [
                { nutrient: { number: '1090' }, amount: 80 }, // magnesium - excluded
                { nutrient: { number: '1089' }, amount: 1 }, // iron
              ],
            },
          },
        ],
        error: null,
      },
    });
    const out = await getFoodContributions('u1');
    expect(out.contributions.find((c) => c.nutrient === 'magnesium_supplemental')).toBeUndefined();
    expect(out.contributions.find((c) => c.nutrient === 'iron')).toBeDefined();
  });

  it('returns empty+incomplete (fail-open) on a meals read error', async () => {
    routeTables({ meals: { data: null, error: { message: 'db down' } } });
    const out = await getFoodContributions('u1');
    expect(out).toEqual({ contributions: [], complete: false });
  });

  it('never throws even if the client blows up', async () => {
    mocks.adminFrom.mockImplementation(() => {
      throw new Error('client exploded');
    });
    const out = await getFoodContributions('u1');
    expect(out).toEqual({ contributions: [], complete: false });
  });
});

// ===========================================================================
// buildNutrientIntakeLedger
// ===========================================================================
describe('buildNutrientIntakeLedger', () => {
  it('sums food + supplement and flags exceeded against the UL', async () => {
    // folic_acid: 600 mcg food + 800 mcg supplement = 1400 > 1000 UL -> exceeded.
    routeTables({
      meals: { data: [{ meal_id: 'm1', logged_at: '2026-06-22T12:00:00Z' }], error: null },
      meal_items: {
        data: [{ meal_id: 'm1', usda_fdc_id: 1111, portion_grams: 100 }],
        error: null,
      },
      usda_food_cache: {
        data: [
          {
            fdc_id: 1111,
            raw_payload: { foodNutrients: [{ nutrient: { number: '1187' }, amount: 600 }] },
          },
        ],
        error: null,
      },
      user_current_supplements: {
        // Provide an 800 mcg folate value via two Creatine HCL+ (0.4 mg each daily = 400 mcg)
        // is only 400; instead use a synthetic product resolved by name below.
        data: [{ product_name: 'TEST_FOLATE_800', supplement_name: 'TEST_FOLATE_800', frequency: 'daily' }],
        error: null,
      },
      nutrient_intake_ledger: { data: null, error: null },
    });

    const rows = await buildNutrientIntakeLedger('u1', {
      // Inject a deterministic supplement contribution for the test so we are
      // not coupled to a specific master formulation amount.
      supplementOverride: [{ nutrient: 'folic_acid', amount: 800 }],
    });

    const folate = rows.find((r) => r.nutrient === 'folic_acid');
    expect(folate).toBeDefined();
    expect(folate?.food_contribution).toBeCloseTo(600, 5);
    expect(folate?.supplement_contribution).toBeCloseTo(800, 5);
    expect(folate?.total).toBeCloseTo(1400, 5);
    expect(folate?.unit).toBe('mcg');
    expect(folate?.ul_status).toBe('exceeded');
  });

  it('flags approaching at >= 80 percent of the UL', async () => {
    routeTables({
      meals: { data: [], error: null },
      user_current_supplements: { data: [], error: null },
      nutrient_intake_ledger: { data: null, error: null },
    });
    const rows = await buildNutrientIntakeLedger('u1', {
      supplementOverride: [{ nutrient: 'iron', amount: 36 }], // 80% of 45
    });
    const iron = rows.find((r) => r.nutrient === 'iron');
    expect(iron?.ul_status).toBe('approaching');
  });

  it('flags within below 80 percent of the UL', async () => {
    routeTables({
      meals: { data: [], error: null },
      user_current_supplements: { data: [], error: null },
      nutrient_intake_ledger: { data: null, error: null },
    });
    const rows = await buildNutrientIntakeLedger('u1', {
      supplementOverride: [{ nutrient: 'iron', amount: 10 }],
    });
    const iron = rows.find((r) => r.nutrient === 'iron');
    expect(iron?.ul_status).toBe('within');
  });

  it('still returns rows when persistence fails', async () => {
    routeTables({
      meals: { data: [], error: null },
      user_current_supplements: { data: [], error: null },
      nutrient_intake_ledger: { data: null, error: { message: 'insert blocked' } },
    });
    const rows = await buildNutrientIntakeLedger('u1', {
      supplementOverride: [{ nutrient: 'iron', amount: 10 }],
    });
    expect(rows.find((r) => r.nutrient === 'iron')).toBeDefined();
  });

  it('sets deficiency_gap-bearing rows with deficiency_gap null (no RDA table yet)', async () => {
    routeTables({
      meals: { data: [], error: null },
      user_current_supplements: { data: [], error: null },
      nutrient_intake_ledger: { data: null, error: null },
    });
    const rows = await buildNutrientIntakeLedger('u1', {
      supplementOverride: [{ nutrient: 'iron', amount: 10 }],
    });
    const iron = rows.find((r) => r.nutrient === 'iron') as Record<string, unknown>;
    expect(iron.deficiency_gap ?? null).toBeNull();
  });

  it('returns [] (fail-open) when the whole reconcile throws', async () => {
    mocks.adminFrom.mockImplementation(() => {
      throw new Error('catastrophe');
    });
    const rows = await buildNutrientIntakeLedger('u1');
    expect(rows).toEqual([]);
  });
});
