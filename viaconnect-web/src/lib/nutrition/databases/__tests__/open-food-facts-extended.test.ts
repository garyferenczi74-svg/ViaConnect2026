// Prompt 170l Phase 1c-4: tests for the lookupProductByBarcode extension.
//
// The Phase 1a augment to open-food-facts.ts added lookupProductByBarcode +
// the OFFProduct richer return type with a `fields=` query parameter to
// minimize OFF API payload per spec §3.5. The existing lookupByBarcode and
// OFFNutrients shape are unchanged and tested by open-food-facts.test.ts;
// this file covers the new function's contract.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupProductByBarcode } from '../open-food-facts';

describe('lookupProductByBarcode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns OFFProduct on a 200 with full extended fields', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: 'Granola Bar',
            brands: 'TestBrand',
            code: '036000291452',
            nutriments: {
              'energy-kcal_100g': 420,
              proteins_100g: 8,
              carbohydrates_100g: 60,
              fat_100g: 16,
              fiber_100g: 5,
              sugars_100g: 25,
              sodium_100g: 0.15,
            },
            image_url: 'https://images.openfoodfacts.org/granola.jpg',
            nutriscore_grade: 'c',
            nova_group: 4,
            ecoscore_grade: 'b',
            ingredients_text: 'oats, sugar, oil, almonds',
            allergens_tags: ['en:nuts', 'en:gluten'],
            serving_size: '24 g',
            completeness: 0.92,
          },
        }),
        { status: 200 },
      ),
    );

    const result = await lookupProductByBarcode('036000291452', {
      requestId: 'req-1',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('036000291452');
    expect(result!.product_name).toBe('Granola Bar');
    expect(result!.brands).toBe('TestBrand');
    expect(result!.nutriments).toEqual({
      'energy-kcal_100g': 420,
      proteins_100g: 8,
      carbohydrates_100g: 60,
      fat_100g: 16,
      fiber_100g: 5,
      sugars_100g: 25,
      sodium_100g: 0.15,
    });
    expect(result!.image_url).toBe('https://images.openfoodfacts.org/granola.jpg');
    expect(result!.nutriscore_grade).toBe('c');
    expect(result!.nova_group).toBe(4);
    expect(result!.ecoscore_grade).toBe('b');
    expect(result!.allergens_tags).toEqual(['en:nuts', 'en:gluten']);
    expect(result!.serving_size).toBe('24 g');
    expect(result!.completeness).toBe(0.92);
  });

  it('includes the fields= query parameter on the request URL', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), { status: 200 }),
    );
    await lookupProductByBarcode('0123456789012', {
      requestId: 'req-2',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    const calledUrl = fetchStub.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('?fields=');
    expect(calledUrl).toContain('nova_group');
    expect(calledUrl).toContain('nutriscore_grade');
    expect(calledUrl).toContain('allergens_tags');
    expect(calledUrl).toContain('completeness');
  });

  it('returns null on a 404 (expected miss)', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('not found', { status: 404 }),
    );
    const result = await lookupProductByBarcode('0123456789012', {
      requestId: 'req-3',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).toBeNull();
  });

  it('returns null on a status:0 200 (OFF not-found shape)', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), { status: 200 }),
    );
    const result = await lookupProductByBarcode('0123456789012', {
      requestId: 'req-4',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });
    expect(result).toBeNull();
  });

  it('throws AIRouteError on a 5xx response', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('upstream is broken', { status: 503 }),
    );
    await expect(
      lookupProductByBarcode('0123456789012', {
        requestId: 'req-5',
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toThrow(/off|503/i);
  });

  it('returns null fields when optional metadata is missing on the OFF row', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: 'Mystery Bar',
            code: '0123456789012',
            // nutriments only; no image_url, nutriscore, nova, ecoscore, etc.
            nutriments: {
              'energy-kcal_100g': 300,
            },
          },
        }),
        { status: 200 },
      ),
    );

    const result = await lookupProductByBarcode('0123456789012', {
      requestId: 'req-6',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });

    expect(result).not.toBeNull();
    expect(result!.product_name).toBe('Mystery Bar');
    expect(result!.brands).toBeNull();
    expect(result!.image_url).toBeNull();
    expect(result!.nutriscore_grade).toBeNull();
    expect(result!.nova_group).toBeNull();
    expect(result!.ecoscore_grade).toBeNull();
    expect(result!.ingredients_text).toBeNull();
    expect(result!.allergens_tags).toBeNull();
    expect(result!.serving_size).toBeNull();
    expect(result!.completeness).toBeNull();
    expect(result!.nutriments).toEqual({ 'energy-kcal_100g': 300 });
  });

  it('falls back to the barcode arg when OFF omits code on the row', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: 'No Code Product',
            nutriments: { 'energy-kcal_100g': 200 },
          },
        }),
        { status: 200 },
      ),
    );

    const result = await lookupProductByBarcode('0123456789012', {
      requestId: 'req-7',
      fetch: fetchStub as unknown as typeof globalThis.fetch,
    });

    expect(result).not.toBeNull();
    expect(result!.code).toBe('0123456789012');
  });

  it('throws AIRouteError on malformed JSON', async () => {
    const fetchStub = vi.fn().mockResolvedValue(
      new Response('not json at all', { status: 200 }),
    );
    await expect(
      lookupProductByBarcode('0123456789012', {
        requestId: 'req-8',
        fetch: fetchStub as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toThrow(/malformed|off/i);
  });
});
