// Prompt #170 Phase 1e: tests for the Open Food Facts (OFF) client.
//
// OFF is the third source in the resolver cascade after Curated and USDA.
// Tests cover: barcode happy path with sodium and cholesterol grams->mg
// conversion, 404 -> null (expected miss), 5xx -> API_DOWN, malformed JSON ->
// MALFORMED_RESPONSE, missing calories_kcal -> null, text search returns first
// parseable result.
//
// We also lint-grep the source file to confirm no Supabase auth getter leaks.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { lookupByBarcode, searchByText } from '../open-food-facts';

describe('lookupByBarcode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mapped OFFNutrients on a 200 with full nutriments (sodium and cholesterol grams -> mg)', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: 'Olive Oil',
            brands: 'Acme',
            code: '1234567890123',
            nutriments: {
              'energy-kcal_100g': 884,
              proteins_100g: 0,
              carbohydrates_100g: 0,
              fat_100g: 100,
              fiber_100g: 0,
              sugars_100g: 0,
              sodium_100g: 0.002, // 2 mg in grams
              cholesterol_100g: 0.001, // 1 mg in grams
            },
          },
        }),
        { status: 200 },
      ),
    );

    const result = await lookupByBarcode('1234567890123', {
      requestId: 'req-1',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });

    expect(result).not.toBeNull();
    expect(result!.source).toBe('open_food_facts');
    expect(result!.foodName).toBe('Olive Oil');
    expect(result!.brandName).toBe('Acme');
    expect(result!.barcode).toBe('1234567890123');
    expect(result!.per100g.calories_kcal).toBe(884);
    expect(result!.per100g.fat_g).toBe(100);
    expect(result!.per100g.sodium_mg).toBeCloseTo(2, 5);
    expect(result!.per100g.cholesterol_mg).toBeCloseTo(1, 5);
  });

  it('returns null on 404 (not found is expected, not an error)', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 0, status_verbose: 'product not found' }), {
        status: 404,
      }),
    );
    const result = await lookupByBarcode('0000000000000', {
      requestId: 'req-404',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).toBeNull();
  });

  it('returns null when OFF responds 200 status:0 (product not in db)', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), { status: 200 }),
    );
    const result = await lookupByBarcode('0000000000000', {
      requestId: 'req-status-0',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).toBeNull();
  });

  it('throws AIRouteError API_DOWN on 5xx', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('upstream broken', { status: 503 }),
    );
    await expect(
      lookupByBarcode('1234567890123', {
        requestId: 'req-5xx',
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'API_DOWN' });
  });

  it('throws AIRouteError MALFORMED_RESPONSE on bad JSON', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('not-json {{{', { status: 200 }),
    );
    await expect(
      lookupByBarcode('1234567890123', {
        requestId: 'req-bad-json',
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });

  it('returns null when calories_kcal is missing', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: 'Empty Product',
            code: '1234567890123',
            nutriments: {
              proteins_100g: 10,
              fat_100g: 5,
            },
          },
        }),
        { status: 200 },
      ),
    );
    const result = await lookupByBarcode('1234567890123', {
      requestId: 'req-no-cal',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).toBeNull();
  });

  it('returns null when calories_kcal is not a finite number', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: 'NaN Product',
            code: '1234567890123',
            nutriments: {
              'energy-kcal_100g': 'not-a-number',
              proteins_100g: 10,
            },
          },
        }),
        { status: 200 },
      ),
    );
    const result = await lookupByBarcode('1234567890123', {
      requestId: 'req-nan',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).toBeNull();
  });

  it('survives missing optional micronutrient fields', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: 'Minimal Product',
            code: '1234567890123',
            nutriments: {
              'energy-kcal_100g': 200,
              proteins_100g: 10,
              carbohydrates_100g: 30,
              fat_100g: 5,
            },
          },
        }),
        { status: 200 },
      ),
    );
    const result = await lookupByBarcode('1234567890123', {
      requestId: 'req-minimal',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).not.toBeNull();
    expect(result!.per100g.calories_kcal).toBe(200);
    expect(result!.per100g.fiber_g).toBeUndefined();
    expect(result!.per100g.sodium_mg).toBeUndefined();
  });
});

describe('searchByText', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mapped OFFNutrients from the first parseable result', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          products: [
            {
              product_name: 'First Product',
              brands: 'BrandA',
              code: '111',
              nutriments: {
                'energy-kcal_100g': 100,
                proteins_100g: 5,
                carbohydrates_100g: 15,
                fat_100g: 2,
              },
            },
            {
              product_name: 'Second Product',
              brands: 'BrandB',
              code: '222',
              nutriments: {
                'energy-kcal_100g': 200,
                proteins_100g: 10,
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const result = await searchByText('olive oil', {
      requestId: 'req-search-1',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).not.toBeNull();
    expect(result!.foodName).toBe('First Product');
    expect(result!.per100g.calories_kcal).toBe(100);
  });

  it('skips products with missing calories and returns the next parseable one', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          products: [
            {
              product_name: 'Missing Cal',
              code: '111',
              nutriments: { proteins_100g: 5 },
            },
            {
              product_name: 'Good Product',
              code: '222',
              nutriments: {
                'energy-kcal_100g': 250,
                proteins_100g: 8,
                carbohydrates_100g: 20,
                fat_100g: 12,
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const result = await searchByText('whatever', {
      requestId: 'req-search-skip',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).not.toBeNull();
    expect(result!.foodName).toBe('Good Product');
  });

  it('returns null when no products are returned', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ products: [] }), { status: 200 }),
    );
    const result = await searchByText('unicornmeat', {
      requestId: 'req-empty',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).toBeNull();
  });

  it('returns null when products is missing entirely', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const result = await searchByText('whatever', {
      requestId: 'req-no-products',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).toBeNull();
  });

  it('throws API_DOWN on 5xx', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('upstream broken', { status: 500 }),
    );
    await expect(
      searchByText('olive oil', {
        requestId: 'req-5xx',
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'API_DOWN' });
  });

  it('throws MALFORMED_RESPONSE on bad JSON', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('not json', { status: 200 }),
    );
    await expect(
      searchByText('olive oil', {
        requestId: 'req-bad-json',
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });
});

describe('open-food-facts source provenance', () => {
  it('does not import any Supabase auth getter (lint-grep, code only, comments stripped)', () => {
    const raw = readFileSync(
      __dirname.replace(/__tests__$/, '') + '/open-food-facts.ts',
      'utf8',
    );
    // Strip line comments and block comments so privacy NOTEs do not trip the
    // lint. We only care that runtime code does not reference auth or PII.
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/auth\.uid/);
    expect(src).not.toMatch(/getUser\b/);
    expect(src).not.toMatch(/createServerClient/);
    expect(src).not.toMatch(/createAdminClient/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabase/);
    expect(src).not.toMatch(/\buser_id\b/);
    expect(src).not.toMatch(/\bemail\b/);
  });
});
