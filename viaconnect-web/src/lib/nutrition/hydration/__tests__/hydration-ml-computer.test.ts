/**
 * Prompt 170o Phase 1 Phase D: unit tests for hydration_ml computation.
 *
 * Gates that the server-side hydration math matches Gordon LP1 §1.0 ratio
 * table verbatim (conservative + adjusted modes; wine vs spirits
 * disambiguation in alcohol_high).
 */

import { describe, it, expect } from 'vitest';
import { computeHydrationMl } from '../hydration-ml-computer';
import {
  hydrationRatio,
  HYDRATION_SOURCE_KINDS,
  HYDRATION_RATIO_ADJUSTED,
  HYDRATION_RATIO_CONSERVATIVE,
} from '../types';

describe('computeHydrationMl', () => {
  it('returns 0 when source_kind is null', () => {
    expect(computeHydrationMl({ source_kind: null, portion_volume_ml: 240, counting_mode: 'adjusted' })).toBe(0);
  });

  it('returns 0 when portion_volume_ml is null', () => {
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: null, counting_mode: 'adjusted' })).toBe(0);
  });

  it('returns 0 when portion_volume_ml is non-positive', () => {
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: 0, counting_mode: 'adjusted' })).toBe(0);
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: -50, counting_mode: 'adjusted' })).toBe(0);
  });

  it('computes pure_water at 100pct in both modes', () => {
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: 240, counting_mode: 'conservative' })).toBe(240);
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: 240, counting_mode: 'adjusted' })).toBe(240);
  });

  it('zeros out non-water kinds in conservative mode', () => {
    expect(computeHydrationMl({ source_kind: 'coffee_tea', portion_volume_ml: 240, counting_mode: 'conservative' })).toBe(0);
    expect(computeHydrationMl({ source_kind: 'soda', portion_volume_ml: 355, counting_mode: 'conservative' })).toBe(0);
    expect(computeHydrationMl({ source_kind: 'alcohol_high', portion_volume_ml: 148, counting_mode: 'conservative' })).toBe(0);
  });

  it('applies adjusted ratios per Gordon LP1 1.0 table', () => {
    expect(computeHydrationMl({ source_kind: 'coffee_tea', portion_volume_ml: 240, counting_mode: 'adjusted' })).toBe(240);
    expect(computeHydrationMl({ source_kind: 'juice_smoothie', portion_volume_ml: 240, counting_mode: 'adjusted' })).toBe(216);
    expect(computeHydrationMl({ source_kind: 'dairy', portion_volume_ml: 240, counting_mode: 'adjusted' })).toBe(204);
    expect(computeHydrationMl({ source_kind: 'soda', portion_volume_ml: 355, counting_mode: 'adjusted' })).toBe(284);
    expect(computeHydrationMl({ source_kind: 'alcohol_low', portion_volume_ml: 355, counting_mode: 'adjusted' })).toBe(337.25);
    expect(computeHydrationMl({ source_kind: 'sports_drink', portion_volume_ml: 591, counting_mode: 'adjusted' })).toBe(561.45);
  });

  it('disambiguates wine vs spirits inside alcohol_high', () => {
    expect(computeHydrationMl({ source_kind: 'alcohol_high', portion_volume_ml: 148, counting_mode: 'adjusted', food_name: 'glass of wine' })).toBe(111);
    expect(computeHydrationMl({ source_kind: 'alcohol_high', portion_volume_ml: 44, counting_mode: 'adjusted', food_name: 'shot of vodka' })).toBe(22);
    expect(computeHydrationMl({ source_kind: 'alcohol_high', portion_volume_ml: 148, counting_mode: 'adjusted' })).toBe(96.2);
  });
});

describe('hydrationRatio helper', () => {
  it('exposes the canonical conservative table verbatim', () => {
    for (const kind of HYDRATION_SOURCE_KINDS) {
      const expected = kind === 'pure_water' ? 1.0 : 0;
      expect(HYDRATION_RATIO_CONSERVATIVE[kind]).toBe(expected);
      expect(hydrationRatio(kind, 'conservative')).toBe(expected);
    }
  });

  it('exposes the canonical adjusted table verbatim', () => {
    expect(HYDRATION_RATIO_ADJUSTED.pure_water).toBe(1.0);
    expect(HYDRATION_RATIO_ADJUSTED.coffee_tea).toBe(1.0);
    expect(HYDRATION_RATIO_ADJUSTED.juice_smoothie).toBe(0.9);
    expect(HYDRATION_RATIO_ADJUSTED.dairy).toBe(0.85);
    expect(HYDRATION_RATIO_ADJUSTED.soda).toBe(0.8);
    expect(HYDRATION_RATIO_ADJUSTED.alcohol_low).toBe(0.95);
    expect(HYDRATION_RATIO_ADJUSTED.alcohol_high).toBe(0.65);
    expect(HYDRATION_RATIO_ADJUSTED.sports_drink).toBe(0.95);
    expect(HYDRATION_RATIO_ADJUSTED.high_water_food).toBe(0);
  });

  it('disambiguates alcohol_high via food_name regex', () => {
    expect(hydrationRatio('alcohol_high', 'adjusted', 'red wine')).toBe(0.75);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'champagne')).toBe(0.75);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'prosecco mimosa')).toBe(0.75);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'vodka tonic')).toBe(0.5);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'whiskey on the rocks')).toBe(0.5);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'gin and tonic')).toBe(0.5);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'a cocktail')).toBe(0.65);
    expect(hydrationRatio('alcohol_high', 'adjusted')).toBe(0.65);
  });
});
