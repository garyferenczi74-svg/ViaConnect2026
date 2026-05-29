// Prompt #170 Phase 1f: density bucket tests.
//
// Verifies that the most-specific bucket wins (mixed_dish for "chicken curry"
// over solid_protein) and that unknown foods fall to the neutral 0.90 default.

import { describe, it, expect } from 'vitest';
import { densityFor, DENSITY_BUCKETS } from '../density-table';

describe('densityFor', () => {
  it('classifies grilled chicken breast as solid_protein at 1.05', () => {
    const d = densityFor('grilled chicken breast');
    expect(d.category).toBe('solid_protein');
    expect(d.densityGPerMl).toBeCloseTo(1.05, 5);
  });

  it('classifies basmati rice as solid_starch at 0.85', () => {
    const d = densityFor('basmati rice');
    expect(d.category).toBe('solid_starch');
    expect(d.densityGPerMl).toBeCloseTo(0.85, 5);
  });

  it('classifies green salad as vegetable at 0.60', () => {
    const d = densityFor('green salad');
    expect(d.category).toBe('vegetable');
    expect(d.densityGPerMl).toBeCloseTo(0.60, 5);
  });

  it('classifies orange juice as liquid_water at 1.00 (juice tag wins over fruit)', () => {
    const d = densityFor('orange juice');
    expect(d.category).toBe('liquid_water');
    expect(d.densityGPerMl).toBeCloseTo(1.00, 5);
  });

  it('classifies chicken curry as mixed_dish at 0.95 (curry wins over chicken)', () => {
    const d = densityFor('chicken curry');
    expect(d.category).toBe('mixed_dish');
    expect(d.densityGPerMl).toBeCloseTo(0.95, 5);
  });

  it('classifies hummus as sauce_dressing at 1.05', () => {
    const d = densityFor('hummus');
    expect(d.category).toBe('sauce_dressing');
    expect(d.densityGPerMl).toBeCloseTo(1.05, 5);
  });

  it('falls back to unknown bucket at 0.90 for an unrecognized name', () => {
    const d = densityFor('absolute_unknown_food_xyz');
    expect(d.category).toBe('unknown');
    expect(d.densityGPerMl).toBeCloseTo(0.90, 5);
  });

  it('exposes the full bucket table for verification', () => {
    expect(DENSITY_BUCKETS.length).toBeGreaterThan(0);
    const categories = DENSITY_BUCKETS.map((b) => b.category);
    expect(categories).toContain('solid_protein');
    expect(categories).toContain('solid_starch');
    expect(categories).toContain('vegetable');
    expect(categories).toContain('fruit');
    expect(categories).toContain('liquid_water');
    expect(categories).toContain('liquid_dairy');
    expect(categories).toContain('liquid_oil');
    expect(categories).toContain('mixed_dish');
    expect(categories).toContain('sauce_dressing');
    expect(categories).toContain('snack_crunchy');
    expect(categories).toContain('unknown');
  });
});
