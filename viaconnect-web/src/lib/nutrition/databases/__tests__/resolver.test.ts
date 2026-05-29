// Prompt #170 Phase 1e: tests for the nutrient resolver cascade.
//
// Order per Prompt 170 §2.2 step 6 + 170a §5.3:
//   Curated -> USDA -> OFF barcode -> OFF text -> vision built-in -> null.
//
// Tests cover:
//   - All four sources miss + no vision fallback -> null.
//   - Curated hit short-circuits the rest (other sources NOT called).
//   - Curated miss, USDA hit -> 'usda_fdc'.
//   - Curated + USDA miss, OFF barcode hit -> 'open_food_facts'.
//   - Curated + USDA + OFF miss, vision fallback present -> 'vision_provider'.
//   - USDA throws -> resolver continues to OFF without throwing.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResolveOpts } from '../resolver';

// ----------------------------------------------------------------------------
// Module mocks. Each downstream client is replaced by a spy whose behavior the
// test sets at fixture time. We mock the database clients via their direct
// module paths so the resolver's imports resolve to the spies.
// ----------------------------------------------------------------------------

const curatedSpy = vi.fn();
vi.mock('../farmceutica-curated', () => ({
  lookupCurated: (...args: unknown[]) => curatedSpy(...args),
}));

const offBarcodeSpy = vi.fn();
const offSearchSpy = vi.fn();
vi.mock('../open-food-facts', () => ({
  lookupByBarcode: (...args: unknown[]) => offBarcodeSpy(...args),
  searchByText: (...args: unknown[]) => offSearchSpy(...args),
}));

const usdaSpy = vi.fn();
vi.mock('../../usda-client', () => ({
  lookupFood: (...args: unknown[]) => usdaSpy(...args),
}));

import { resolveNutrients } from '../resolver';

// ----------------------------------------------------------------------------
// Fixture helpers
// ----------------------------------------------------------------------------

function fakeSupabase(): SupabaseClient {
  // The resolver passes opts.supabaseAdmin straight through to the curated
  // client, which we have already mocked. So the supabase client just needs to
  // be a typed placeholder.
  return {} as unknown as SupabaseClient;
}

function curatedHit(name: string): unknown {
  return {
    source: 'farmceutica_curated',
    curatedFoodId: 'cur-' + name,
    foodName: name,
    per100g: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 3 },
  };
}

function usdaHit(name: string): unknown {
  return {
    calories: 165,
    protein_g: 31,
    carbs_g: 0,
    total_fat_g: 4,
    saturated_fat_g: 1.1,
    trans_fat_g: 0,
    omega3_g: 0,
    sugar_g: 0,
    fiber_g: 0,
    source: 'usda',
  };
}

function offBarcodeHit(name: string): unknown {
  return {
    source: 'open_food_facts',
    foodName: name,
    barcode: '1234567890123',
    per100g: { calories_kcal: 884, protein_g: 0, carbs_g: 0, fat_g: 100 },
  };
}

function offTextHit(name: string): unknown {
  return {
    source: 'open_food_facts',
    foodName: name,
    per100g: { calories_kcal: 200, protein_g: 5, carbs_g: 25, fat_g: 8 },
  };
}

