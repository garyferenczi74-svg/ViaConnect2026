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
});
