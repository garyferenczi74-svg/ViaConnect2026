/**
 * Prompt 172e Phase C Workstream 1: caffeine attribution from beverage_slug
 * pure helper tests.
 *
 * Per spec section 6: each caffeinated beverage contributes
 *   caffeine_mg_per_serving * (volume_ml / default_volume_ml)
 * to the existing 171b model. The 171b engine reads meal_items.caffeine_mg
 * directly; the 170o quick log write path is the single boundary that
 * persists the computed caffeine into meal_items at insert time. No
 * touch to the 171b engine, BOS scoring, or the photo analyze path.
 *
 * Dedup contract: when the 170o 5 min dedup window fires for a caffeinated
 * category (coffee_tea), the photo path meal item keeps its caffeine and
 * the hydration path re logs hydration only without re attributing caffeine
 * a second time. The dedup short circuit in the route already returns
 * before the new insert; this suite proves the math layer does not double
 * compute when called.
 */

import { describe, it, expect } from 'vitest';
import {
  computeEffectiveCaffeineMg,
  shouldAttributeCaffeineForBeverageSlug,
} from '../caffeine-attribution';

describe('Prompt 172e Phase C computeEffectiveCaffeineMg base cases', () => {
  it('drip coffee 240 ml at default 240 ml returns 95 mg unchanged', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 95,
        default_volume_ml: 240,
        volume_ml: 240,
      }),
    ).toBe(95);
  });

  it('drip coffee 480 ml at default 240 ml returns 190 mg (double serving)', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 95,
        default_volume_ml: 240,
        volume_ml: 480,
      }),
    ).toBe(190);
  });

  it('drip coffee 120 ml at default 240 ml returns 48 mg (half serving rounded)', () => {
    // 95 * 0.5 = 47.5 -> rounds to 48
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 95,
        default_volume_ml: 240,
        volume_ml: 120,
      }),
    ).toBe(48);
  });

  it('espresso shot at default 30 ml returns 63 mg', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 63,
        default_volume_ml: 30,
        volume_ml: 30,
      }),
    ).toBe(63);
  });

  it('cold brew 355 ml at default 355 ml returns 175 mg', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 175,
        default_volume_ml: 355,
        volume_ml: 355,
      }),
    ).toBe(175);
  });

  it('cold brew 710 ml at default 355 ml returns 350 mg (double)', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 175,
        default_volume_ml: 355,
        volume_ml: 710,
      }),
    ).toBe(350);
  });

  it('energy drink 240 ml at default 240 ml returns 80 mg', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 80,
        default_volume_ml: 240,
        volume_ml: 240,
      }),
    ).toBe(80);
  });
});

describe('Prompt 172e Phase C computeEffectiveCaffeineMg zero cases', () => {
  it('returns 0 for non caffeinated beverage (caffeine_mg_per_serving 0)', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 0,
        default_volume_ml: 240,
        volume_ml: 240,
      }),
    ).toBe(0);
  });

  it('returns 0 for herbal tea (caffeine_mg_per_serving 0) at any volume', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 0,
        default_volume_ml: 240,
        volume_ml: 750,
      }),
    ).toBe(0);
  });

  it('returns 0 for water at any volume', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 0,
        default_volume_ml: 240,
        volume_ml: 500,
      }),
    ).toBe(0);
  });
});

describe('Prompt 172e Phase C computeEffectiveCaffeineMg edge cases', () => {
  it('zero volume returns 0 (no caffeine attributed for empty log)', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 95,
        default_volume_ml: 240,
        volume_ml: 0,
      }),
    ).toBe(0);
  });

  it('negative volume returns 0 (defensive)', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 95,
        default_volume_ml: 240,
        volume_ml: -100,
      }),
    ).toBe(0);
  });

  it('zero default volume returns 0 (defensive against catalog seed error)', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 95,
        default_volume_ml: 0,
        volume_ml: 240,
      }),
    ).toBe(0);
  });

  it('non finite caffeine returns 0 (defensive)', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: Number.NaN,
        default_volume_ml: 240,
        volume_ml: 240,
      }),
    ).toBe(0);
  });

  it('non finite volume returns 0 (defensive)', () => {
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 95,
        default_volume_ml: 240,
        volume_ml: Number.NaN,
      }),
    ).toBe(0);
  });

  it('rounds to nearest integer mg', () => {
    // 47 * (123 / 240) = 24.0875 -> 24
    expect(
      computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: 47,
        default_volume_ml: 240,
        volume_ml: 123,
      }),
    ).toBe(24);
  });
});

describe('Prompt 172e Phase C shouldAttributeCaffeineForBeverageSlug dedup guard', () => {
  it('returns true when no dedup hit fired (regular log path)', () => {
    expect(
      shouldAttributeCaffeineForBeverageSlug({
        deduplicated: false,
        beverage_kind: 'coffee_tea',
      }),
    ).toBe(true);
  });

  it('returns false for coffee_tea on a dedup hit (photo path keeps the caffeine)', () => {
    expect(
      shouldAttributeCaffeineForBeverageSlug({
        deduplicated: true,
        beverage_kind: 'coffee_tea',
      }),
    ).toBe(false);
  });

  it('returns false for any kind on a dedup hit (route already returns before insert anyway)', () => {
    // Defensive: even if a caller misuses the helper post dedup, it stays
    // off so a future refactor cannot accidentally double attribute.
    expect(
      shouldAttributeCaffeineForBeverageSlug({
        deduplicated: true,
        beverage_kind: 'pure_water',
      }),
    ).toBe(false);
    expect(
      shouldAttributeCaffeineForBeverageSlug({
        deduplicated: true,
        beverage_kind: 'soda',
      }),
    ).toBe(false);
  });

  it('returns true for non caffeinated kinds when not dedup (caller filters by row caffeine still)', () => {
    // Helper does not know per row caffeine here; caller computes from
    // the catalog row. The 0 mg returned from computeEffectiveCaffeineMg
    // means a non caffeinated insert still passes through this guard.
    expect(
      shouldAttributeCaffeineForBeverageSlug({
        deduplicated: false,
        beverage_kind: 'pure_water',
      }),
    ).toBe(true);
  });
});
