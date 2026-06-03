/**
 * Prompt 172e Phase A: Maughan conservative coefficient contract tests.
 *
 * Gordon Deliverable 1 (ratified 2026-06-02): replace the 170o LP1 1.0 ratio
 * table with Maughan 2016 BHI grounded values, conservative haircut per spec
 * 5.2.
 *
 * | enum_value      | old    | new    |
 * |-----------------|--------|--------|
 * | pure_water      | 1.00   | 1.00   |
 * | coffee_tea      | 1.00   | 1.00   |
 * | juice_smoothie  | 0.90   | 1.20   |
 * | dairy           | 0.85   | 1.30   |
 * | soda            | 0.80   | 1.00   |
 * | alcohol_low     | 0.95   | 1.00   |
 * | alcohol_high    | 0.65   | 1.00   | (flatten wine 0.75 + spirits 0.50)
 * | sports_drink    | 0.95   | 1.00   |
 * | high_water_food | 0      | 0.90   |
 *
 * Cumulative dose alcohol diuretic handling moves to Phase C via
 * ALCOHOL_DIURETIC_THRESHOLD_DRINKS (spec 5.3). The base coefficient
 * carries no dose curve; wine vs spirits disambiguation is dropped.
 */

import { describe, it, expect } from 'vitest';
import { computeHydrationMl } from '../hydration-ml-computer';
import {
  hydrationRatio,
  HYDRATION_SOURCE_KINDS,
  HYDRATION_RATIO_ADJUSTED,
  HYDRATION_RATIO_CONSERVATIVE,
} from '../types';

describe('Prompt 172e Maughan conservative coefficients (Deliverable 1)', () => {
  it('pure_water stays at 1.00 (reference fluid)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.pure_water).toBe(1.0);
  });

  it('coffee_tea stays at 1.00 (BHI 1.01 matched, Maughan Table 2)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.coffee_tea).toBe(1.0);
  });

  it('juice_smoothie patched 0.90 to 1.20 (OJ BHI 1.39 with 0.19 haircut)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.juice_smoothie).toBe(1.2);
  });

  it('dairy patched 0.85 to 1.30 (whole milk BHI 1.50 with 0.20 haircut)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.dairy).toBe(1.3);
  });

  it('soda patched 0.80 to 1.00 (cola BHI 1.01 matched, old penalized sugar load not Maughan grounded)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.soda).toBe(1.0);
  });

  it('alcohol_low patched 0.95 to 1.00 (lager BHI 1.01 matched)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.alcohol_low).toBe(1.0);
  });

  it('alcohol_high patched 0.65 to 1.00 (lager anchor extrapolated; flat base, dose handled Phase C)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.alcohol_high).toBe(1.0);
  });

  it('sports_drink patched 0.95 to 1.00 (BHI 1.04 with 0.04 haircut)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.sports_drink).toBe(1.0);
  });

  it('high_water_food patched 0 to 0.90 (Gordon derived, no Maughan anchor)', () => {
    expect(HYDRATION_RATIO_ADJUSTED.high_water_food).toBe(0.9);
  });

  it('conservative table still zeros all non water kinds', () => {
    for (const kind of HYDRATION_SOURCE_KINDS) {
      const expected = kind === 'pure_water' ? 1.0 : 0;
      expect(HYDRATION_RATIO_CONSERVATIVE[kind]).toBe(expected);
    }
  });

  it('alcohol_high no longer disambiguates wine vs spirits (flattened to 1.00)', () => {
    expect(hydrationRatio('alcohol_high', 'adjusted', 'glass of wine')).toBe(1.0);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'shot of vodka')).toBe(1.0);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'whiskey on the rocks')).toBe(1.0);
    expect(hydrationRatio('alcohol_high', 'adjusted', 'cocktail')).toBe(1.0);
    expect(hydrationRatio('alcohol_high', 'adjusted')).toBe(1.0);
  });
});

describe('Prompt 172e computeHydrationMl with patched coefficients', () => {
  it('coffee_tea 240 ml renders 240 (1.00x unchanged)', () => {
    expect(
      computeHydrationMl({ source_kind: 'coffee_tea', portion_volume_ml: 240, counting_mode: 'adjusted' }),
    ).toBe(240);
  });

  it('juice_smoothie 240 ml renders 288 (1.20x patched up from 216)', () => {
    expect(
      computeHydrationMl({ source_kind: 'juice_smoothie', portion_volume_ml: 240, counting_mode: 'adjusted' }),
    ).toBe(288);
  });

  it('dairy 240 ml renders 312 (1.30x patched up from 204)', () => {
    expect(
      computeHydrationMl({ source_kind: 'dairy', portion_volume_ml: 240, counting_mode: 'adjusted' }),
    ).toBe(312);
  });

  it('soda 355 ml renders 355 (1.00x patched up from 284)', () => {
    expect(
      computeHydrationMl({ source_kind: 'soda', portion_volume_ml: 355, counting_mode: 'adjusted' }),
    ).toBe(355);
  });

  it('alcohol_low 355 ml renders 355 (1.00x patched up from 337.25)', () => {
    expect(
      computeHydrationMl({ source_kind: 'alcohol_low', portion_volume_ml: 355, counting_mode: 'adjusted' }),
    ).toBe(355);
  });

  it('alcohol_high 148 ml renders 148 with no food_name (1.00x patched up from 96.2)', () => {
    expect(
      computeHydrationMl({ source_kind: 'alcohol_high', portion_volume_ml: 148, counting_mode: 'adjusted' }),
    ).toBe(148);
  });

  it('alcohol_high 148 ml wine renders 148 (flattened, no longer 111 at 0.75x)', () => {
    expect(
      computeHydrationMl({
        source_kind: 'alcohol_high',
        portion_volume_ml: 148,
        counting_mode: 'adjusted',
        food_name: 'glass of wine',
      }),
    ).toBe(148);
  });

  it('alcohol_high 44 ml vodka renders 44 (flattened, no longer 22 at 0.50x)', () => {
    expect(
      computeHydrationMl({
        source_kind: 'alcohol_high',
        portion_volume_ml: 44,
        counting_mode: 'adjusted',
        food_name: 'shot of vodka',
      }),
    ).toBe(44);
  });

  it('sports_drink 591 ml renders 591 (1.00x patched up from 561.45)', () => {
    expect(
      computeHydrationMl({ source_kind: 'sports_drink', portion_volume_ml: 591, counting_mode: 'adjusted' }),
    ).toBe(591);
  });

  it('high_water_food 100 ml renders 90 (0.90x patched up from 0)', () => {
    expect(
      computeHydrationMl({ source_kind: 'high_water_food', portion_volume_ml: 100, counting_mode: 'adjusted' }),
    ).toBe(90);
  });

  it('conservative mode still zeros every non water beverage post patch', () => {
    for (const kind of HYDRATION_SOURCE_KINDS) {
      const expected = kind === 'pure_water' ? 240 : 0;
      expect(
        computeHydrationMl({ source_kind: kind, portion_volume_ml: 240, counting_mode: 'conservative' }),
      ).toBe(expected);
    }
  });
});
