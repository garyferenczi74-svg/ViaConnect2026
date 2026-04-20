// Prompt #96 Phase 7: Governable parameters + parameterized quote tests.

import { describe, it, expect } from 'vitest';
import {
  calculateProductionQuote,
  type WhiteLabelParameters,
  type DiscountTierRule,
  DEFAULT_PARAMETERS,
  DEFAULT_DISCOUNT_TIERS,
} from '@/lib/white-label/production-quote';

const SPEC_ITEMS = [{
  label_design_id: 'L1', product_catalog_id: 'P1', quantity: 1000, base_msrp_cents: 8000,
}];

describe('DEFAULT_PARAMETERS + DEFAULT_DISCOUNT_TIERS', () => {
  it('matches the Phase 1 spec defaults', () => {
    expect(DEFAULT_PARAMETERS.minimum_order_value_cents).toBe(1_500_000);
    expect(DEFAULT_PARAMETERS.expedited_surcharge_percent).toBe(15);
    expect(DEFAULT_DISCOUNT_TIERS).toEqual([
      { tier_id: 'tier_100_499', min_units: 100, max_units: 499, discount_percent: 60 },
      { tier_id: 'tier_500_999', min_units: 500, max_units: 999, discount_percent: 65 },
      { tier_id: 'tier_1000_plus', min_units: 1000, max_units: null, discount_percent: 70 },
    ]);
  });
});

describe('calculateProductionQuote with governed params', () => {
  it('uses spec defaults when params are omitted', () => {
    const q = calculateProductionQuote({ items: SPEC_ITEMS, timeline: 'standard' });
    expect(q.applied_discount_percent).toBe(70);
    expect(q.minimum_order_value_cents).toBe(1_500_000);
  });

  it('honors a governance-approved discount-tier change', () => {
    // Simulate a governance proposal that lowers the 1000+ tier from 70% to 75%.
    const tiers: DiscountTierRule[] = [
      { tier_id: 'tier_100_499', min_units: 100, max_units: 499, discount_percent: 60 },
      { tier_id: 'tier_500_999', min_units: 500, max_units: 999, discount_percent: 65 },
      { tier_id: 'tier_1000_plus', min_units: 1000, max_units: null, discount_percent: 75 },
    ];
    const q = calculateProductionQuote({ items: SPEC_ITEMS, timeline: 'standard', tiers });
    expect(q.applied_discount_percent).toBe(75);
    // 1000 * 8000 * (1 - 0.75) = 2_000_000
    expect(q.subtotal_cents).toBe(2_000_000);
  });

  it('honors a governance-approved expedited surcharge change', () => {
    const params: Partial<WhiteLabelParameters> = { expedited_surcharge_percent: 20 };
    const q = calculateProductionQuote({ items: SPEC_ITEMS, timeline: 'expedited', params });
    // subtotal at default 70% discount: 1000 * 8000 * 0.3 = 2_400_000
    expect(q.subtotal_cents).toBe(2_400_000);
    // 20% surcharge: 480_000
    expect(q.expedited_surcharge_cents).toBe(480_000);
    expect(q.total_cents).toBe(2_880_000);
  });

  it('honors a governance-approved MOV change', () => {
    const params: Partial<WhiteLabelParameters> = { minimum_order_value_cents: 5_000_000 };
    const q = calculateProductionQuote({ items: SPEC_ITEMS, timeline: 'standard', params });
    // 2.4M total < 5M MOV
    expect(q.minimum_order_value_cents).toBe(5_000_000);
    expect(q.meets_minimum_order_value).toBe(false);
  });

  it('rejects when custom tiers do not classify the unit count', () => {
    const tiers: DiscountTierRule[] = [
      { tier_id: 'tier_500_999', min_units: 500, max_units: 999, discount_percent: 65 },
    ];
    expect(() =>
      calculateProductionQuote({ items: SPEC_ITEMS, timeline: 'standard', tiers }),
    ).toThrow(/does not meet any discount tier/i);
  });

  it('passes deeply: tier and parameter overrides compose', () => {
    const tiers: DiscountTierRule[] = [
      { tier_id: 'special_50', min_units: 50, max_units: null, discount_percent: 50 },
    ];
    const params: Partial<WhiteLabelParameters> = {
      minimum_order_value_cents: 100_000,
      expedited_surcharge_percent: 0,
    };
    const q = calculateProductionQuote({
      items: [{ label_design_id: 'L1', product_catalog_id: 'P1', quantity: 100, base_msrp_cents: 5000 }],
      timeline: 'expedited',
      tiers,
      params,
    });
    expect(q.applied_discount_percent).toBe(50);
    expect(q.applied_discount_tier).toBe('special_50');
    expect(q.expedited_surcharge_cents).toBe(0);
    expect(q.meets_minimum_order_value).toBe(true);
  });
});
