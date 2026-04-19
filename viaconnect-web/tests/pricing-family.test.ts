import { describe, it, expect } from 'vitest';
import { computeFamilyPricing } from '@/lib/pricing/family-pricing';
import type { MembershipTier } from '@/types/pricing';

const FAMILY_TIER: MembershipTier = {
  id: 'platinum_family',
  display_name: 'Platinum+ Family',
  tier_level: 3,
  monthly_price_cents: 4888,
  annual_price_cents: 48888,
  annual_savings_cents: 4888 * 12 - 48888,
  description: 'Family tier',
  is_family_tier: true,
  base_adults_included: 2,
  base_children_included: 2,
  max_adults_allowed: 4,
  additional_adult_price_cents: 888,
  additional_children_chunk_price_cents: 888,
  children_chunk_size: 2,
  stripe_product_id: null,
  stripe_monthly_price_id: null,
  stripe_annual_price_id: null,
  is_active: true,
  sort_order: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('computeFamilyPricing (monthly)', () => {
  it('base family (2 adults + 2 children) = $48.88', () => {
    const r = computeFamilyPricing({ totalAdults: 2, totalChildren: 2, billingCycle: 'monthly' }, FAMILY_TIER);
    expect(r.basePriceCents).toBe(4888);
    expect(r.additionalAdultCount).toBe(0);
    expect(r.additionalChildrenChunks).toBe(0);
    expect(r.totalMonthlyCents).toBe(4888);
  });

  it('+1 adult = $57.76', () => {
    const r = computeFamilyPricing({ totalAdults: 3, totalChildren: 2, billingCycle: 'monthly' }, FAMILY_TIER);
    expect(r.additionalAdultCount).toBe(1);
    expect(r.totalMonthlyCents).toBe(5776); // 4888 + 888
  });

  it('4 adults max = $66.64', () => {
    const r = computeFamilyPricing({ totalAdults: 4, totalChildren: 2, billingCycle: 'monthly' }, FAMILY_TIER);
    expect(r.additionalAdultCount).toBe(2);
    expect(r.totalMonthlyCents).toBe(6664); // 4888 + 2*888
  });

  it('3 children counts as 1 additional chunk', () => {
    const r = computeFamilyPricing({ totalAdults: 2, totalChildren: 3, billingCycle: 'monthly' }, FAMILY_TIER);
    expect(r.additionalChildrenChunks).toBe(1);
    expect(r.totalMonthlyCents).toBe(5776); // 4888 + 888
  });

  it('4 children = still 1 additional chunk (same chunk covers 2)', () => {
    const r = computeFamilyPricing({ totalAdults: 2, totalChildren: 4, billingCycle: 'monthly' }, FAMILY_TIER);
    expect(r.additionalChildrenChunks).toBe(1);
    expect(r.totalMonthlyCents).toBe(5776);
  });

  it('5 children = 2 additional chunks (first chunk covers 2, second covers 1-2)', () => {
    const r = computeFamilyPricing({ totalAdults: 2, totalChildren: 5, billingCycle: 'monthly' }, FAMILY_TIER);
    expect(r.additionalChildrenChunks).toBe(2);
    expect(r.totalMonthlyCents).toBe(6664); // 4888 + 2*888
  });

  it('max config (4 adults + 6 children) = $84.40', () => {
    const r = computeFamilyPricing({ totalAdults: 4, totalChildren: 6, billingCycle: 'monthly' }, FAMILY_TIER);
    expect(r.additionalAdultCount).toBe(2);
    expect(r.additionalChildrenChunks).toBe(2);
    expect(r.totalMonthlyCents).toBe(8440); // 4888 + 2*888 + 2*888
  });

  it('primary only (1 adult) stays at base', () => {
    const r = computeFamilyPricing({ totalAdults: 1, totalChildren: 2, billingCycle: 'monthly' }, FAMILY_TIER);
    expect(r.additionalAdultCount).toBe(0);
    expect(r.totalMonthlyCents).toBe(4888);
  });

  it('rejects 0 adults', () => {
    expect(() =>
      computeFamilyPricing({ totalAdults: 0, totalChildren: 0, billingCycle: 'monthly' }, FAMILY_TIER),
    ).toThrow(/at least 1 adult/);
  });

  it('rejects > 4 adults', () => {
    expect(() =>
      computeFamilyPricing({ totalAdults: 5, totalChildren: 0, billingCycle: 'monthly' }, FAMILY_TIER),
    ).toThrow(/Maximum 4 adults/);
  });

  it('rejects negative children', () => {
    expect(() =>
      computeFamilyPricing({ totalAdults: 2, totalChildren: -1, billingCycle: 'monthly' }, FAMILY_TIER),
    ).toThrow(/negative/);
  });
});

describe('computeFamilyPricing (annual)', () => {
  it('base annual = $488.88, savings vs 12x monthly', () => {
    const r = computeFamilyPricing({ totalAdults: 2, totalChildren: 2, billingCycle: 'annual' }, FAMILY_TIER);
    expect(r.basePriceCents).toBe(48888);
    expect(r.totalAnnualCents).toBe(48888);
    expect(r.annualSavingsCents).toBe(4888 * 12 - 48888);
  });

  it('annual with 1 additional adult: base + 12 * $8.88 add-on', () => {
    const r = computeFamilyPricing({ totalAdults: 3, totalChildren: 2, billingCycle: 'annual' }, FAMILY_TIER);
    // Annual base + 12 months of the $8.88 add-on
    expect(r.additionalAdultCostCents).toBe(888 * 12);
    expect(r.totalAnnualCents).toBe(48888 + 888 * 12);
  });
});
