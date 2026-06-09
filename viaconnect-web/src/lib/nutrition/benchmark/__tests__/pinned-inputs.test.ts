import { describe, it, expect } from 'vitest';
import { loadBenchmarkBasket } from '../basket';
import { PINNED_INPUTS } from '../pinned-inputs';
import { ParsedItemSchema } from '../../parsed-meal-schema';

describe('pinned inputs', () => {
  const basket = loadBenchmarkBasket();

  it('has a pin for every basket item', () => {
    for (const item of basket.items) {
      expect(PINNED_INPUTS[item.id], `missing pin for ${item.id}`).toBeDefined();
    }
  });

  it('has no stray pins absent from the basket', () => {
    const ids = new Set(basket.items.map((i) => i.id));
    for (const id of Object.keys(PINNED_INPUTS)) {
      expect(ids.has(id), `stray pin ${id}`).toBe(true);
    }
  });

  it('every parsed item is schema-valid and the list is non-empty', () => {
    for (const item of basket.items) {
      const pin = PINNED_INPUTS[item.id];
      expect(pin.parsed.length).toBeGreaterThan(0);
      for (const parsed of pin.parsed) {
        expect(
          ParsedItemSchema.safeParse(parsed).success,
          `${item.id}: ${parsed.name}`
        ).toBe(true);
      }
    }
  });

  it('every dual-logged item has at least one detection', () => {
    for (const item of basket.items) {
      if (item.dual_logged) {
        const pin = PINNED_INPUTS[item.id];
        expect(pin.detection, `${item.id} is dual but has no detection`).toBeDefined();
        expect(pin.detection?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
