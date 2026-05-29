// Prompt #170 Phase 1c: tests for the multi-provider reconcile module.
// Per Prompt 170 §2.2, primary then secondary then tertiary providers are
// merged on overlapping bounding boxes via confidence-weighted voting.
// These tests cover IoU correctness, loose-label matching, single-provider
// passthrough, two-provider merge, two-provider disagreement, empty-primary
// failure, and three-provider weighted merge.

import { describe, it, expect } from 'vitest';
import {
  reconcile,
  computeIoU,
  looseLabelEquals,
  computeMeanConfidence,
} from '../reconcile';
import type { BoundingBox, ProviderRecognition, VisionItem } from '../types';

function box(x: number, y: number, w: number, h: number): BoundingBox {
  return { x, y, w, h };
}

function item(
  id: string,
  foodName: string,
  bbox: BoundingBox,
  confidence: number,
  extras: Partial<VisionItem> = {},
): VisionItem {
  return { id, foodName, boundingBox: bbox, confidence, ...extras };
}

function recognition(
  provider: ProviderRecognition['provider'],
  items: VisionItem[],
  latencyMs = 100,
): ProviderRecognition {
  const meanConfidence = items.length === 0
    ? 0
    : items.reduce((s, it) => s + it.confidence, 0) / items.length;
  return { provider, items, latencyMs, meanConfidence };
}

describe('computeIoU', () => {
  it('returns 1 for identical boxes', () => {
    const a = box(0, 0, 10, 10);
    expect(computeIoU(a, a)).toBeCloseTo(1, 5);
  });

  it('returns 0 for non overlapping boxes', () => {
    const a = box(0, 0, 10, 10);
    const b = box(100, 100, 10, 10);
    expect(computeIoU(a, b)).toBe(0);
  });

  it('returns 1/3 for boxes that overlap exactly 50% of their area each', () => {
    // 10x10 boxes overlapping by 5x10 = 50 area each.
    // intersection 50, union = 100 + 100 - 50 = 150, IoU = 50/150 = 1/3.
    const a = box(0, 0, 10, 10);
    const b = box(5, 0, 10, 10);
    expect(computeIoU(a, b)).toBeCloseTo(1 / 3, 5);
  });

  it('returns 0 for boxes sharing only an edge', () => {
    const a = box(0, 0, 10, 10);
    const b = box(10, 0, 10, 10);
    expect(computeIoU(a, b)).toBe(0);
  });

  it('returns IoU 1/7 for partial corner overlap', () => {
    // 10x10 at (0,0) and 10x10 at (5,5). Intersection = 5x5 = 25.
    // Union = 100 + 100 - 25 = 175. IoU = 25/175 = 1/7.
    const a = box(0, 0, 10, 10);
    const b = box(5, 5, 10, 10);
    expect(computeIoU(a, b)).toBeCloseTo(1 / 7, 5);
  });

  it('returns 0 when either box has zero area', () => {
    expect(computeIoU(box(0, 0, 0, 10), box(0, 0, 10, 10))).toBe(0);
    expect(computeIoU(box(0, 0, 10, 10), box(0, 0, 10, 0))).toBe(0);
  });
});

describe('looseLabelEquals', () => {
  it('returns true for case insensitive exact match after trim', () => {
    expect(looseLabelEquals('Grilled chicken', 'grilled chicken')).toBe(true);
    expect(looseLabelEquals('  Pizza ', 'pizza')).toBe(true);
  });

  it('returns true for one-edit typo via levenshtein <= 2', () => {
    expect(looseLabelEquals('Chicken', 'Chickn')).toBe(true);
  });

  it('returns true for two-edit typo via levenshtein <= 2', () => {
    expect(looseLabelEquals('Chicken', 'Chiken')).toBe(true);
  });

  it('returns false for clearly different labels', () => {
    expect(looseLabelEquals('Pizza', 'Burger')).toBe(false);
    expect(looseLabelEquals('Salad', 'Steak')).toBe(false);
  });
});

