// Prompt 175g (2026-06-05): resolve-route inference helpers.
//
// Plugin results from DSLD / OpenFoodFacts return ingredients with
// per-ingredient form + amount + unit. The resolve route condenses
// these to the supplement-level form + primary_strength so the
// confirmation panel can pre-fill its top-level Form select and the
// Dosage field. The condensation rules are pure and worth pinning so
// the auto-fill does not silently regress.

import { describe, it, expect } from 'vitest';
import {
  inferFormFromIngredients,
  inferPrimaryStrength,
} from '@/app/api/caq/supplements/resolve/route';

describe('inferFormFromIngredients', () => {
  it('returns the matching primary form token when an ingredient names it', () => {
    expect(inferFormFromIngredients([{ form: 'Vegetable Capsule' }])).toBe('capsule');
    expect(inferFormFromIngredients([{ form: 'Tablet' }])).toBe('tablet');
    expect(inferFormFromIngredients([{ form: 'Softgel' }])).toBe('softgel');
    expect(inferFormFromIngredients([{ form: 'Soft Gel' }])).toBe('softgel');
    expect(inferFormFromIngredients([{ form: 'powder' }])).toBe('powder');
    expect(inferFormFromIngredients([{ form: 'Gummy' }])).toBe('gummy');
  });

  it('returns null when no ingredient has a recognizable form', () => {
    expect(inferFormFromIngredients([{ form: null }, { form: 'Liposomal' }])).toBeNull();
    expect(inferFormFromIngredients([])).toBeNull();
  });

  it('takes the first matching form when ingredients disagree', () => {
    const result = inferFormFromIngredients([
      { form: 'Tablet' },
      { form: 'Capsule' },
    ]);
    expect(result).toBe('tablet');
  });
});

describe('inferPrimaryStrength', () => {
  it('returns the highest-amount ingredient as the strength label', () => {
    expect(
      inferPrimaryStrength([
        { amount: 1000, unit: 'IU' },
        { amount: 5, unit: 'mg' },
      ]),
    ).toBe('1000 IU');
  });

  it('handles a single-ingredient bottle (Vitamin D3 1000 IU)', () => {
    expect(inferPrimaryStrength([{ amount: 1000, unit: 'IU' }])).toBe('1000 IU');
  });

  it('returns null when no ingredient has a numeric amount + unit', () => {
    expect(
      inferPrimaryStrength([
        { amount: null, unit: 'mg' },
        { amount: 100, unit: null },
      ]),
    ).toBeNull();
    expect(inferPrimaryStrength([])).toBeNull();
  });

  it('skips non-finite amounts (NaN, Infinity) without crashing', () => {
    expect(
      inferPrimaryStrength([
        { amount: Number.NaN, unit: 'mg' },
        { amount: 600, unit: 'mg' },
      ]),
    ).toBe('600 mg');
  });
});
