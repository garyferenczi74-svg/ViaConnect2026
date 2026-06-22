/**
 * Unit tests for src/lib/protocol/phenotypeEnrich.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208a, Module F, Task F4 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';

import {
  matchesAllergen,
  screenAllergens,
  goalRank,
} from '../phenotypeEnrich';

// ---------------------------------------------------------------------------
// matchesAllergen
// ---------------------------------------------------------------------------

describe('matchesAllergen', () => {
  it('returns false for empty allergen list', () => {
    expect(matchesAllergen('Magnesium Glycinate', [])).toBe(false);
    expect(matchesAllergen('', [])).toBe(false);
  });

  it('matches when form contains allergen (case-insensitive)', () => {
    // form "Shellfish-derived CoQ10" contains allergen "shellfish"
    expect(matchesAllergen('Shellfish-derived CoQ10', ['shellfish'])).toBe(true);
    expect(matchesAllergen('CoQ10 (shellfish source)', ['shellfish'])).toBe(true);
  });

  it('matches when allergen contains form (conservative over-exclusion)', () => {
    // allergen "soy protein isolate" contains form substring "soy"
    expect(matchesAllergen('soy', ['soy protein isolate'])).toBe(true);
  });

  it('is case-insensitive in both directions', () => {
    expect(matchesAllergen('Vitamin D3 (Lanolin)', ['lanolin'])).toBe(true);
    expect(matchesAllergen('LANOLIN', ['vitamin d from lanolin'])).toBe(true);
  });

  it('returns false when no allergen matches', () => {
    expect(matchesAllergen('L-methylfolate', ['shellfish', 'soy', 'gluten'])).toBe(false);
    expect(matchesAllergen('Magnesium Glycinate', ['iron', 'fish'])).toBe(false);
  });

  it('matches any allergen in the list (OR semantics)', () => {
    expect(matchesAllergen('fish oil', ['shellfish', 'fish', 'gluten'])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// screenAllergens
// ---------------------------------------------------------------------------

describe('screenAllergens', () => {
  it('removes items whose form matches any allergen', () => {
    const items = [
      { form: 'L-methylfolate', rationale: 'MTHFR' },
      { form: 'CoQ10 (shellfish source)', rationale: 'statin' },
      { form: 'Magnesium Glycinate', rationale: 'PPI' },
    ];
    const result = screenAllergens(items, ['shellfish']);
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.form.includes('shellfish'))).toBeUndefined();
    expect(result.find((i) => i.form === 'L-methylfolate')).toBeDefined();
    expect(result.find((i) => i.form === 'Magnesium Glycinate')).toBeDefined();
  });

  it('returns all items unchanged when allergens is empty', () => {
    const items = [{ form: 'iron', rationale: 'test' }];
    expect(screenAllergens(items, [])).toEqual(items);
  });

  it('returns empty array when all items match an allergen', () => {
    const items = [
      { form: 'fish oil', rationale: 'omega3' },
      { form: 'shellfish CoQ10', rationale: 'statin' },
    ];
    expect(screenAllergens(items, ['fish', 'shellfish'])).toHaveLength(0);
  });

  it('preserves extra properties on items (generic T)', () => {
    const items = [
      { form: 'L-methylfolate', evidenceTier: 2, ruleRsid: 'rs1801133', rationale: 'MTHFR' },
      { form: 'iron (shellfish)', evidenceTier: 1, ruleRsid: 'rs1800562', rationale: 'HFE' },
    ];
    const result = screenAllergens(items, ['shellfish']);
    expect(result).toHaveLength(1);
    expect(result[0].evidenceTier).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// goalRank
// ---------------------------------------------------------------------------

describe('goalRank', () => {
  it('returns 0 with no goals (stable, no reorder)', () => {
    expect(goalRank('L-methylfolate', [])).toBe(0);
    expect(goalRank('Magnesium Glycinate', [])).toBe(0);
  });

  it('is deterministic: same inputs produce same score', () => {
    const goals = ['energy', 'weight_loss'];
    expect(goalRank('CoQ10 energy supplement', goals)).toBe(goalRank('CoQ10 energy supplement', goals));
  });

  it('returns a positive score when a goal keyword is found in the form', () => {
    const goals = ['energy', 'weight_loss'];
    const score = goalRank('CoQ10 energy support', goals);
    expect(score).toBeGreaterThan(0);
  });

  it('returns 0 when no goal keyword matches the form', () => {
    const goals = ['energy', 'heart_health'];
    expect(goalRank('L-methylfolate', goals)).toBe(0);
  });

  it('accumulates score for multiple matching goals', () => {
    const goals = ['magnesium', 'sleep', 'energy'];
    const twoMatch = goalRank('magnesium for sleep', goals);
    const oneMatch = goalRank('magnesium glycinate', goals);
    expect(twoMatch).toBeGreaterThan(oneMatch);
  });
});
