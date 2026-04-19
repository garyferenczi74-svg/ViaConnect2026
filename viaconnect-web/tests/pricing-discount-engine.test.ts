import { describe, it, expect } from 'vitest';
import { computeDiscount, MAX_DISCOUNT_PERCENT } from '@/lib/pricing/discount-engine';
import type { SupplementDiscountRule, UserPricingContext } from '@/types/pricing';

const RULES: SupplementDiscountRule[] = [
  { id: 'subscription_base',  display_name: 'Auto-ship subscription',  discount_percent: 10, rule_priority: 1,  requires_subscription: true,  requires_genex360_any: false, requires_genex360_complete: false, requires_active_protocol: false, is_annual_prepay_bonus: false, is_active: true, created_at: new Date().toISOString() },
  { id: 'genex360_member',    display_name: 'GeneX360 member',         discount_percent: 15, rule_priority: 2,  requires_subscription: true,  requires_genex360_any: true,  requires_genex360_complete: false, requires_active_protocol: false, is_annual_prepay_bonus: false, is_active: true, created_at: new Date().toISOString() },
  { id: 'full_precision',     display_name: 'Full precision',          discount_percent: 20, rule_priority: 3,  requires_subscription: true,  requires_genex360_any: false, requires_genex360_complete: true,  requires_active_protocol: true,  is_annual_prepay_bonus: false, is_active: true, created_at: new Date().toISOString() },
  { id: 'annual_prepay_bonus', display_name: 'Annual prepay bonus',    discount_percent: 5,  rule_priority: 99, requires_subscription: true,  requires_genex360_any: false, requires_genex360_complete: false, requires_active_protocol: false, is_annual_prepay_bonus: true,  is_active: true, created_at: new Date().toISOString() },
];

function ctx(overrides: Partial<UserPricingContext> = {}): UserPricingContext {
  return {
    userId: 'u1',
    currentTier: 'free',
    tierLevel: 0,
    hasActiveMembership: false,
    hasActiveSubscription: false,
    isAnnualPrepay: false,
    ownsAnyGeneX360: false,
    ownsGeneX360Complete: false,
    hasActiveProtocol: false,
    activeFamilyMemberCount: { adults: 0, children: 0 },
    giftMemberships: [],
    ...overrides,
  };
}

describe('computeDiscount', () => {
  it('returns zero for non-subscription purchase even at high tiers', () => {
    const result = computeDiscount(10000, ctx({ ownsGeneX360Complete: true, hasActiveProtocol: true }), RULES, { isSubscriptionPurchase: false });
    expect(result.appliedDiscountPercent).toBe(0);
    expect(result.finalPriceCents).toBe(10000);
    expect(result.appliedRuleId).toBeNull();
  });

  it('10% for subscription-only (no genetics)', () => {
    const result = computeDiscount(10000, ctx(), RULES, { isSubscriptionPurchase: true });
    expect(result.appliedDiscountPercent).toBe(10);
    expect(result.appliedRuleId).toBe('subscription_base');
    expect(result.savingsCents).toBe(1000);
    expect(result.finalPriceCents).toBe(9000);
  });

  it('15% for GeneX360 member on subscription', () => {
    const result = computeDiscount(10000, ctx({ ownsAnyGeneX360: true }), RULES, { isSubscriptionPurchase: true });
    expect(result.appliedDiscountPercent).toBe(15);
    expect(result.appliedRuleId).toBe('genex360_member');
  });

  it('20% for GeneX360 Complete + active protocol + subscription', () => {
    const result = computeDiscount(10000, ctx({ ownsAnyGeneX360: true, ownsGeneX360Complete: true, hasActiveProtocol: true }), RULES, { isSubscriptionPurchase: true });
    expect(result.appliedDiscountPercent).toBe(20);
    expect(result.appliedRuleId).toBe('full_precision');
  });

  it('full precision customer + annual prepay = 25% (capped)', () => {
    const result = computeDiscount(10000, ctx({ ownsAnyGeneX360: true, ownsGeneX360Complete: true, hasActiveProtocol: true }), RULES, { isSubscriptionPurchase: true, isAnnualPrepay: true });
    expect(result.appliedDiscountPercent).toBe(25);
    expect(result.annualPrepayBonusApplied).toBe(true);
    expect(result.breakdown.baseDiscount).toBe(20);
    expect(result.breakdown.annualBonus).toBe(5);
  });

  it('caps total discount at 25% even if rules + bonus would exceed', () => {
    // Synthetic: if base were 25% itself, adding the 5% bonus should cap at 25%
    const inflatedRules: SupplementDiscountRule[] = RULES.map((r) =>
      r.id === 'full_precision' ? { ...r, discount_percent: 25 } : r,
    );
    const result = computeDiscount(10000, ctx({ ownsGeneX360Complete: true, hasActiveProtocol: true, ownsAnyGeneX360: true }), inflatedRules, { isSubscriptionPurchase: true, isAnnualPrepay: true });
    expect(result.appliedDiscountPercent).toBe(25);
    expect(result.appliedDiscountPercent).toBeLessThanOrEqual(MAX_DISCOUNT_PERCENT);
  });

  it('does not apply annual prepay bonus when no base rule qualifies', () => {
    // User has no subscription (isSubscriptionPurchase=false); no rule qualifies at all.
    // Annual prepay should not add a bonus in that case.
    const result = computeDiscount(10000, ctx(), RULES, { isSubscriptionPurchase: false, isAnnualPrepay: true });
    expect(result.appliedDiscountPercent).toBe(0);
    expect(result.annualPrepayBonusApplied).toBe(false);
  });

  it('rules do not stack: 10% + 15% = 15% (not 25%)', () => {
    // A user who qualifies for both 10% (subscription) and 15% (genex360 member)
    // gets 15% only, per highest-rule-wins.
    const result = computeDiscount(10000, ctx({ ownsAnyGeneX360: true }), RULES, { isSubscriptionPurchase: true });
    expect(result.appliedDiscountPercent).toBe(15);
    expect(result.breakdown.totalDiscount).toBe(15);
  });

  it('zero-price returns zero result unchanged', () => {
    const result = computeDiscount(0, ctx(), RULES, { isSubscriptionPurchase: true });
    expect(result.finalPriceCents).toBe(0);
    expect(result.savingsCents).toBe(0);
    expect(result.appliedDiscountPercent).toBe(0);
  });

  it('full_precision requires BOTH genex360_complete AND active_protocol', () => {
    // Complete but no active protocol: falls back to 15% (genex360_member)
    const result = computeDiscount(10000, ctx({ ownsAnyGeneX360: true, ownsGeneX360Complete: true, hasActiveProtocol: false }), RULES, { isSubscriptionPurchase: true });
    expect(result.appliedDiscountPercent).toBe(15);
    expect(result.appliedRuleId).toBe('genex360_member');
  });
});
