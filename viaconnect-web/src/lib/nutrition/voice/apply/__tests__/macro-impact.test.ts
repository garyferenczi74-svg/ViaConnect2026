/**
 * Unit tests for macro impact computation per Prompt 170j §11.4.
 */

import { describe, it, expect } from 'vitest';
import {
  computeCumulativeImpact,
  formatImpactPreview,
  isImplausibleImpact,
} from '../macro-impact';
import type { VoiceOperation } from '../../types';

function op(partial: Partial<VoiceOperation>): VoiceOperation {
  return {
    op_kind: 'add_cooking_oil',
    confidence: 0.9,
    natural_language_preview: 'test',
    target_food: 'chicken',
    oil_type: 'olive_oil',
    amount_ml: 30,
    amount_label: '2 tablespoons',
    ...partial,
  } as VoiceOperation;
}

describe('computeCumulativeImpact', () => {
  it('returns zeroes when given no operations', () => {
    expect(computeCumulativeImpact([])).toEqual({
      calories_kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    });
  });

  it('returns zeroes when no operations carry macro_impact_estimate', () => {
    const ops = [op({}), op({})];
    const result = computeCumulativeImpact(ops);
    expect(result.calories_kcal).toBe(0);
    expect(result.fat_g).toBe(0);
  });

  it('aggregates partial estimates additively', () => {
    const ops = [
      op({ macro_impact_estimate: { calories_kcal: 240, fat_g: 27 } }),
      op({ macro_impact_estimate: { calories_kcal: 60, fat_g: 3 } }),
    ];
    const result = computeCumulativeImpact(ops);
    expect(result.calories_kcal).toBe(300);
    expect(result.fat_g).toBe(30);
  });

  it('rounds calories to integer and macros to one decimal', () => {
    const ops = [
      op({ macro_impact_estimate: { calories_kcal: 241.7, protein_g: 12.345 } }),
    ];
    const result = computeCumulativeImpact(ops);
    expect(result.calories_kcal).toBe(242);
    expect(result.protein_g).toBe(12.3);
  });

  it('handles negative deltas from remove operations', () => {
    const ops = [
      op({
        op_kind: 'remove_item',
        target_food: 'bread',
        natural_language_preview: 'remove bread',
        macro_impact_estimate: { calories_kcal: -120, carbs_g: -22 },
      }),
    ];
    const result = computeCumulativeImpact(ops);
    expect(result.calories_kcal).toBe(-120);
    expect(result.carbs_g).toBe(-22);
  });
});

describe('formatImpactPreview', () => {
  it('returns "No macro change" when all macros are zero', () => {
    expect(
      formatImpactPreview({
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      })
    ).toBe('No macro change');
  });

  it('formats positive deltas with plus sign', () => {
    const text = formatImpactPreview({
      calories_kcal: 240,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 27,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    });
    expect(text).toContain('+240 kcal');
    expect(text).toContain('F +27g');
    expect(text).not.toContain('P ');
  });

  it('formats negative deltas with minus sign', () => {
    const text = formatImpactPreview({
      calories_kcal: -120,
      protein_g: -4,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    });
    expect(text).toContain('-120 kcal');
    expect(text).toContain('P -4g');
  });
});

describe('isImplausibleImpact', () => {
  it('returns false for typical macro changes', () => {
    expect(
      isImplausibleImpact({
        calories_kcal: 240,
        protein_g: 12,
        carbs_g: 20,
        fat_g: 15,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      })
    ).toBe(false);
  });

  it('returns true for extreme calorie deltas', () => {
    expect(
      isImplausibleImpact({
        calories_kcal: 3500,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      })
    ).toBe(true);
  });

  it('returns true for extreme fat deltas in either direction', () => {
    expect(
      isImplausibleImpact({
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: -300,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      })
    ).toBe(true);
  });
});