describe('reconcile', () => {
  it('passes through primary items unchanged when no secondary is provided', () => {
    const primary = recognition('logmeal', [
      item('p1', 'Pizza', box(10, 10, 50, 50), 0.9),
      item('p2', 'Salad', box(100, 10, 50, 50), 0.8),
    ]);
    const result = reconcile({ primary });
    expect(result.items.length).toBe(2);
    expect(result.items[0].foodName).toBe('Pizza');
    expect(result.items[0].confidence).toBeCloseTo(0.9, 5);
    expect(result.items[1].foodName).toBe('Salad');
    expect(result.providerPrimary).toBe('logmeal');
    expect(result.providerSecondary).toBeUndefined();
    expect(result.providerTertiary).toBeUndefined();
    expect(result.warnings.length).toBe(0);
    // mean confidence is mean of result items.
    expect(result.mealConfidence).toBeCloseTo((0.9 + 0.8) / 2, 5);
  });

  it('merges matching labels at the same bbox with weighted confidence and no warning', () => {
    const primary = recognition('logmeal', [
      item('p1', 'Pizza', box(10, 10, 50, 50), 0.8),
    ]);
    const secondary = recognition('gemini', [
      item('s1', 'pizza', box(10, 10, 50, 50), 0.6),
    ]);
    const result = reconcile({ primary, secondary });
    expect(result.items.length).toBe(1);
    // Weighted: 0.8 * 0.6 + 0.6 * 0.4 = 0.48 + 0.24 = 0.72
    expect(result.items[0].confidence).toBeCloseTo(0.72, 5);
    expect(result.items[0].foodName).toBe('Pizza');
    expect(result.warnings.length).toBe(0);
    expect(result.providerPrimary).toBe('logmeal');
    expect(result.providerSecondary).toBe('gemini');
  });

  it('keeps primary name + emits warning when secondary disagrees at same bbox', () => {
    const primary = recognition('logmeal', [
      item('p1', 'Pizza', box(10, 10, 50, 50), 0.7),
    ]);
    const secondary = recognition('gemini', [
      item('s1', 'Burger', box(10, 10, 50, 50), 0.65),
    ]);
    const result = reconcile({ primary, secondary });
    expect(result.items.length).toBe(1);
    expect(result.items[0].foodName).toBe('Pizza');
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toMatch(/providers disagreed/i);
    expect(result.warnings[0]).toMatch(/Pizza/);
    expect(result.warnings[0]).toMatch(/Burger/);
  });

  it('appends non overlapping secondary items at discounted confidence', () => {
    const primary = recognition('logmeal', [
      item('p1', 'Pizza', box(10, 10, 50, 50), 0.8),
    ]);
    const secondary = recognition('gemini', [
      item('s1', 'Salad', box(200, 200, 50, 50), 0.7),
    ]);
    const result = reconcile({ primary, secondary });
    expect(result.items.length).toBe(2);
    const salad = result.items.find((it) => it.foodName === 'Salad');
    expect(salad).toBeDefined();
    if (salad) {
      // 0.7 discounted by 0.85 = 0.595
      expect(salad.confidence).toBeCloseTo(0.7 * 0.85, 5);
    }
  });

  it('throws AIRouteError NO_RECOGNITION on empty primary', () => {
    const primary = recognition('logmeal', []);
    expect(() => reconcile({ primary })).toThrow();
    try {
      reconcile({ primary });
    } catch (err) {
      expect(err).toMatchObject({ code: 'NO_RECOGNITION' });
    }
  });

  it('merges three providers with weights 0.5 / 0.3 / 0.2', () => {
    const primary = recognition('logmeal', [
      item('p1', 'Pizza', box(10, 10, 50, 50), 0.5),
    ]);
    const secondary = recognition('gemini', [
      item('s1', 'pizza', box(10, 10, 50, 50), 0.7),
    ]);
    const tertiary = recognition('claude_vision', [
      item('t1', 'pizza', box(10, 10, 50, 50), 0.9),
    ]);
    const result = reconcile({ primary, secondary, tertiary });
    expect(result.items.length).toBe(1);
    // Weighted: 0.5 * 0.5 + 0.7 * 0.3 + 0.9 * 0.2 = 0.25 + 0.21 + 0.18 = 0.64
    expect(result.items[0].confidence).toBeCloseTo(0.64, 5);
    expect(result.providerPrimary).toBe('logmeal');
    expect(result.providerSecondary).toBe('gemini');
    expect(result.providerTertiary).toBe('claude_vision');
  });

  it('clamps weighted confidence to [0, 1]', () => {
    // Hypothetical inputs that would push above 1 if not clamped.
    const primary = recognition('logmeal', [
      item('p1', 'Pizza', box(10, 10, 50, 50), 1.0),
    ]);
    const secondary = recognition('gemini', [
      item('s1', 'pizza', box(10, 10, 50, 50), 1.0),
    ]);
    const result = reconcile({ primary, secondary });
    expect(result.items[0].confidence).toBeLessThanOrEqual(1);
    expect(result.items[0].confidence).toBeGreaterThanOrEqual(0);
  });

  it('prefers the higher-confidence providers cookingMethod and cuisineTag on merge', () => {
    const primary = recognition('logmeal', [
      item('p1', 'Pizza', box(10, 10, 50, 50), 0.5, {
        cookingMethod: 'baked',
        cuisineTag: 'mediterranean',
      }),
    ]);
    const secondary = recognition('gemini', [
      item('s1', 'pizza', box(10, 10, 50, 50), 0.9, {
        cookingMethod: 'grilled',
        cuisineTag: 'north_american',
      }),
    ]);
    const result = reconcile({ primary, secondary });
    expect(result.items[0].cookingMethod).toBe('grilled');
    expect(result.items[0].cuisineTag).toBe('north_american');
  });

  it('treats below-threshold IoU as separate items even when labels match', () => {
    const primary = recognition('logmeal', [
      item('p1', 'Apple', box(0, 0, 10, 10), 0.8),
    ]);
    // Tiny corner overlap (IoU ~ 1/7 = 0.143 below default 0.4 threshold).
    const secondary = recognition('gemini', [
      item('s1', 'Apple', box(5, 5, 10, 10), 0.7),
    ]);
    const result = reconcile({ primary, secondary });
    expect(result.items.length).toBe(2);
  });
});

