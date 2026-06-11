import { describe, it, expect } from 'vitest';
import { ParsedMealSchema } from '../parsed-meal-schema';

describe('ParsedMealSchema', () => {
  const valid = {
    items: [{ name: 'egg', quantity: 2, unit: 'whole' }],
    confidence: 0.9,
    notes: 'standard breakfast portion',
  };
  it('accepts a valid parse result', () => {
    expect(ParsedMealSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects unit outside the allow-list', () => {
    expect(ParsedMealSchema.safeParse({
      ...valid,
      items: [{ name: 'egg', quantity: 2, unit: 'pinch' }],
    }).success).toBe(false);
  });
  it('accepts an item with optional preparation', () => {
    const ok = ParsedMealSchema.safeParse({
      ...valid,
      items: [{ name: 'egg', quantity: 2, unit: 'whole', preparation: 'fried' }],
    });
    expect(ok.success).toBe(true);
  });
  it('accepts an empty items array for confidence=0.2 ambiguous input', () => {
    expect(ParsedMealSchema.safeParse({ items: [], confidence: 0.2, notes: 'too vague' }).success).toBe(true);
  });

  it('normalizes explicit null preparation and notes (Claude fallback emits nulls)', () => {
    // 2026-06-11 incident: Claude renders the prompt's optional fields as
    // explicit nulls; the schema rejected them and every successful Claude
    // fallback parse was discarded.
    const r = ParsedMealSchema.safeParse({
      items: [
        { name: 'quick oats', quantity: 65, unit: 'g', preparation: null },
        { name: 'protein powder', quantity: 30, unit: 'g', preparation: null },
      ],
      confidence: 0.8,
      notes: null,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.items[0].preparation).toBeUndefined();
      expect(r.data.notes).toBe('');
    }
  });
});