function buildOpts(overrides: Partial<ResolveOpts> = {}): ResolveOpts {
  return {
    supabaseAdmin: fakeSupabase(),
    requestId: 'req-resolver',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('resolveNutrients', () => {
  it('returns null when every source misses and no vision fallback', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(null);
    offBarcodeSpy.mockResolvedValue(null);
    offSearchSpy.mockResolvedValue(null);

    const result = await resolveNutrients('mystery food', buildOpts({ barcodeHint: 'abc' }));
    expect(result).toBeNull();
  });

  it('Curated hit short-circuits: returns farmceutica_curated, other sources NOT called', async () => {
    curatedSpy.mockResolvedValue(curatedHit('olive oil'));

    const result = await resolveNutrients('olive oil', buildOpts());
    expect(result).not.toBeNull();
    expect(result!.source).toBe('farmceutica_curated');
    expect(result!.foodName).toBe('olive oil');
    expect(result!.curatedFoodId).toBe('cur-olive oil');

    expect(curatedSpy).toHaveBeenCalledTimes(1);
    expect(usdaSpy).not.toHaveBeenCalled();
    expect(offBarcodeSpy).not.toHaveBeenCalled();
    expect(offSearchSpy).not.toHaveBeenCalled();
  });

  it('Curated miss -> USDA hit returns usda_fdc with per-100g shape from ItemNutrients', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(usdaHit('chicken'));

    const result = await resolveNutrients('chicken breast', buildOpts());
    expect(result).not.toBeNull();
    expect(result!.source).toBe('usda_fdc');
    expect(result!.per100g.calories_kcal).toBe(165);
    expect(result!.per100g.protein_g).toBe(31);
    expect(result!.per100g.fat_g).toBe(4);
    // USDA client does NOT return sodium or cholesterol per spec.
    expect(result!.per100g.sodium_mg).toBeUndefined();
    expect(result!.per100g.cholesterol_mg).toBeUndefined();

    expect(curatedSpy).toHaveBeenCalledTimes(1);
    expect(usdaSpy).toHaveBeenCalledTimes(1);
    expect(offBarcodeSpy).not.toHaveBeenCalled();
    expect(offSearchSpy).not.toHaveBeenCalled();
  });

  it('Curated + USDA miss -> OFF barcode hit returns open_food_facts', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(null);
    offBarcodeSpy.mockResolvedValue(offBarcodeHit('Acme Olive Oil'));

    const result = await resolveNutrients('Acme Olive Oil', buildOpts({ barcodeHint: '1234567890123' }));
    expect(result).not.toBeNull();
    expect(result!.source).toBe('open_food_facts');
    expect(result!.offBarcode).toBe('1234567890123');
    expect(result!.foodName).toBe('Acme Olive Oil');

    expect(offBarcodeSpy).toHaveBeenCalledTimes(1);
    expect(offSearchSpy).not.toHaveBeenCalled();
  });

  it('Curated + USDA + OFF barcode miss -> OFF text hit returns open_food_facts', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(null);
    offBarcodeSpy.mockResolvedValue(null);
    offSearchSpy.mockResolvedValue(offTextHit('granola bar'));

    const result = await resolveNutrients('granola bar', buildOpts({ barcodeHint: '99' }));
    expect(result).not.toBeNull();
    expect(result!.source).toBe('open_food_facts');
    expect(result!.foodName).toBe('granola bar');

    expect(offBarcodeSpy).toHaveBeenCalledTimes(1);
    expect(offSearchSpy).toHaveBeenCalledTimes(1);
  });

  it('skips OFF barcode call entirely when no barcodeHint is provided', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(null);
    offSearchSpy.mockResolvedValue(offTextHit('something'));

    const result = await resolveNutrients('something', buildOpts());
    expect(result).not.toBeNull();
    expect(offBarcodeSpy).not.toHaveBeenCalled();
    expect(offSearchSpy).toHaveBeenCalledTimes(1);
  });

  it('Curated + USDA + OFF miss, vision fallback present -> vision_provider', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(null);
    offBarcodeSpy.mockResolvedValue(null);
    offSearchSpy.mockResolvedValue(null);

    const result = await resolveNutrients('exotic ingredient', buildOpts({
      visionFallback: {
        per100g: { calories_kcal: 250, protein_g: 8, carbs_g: 30, fat_g: 10 },
        micronutrientsPer100g: { vitamin_c_mg: 12 },
      },
    }));
    expect(result).not.toBeNull();
    expect(result!.source).toBe('vision_provider');
    expect(result!.per100g.calories_kcal).toBe(250);
    expect(result!.micronutrientsPer100g).toEqual({ vitamin_c_mg: 12 });
  });

  it('USDA throws (circuit open) -> resolver continues to OFF without throwing', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockRejectedValue(new Error('CircuitBreakerError: usda-api'));
    offBarcodeSpy.mockResolvedValue(null);
    offSearchSpy.mockResolvedValue(offTextHit('fallback food'));

    const result = await resolveNutrients('fallback food', buildOpts());
    expect(result).not.toBeNull();
    expect(result!.source).toBe('open_food_facts');
    expect(usdaSpy).toHaveBeenCalledTimes(1);
    expect(offSearchSpy).toHaveBeenCalledTimes(1);
  });

  it('Curated throws -> resolver still tries USDA, returns usda_fdc on USDA hit', async () => {
    curatedSpy.mockRejectedValue(new Error('supabase down'));
    usdaSpy.mockResolvedValue(usdaHit('chicken'));

    const result = await resolveNutrients('chicken', buildOpts());
    expect(result).not.toBeNull();
    expect(result!.source).toBe('usda_fdc');
  });

  it('OFF barcode throws -> resolver continues to OFF text', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(null);
    offBarcodeSpy.mockRejectedValue(new Error('OFF API_DOWN'));
    offSearchSpy.mockResolvedValue(offTextHit('text-hit'));

    const result = await resolveNutrients('thing', buildOpts({ barcodeHint: '111' }));
    expect(result).not.toBeNull();
    expect(result!.source).toBe('open_food_facts');
    expect(result!.foodName).toBe('text-hit');
  });

  it('Vision fallback only triggers when ALL upstream sources miss (not when any throws and a later one hits)', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(usdaHit('grain'));

    const result = await resolveNutrients('grain', buildOpts({
      visionFallback: {
        per100g: { calories_kcal: 999, protein_g: 0, carbs_g: 0, fat_g: 0 },
      },
    }));
    // USDA hit should win; vision fallback should not be returned.
    expect(result!.source).toBe('usda_fdc');
    expect(result!.per100g.calories_kcal).toBe(165);
  });

  it('passes cuisineTagHint through to curated lookup', async () => {
    curatedSpy.mockResolvedValue(null);
    usdaSpy.mockResolvedValue(null);
    offBarcodeSpy.mockResolvedValue(null);
    offSearchSpy.mockResolvedValue(null);

    await resolveNutrients('kimchi', buildOpts({ cuisineTagHint: 'east_asian' }));
    const firstCallArgs = curatedSpy.mock.calls[0];
    expect(firstCallArgs[0]).toBe('kimchi');
    expect(firstCallArgs[1]).toMatchObject({
      cuisineTagHint: 'east_asian',
      requestId: 'req-resolver',
    });
  });
});

describe('resolver source provenance', () => {
  it('does not import any Supabase auth getter (lint-grep, code only)', () => {
    const raw = readFileSync(
      __dirname.replace(/__tests__$/, '') + '/resolver.ts',
      'utf8',
    );
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/auth\.uid/);
    expect(src).not.toMatch(/getUser\b/);
    expect(src).not.toMatch(/createServerClient/);
    expect(src).not.toMatch(/createAdminClient/);
    expect(src).not.toMatch(/\buser_id\b/);
    expect(src).not.toMatch(/\bemail\b/);
  });
});