// Prompt #170a supplement §18.2: portion-weighted aggregation tests.
describe('computeMeanConfidence', () => {
  it('returns 0 for an empty items array', () => {
    expect(computeMeanConfidence([])).toBe(0);
  });

  it('returns the single items confidence when only one item present', () => {
    const items: VisionItem[] = [
      item('p1', 'Pizza', box(0, 0, 10, 10), 0.73),
    ];
    expect(computeMeanConfidence(items)).toBeCloseTo(0.73, 5);
  });

  it('weights two items by their portion grams', () => {
    // 300g item at confidence 0.6 + 100g item at confidence 0.9
    // = (0.6 * 300 + 0.9 * 100) / (300 + 100) = (180 + 90) / 400 = 0.675
    const items: VisionItem[] = [
      item('p1', 'Pasta', box(0, 0, 10, 10), 0.6, { portionGramsHint: 300 }),
      item('p2', 'Sauce', box(0, 0, 10, 10), 0.9, { portionGramsHint: 100 }),
    ];
    expect(computeMeanConfidence(items)).toBeCloseTo(0.675, 5);
  });

  it('falls back to weight 1.0 when portionGramsHint is undefined', () => {
    // Two items both at weight 1.0 -> simple arithmetic mean.
    const items: VisionItem[] = [
      item('p1', 'A', box(0, 0, 10, 10), 0.4),
      item('p2', 'B', box(0, 0, 10, 10), 0.8),
    ];
    expect(computeMeanConfidence(items)).toBeCloseTo(0.6, 5);
  });

  it('falls back to weight 1.0 when portionGramsHint is zero or negative', () => {
    const items: VisionItem[] = [
      item('p1', 'A', box(0, 0, 10, 10), 0.4, { portionGramsHint: 0 }),
      item('p2', 'B', box(0, 0, 10, 10), 0.8, { portionGramsHint: -5 }),
    ];
    expect(computeMeanConfidence(items)).toBeCloseTo(0.6, 5);
  });

  it('mixes weighted and fallback items in the same call', () => {
    // 500g item conf 0.5 + portion-less item conf 1.0 (weight 1.0)
    // = (0.5 * 500 + 1.0 * 1) / (500 + 1) = 251 / 501
    const items: VisionItem[] = [
      item('p1', 'Bowl', box(0, 0, 10, 10), 0.5, { portionGramsHint: 500 }),
      item('p2', 'Garnish', box(0, 0, 10, 10), 1.0),
    ];
    expect(computeMeanConfidence(items)).toBeCloseTo(251 / 501, 5);
  });
});
