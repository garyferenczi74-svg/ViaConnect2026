import { describe, it, expect } from 'vitest';
import { computeFamilyMemberPrice } from '@/lib/pricing/genex360-lifecycle';

describe('computeFamilyMemberPrice', () => {
  it('first panel for family pays full price', () => {
    const r = computeFamilyMemberPrice({
      productPriceCents: 78888,
      familyDiscountPercent: 25,
      isFirstPanelForFamily: true,
    });
    expect(r.priceCents).toBe(78888);
    expect(r.discountAppliedPercent).toBe(0);
  });

  it('subsequent family member panels get the family discount', () => {
    const r = computeFamilyMemberPrice({
      productPriceCents: 78888,
      familyDiscountPercent: 25,
      isFirstPanelForFamily: false,
    });
    // 25% of 78888 = 19722; 78888 - 19722 = 59166
    expect(r.priceCents).toBe(78888 - Math.round(78888 * 0.25));
    expect(r.discountAppliedPercent).toBe(25);
  });

  it('GeneX-M entry-level with 25% discount', () => {
    const r = computeFamilyMemberPrice({
      productPriceCents: 38888,
      familyDiscountPercent: 25,
      isFirstPanelForFamily: false,
    });
    expect(r.priceCents).toBe(38888 - Math.round(38888 * 0.25));
  });

  it('rounds discount amount correctly', () => {
    // 10% of 12345 = 1234.5 → rounds to 1235 (round half to even or half up in JS)
    // JS Math.round(1234.5) = 1235 (rounds half away from zero)
    const r = computeFamilyMemberPrice({
      productPriceCents: 12345,
      familyDiscountPercent: 10,
      isFirstPanelForFamily: false,
    });
    expect(r.priceCents).toBe(12345 - Math.round(12345 * 0.1));
  });

  it('0% discount yields no change', () => {
    const r = computeFamilyMemberPrice({
      productPriceCents: 10000,
      familyDiscountPercent: 0,
      isFirstPanelForFamily: false,
    });
    expect(r.priceCents).toBe(10000);
    expect(r.discountAppliedPercent).toBe(0);
  });
});
