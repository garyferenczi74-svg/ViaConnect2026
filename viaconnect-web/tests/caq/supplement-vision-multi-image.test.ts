// Prompt 175h Section 2.1 + 2.2 (2026-06-05): multi-image vision route
// helpers.
//
// normalizeImagesInput and mergeByRole both run before any provider
// call, so their behavior is pinned here without dispatching the
// network-fetching POST handler. The byte-floor and provider-routing
// integration paths are exercised by the existing 175b + 175f route
// tests; this file targets the structural choices added in 175h.

import { describe, it, expect } from 'vitest';
import {
  normalizeImagesInput,
  mergeByRole,
} from '@/app/api/ai/supplement-vision/route';
import type {
  ExtractionResult,
  ExtractedSupplement,
} from '@/lib/caq/supplement-extraction/types';

function item(
  overrides: Partial<ExtractedSupplement> = {},
): ExtractedSupplement {
  return {
    rawText: 'Test',
    name: 'Test Ingredient',
    brand: null,
    dose: null,
    unit: null,
    form: null,
    confidence: 0.8,
    ...overrides,
  };
}

function result(
  items: ExtractedSupplement[],
  overrides: Partial<ExtractionResult> = {},
): ExtractionResult {
  return {
    items,
    modelTier: 'sonnet',
    escalated: false,
    latencyMs: 100,
    outcomeCode: 'success',
    ...overrides,
  };
}

describe('normalizeImagesInput', () => {
  it('returns the new images array when present and valid', () => {
    const out = normalizeImagesInput({
      images: [
        { imageBase64: 'A'.repeat(20), mimeType: 'image/jpeg', role: 'front' },
        { imageBase64: 'B'.repeat(20), mimeType: 'image/jpeg', role: 'ingredients' },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0].role).toBe('front');
    expect(out[1].role).toBe('ingredients');
  });

  it('falls back to legacy single-image shape when images is absent', () => {
    const out = normalizeImagesInput({
      imageBase64: 'A'.repeat(20),
      mimeType: 'image/png',
    });
    expect(out).toHaveLength(1);
    expect(out[0].imageBase64).toBe('A'.repeat(20));
    expect(out[0].role).toBeNull();
  });

  it('skips entries with no imageBase64', () => {
    const out = normalizeImagesInput({
      images: [
        { imageBase64: '', mimeType: 'image/jpeg', role: 'front' },
        { imageBase64: 'B'.repeat(20), mimeType: 'image/jpeg', role: 'ingredients' },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('ingredients');
  });

  it('rejects unknown role values by setting role to null', () => {
    const out = normalizeImagesInput({
      images: [{ imageBase64: 'A'.repeat(20), mimeType: 'image/jpeg', role: 'back_panel' }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].role).toBeNull();
  });

  it('returns empty array for invalid / null payloads', () => {
    expect(normalizeImagesInput(null)).toEqual([]);
    expect(normalizeImagesInput(undefined)).toEqual([]);
    expect(normalizeImagesInput({})).toEqual([]);
    expect(normalizeImagesInput({ images: [] })).toEqual([]);
  });
});

describe('mergeByRole', () => {
  const frontInput = { imageBase64: 'A', mimeType: 'image/jpeg', role: 'front' as const };
  const ingredientsInput = { imageBase64: 'B', mimeType: 'image/jpeg', role: 'ingredients' as const };

  it('returns null when every image failed', () => {
    expect(mergeByRole([])).toBeNull();
    expect(
      mergeByRole([
        { input: frontInput, result: null },
        { input: ingredientsInput, result: null },
      ]),
    ).toBeNull();
  });

  it('returns the first non-null result when all results have empty items', () => {
    const emptyResult = result([], { outcomeCode: 'no_items' });
    const merged = mergeByRole([
      { input: frontInput, result: emptyResult },
    ]);
    expect(merged).not.toBeNull();
    expect(merged!.items).toHaveLength(0);
    expect(merged!.outcomeCode).toBe('no_items');
  });

  it('uses the single usable image when only one succeeded', () => {
    const goodResult = result([item({ name: 'Vitamin D3', brand: 'TestBrand' })]);
    const merged = mergeByRole([
      { input: frontInput, result: goodResult },
      { input: ingredientsInput, result: null },
    ]);
    expect(merged?.items).toHaveLength(1);
    expect(merged?.items[0].name).toBe('Vitamin D3');
  });

  it('merges ingredients items as canonical with front brand backfill', () => {
    const frontResult = result([
      item({ name: 'Multi Front Read', brand: 'AcmeLabs', confidence: 0.7 }),
    ]);
    const ingredientsResult = result([
      item({ name: 'Vitamin D3', brand: null, dose: 1000, unit: 'IU' }),
      item({ name: 'Vitamin K2', brand: null, dose: 100, unit: 'mcg' }),
    ]);
    const merged = mergeByRole([
      { input: frontInput, result: frontResult },
      { input: ingredientsInput, result: ingredientsResult },
    ]);
    expect(merged?.items).toHaveLength(2);
    // Ingredient items become canonical
    expect(merged?.items[0].name).toBe('Vitamin D3');
    expect(merged?.items[1].name).toBe('Vitamin K2');
    // Front brand backfills into ingredient rows that had none
    expect(merged?.items[0].brand).toBe('AcmeLabs');
    expect(merged?.items[1].brand).toBe('AcmeLabs');
  });

  it('does not overwrite an existing brand on the ingredient row', () => {
    const frontResult = result([
      item({ name: 'Front Read', brand: 'FrontBrand' }),
    ]);
    const ingredientsResult = result([
      item({ name: 'Vitamin D3', brand: 'IngBrand', dose: 1000, unit: 'IU' }),
    ]);
    const merged = mergeByRole([
      { input: frontInput, result: frontResult },
      { input: ingredientsInput, result: ingredientsResult },
    ]);
    expect(merged?.items[0].brand).toBe('IngBrand');
  });

  it('with no role hints treats first usable as ingredients and second as front', () => {
    const a = result([item({ name: 'A-ingredient', brand: null })]);
    const b = result([item({ name: 'B-front', brand: 'BBrand' })]);
    const merged = mergeByRole([
      { input: { imageBase64: 'x', mimeType: 'image/jpeg', role: null }, result: a },
      { input: { imageBase64: 'y', mimeType: 'image/jpeg', role: null }, result: b },
    ]);
    // First usable (a) becomes ingredients-source; brand from b backfills.
    expect(merged?.items[0].name).toBe('A-ingredient');
    expect(merged?.items[0].brand).toBe('BBrand');
  });
});
