import { describe, it, expect } from 'vitest';
import { unitToGrams } from '../typical-weights';

describe('unitToGrams', () => {
  it('converts oz to grams', () => expect(unitToGrams('oz', 1, 'avocado')).toBeCloseTo(28.35));
  it('converts g to grams (identity)', () => expect(unitToGrams('g', 50, 'egg')).toBe(50));
  it('converts ml to grams water-density default', () => expect(unitToGrams('ml', 100, 'water')).toBe(100));
  it('returns 50 for one whole egg', () => expect(unitToGrams('whole', 1, 'egg')).toBe(50));
  it('returns 28 for one slice of bread', () => expect(unitToGrams('slice', 1, 'bread')).toBe(28));
  it('returns 200 for one medium avocado', () => expect(unitToGrams('medium', 1, 'avocado')).toBe(200));
  it('returns null for an unknown whole-food it cannot weigh', () => {
    expect(unitToGrams('whole', 1, 'unknown-food-xyz')).toBeNull();
  });
});
