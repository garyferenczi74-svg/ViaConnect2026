// Prompt #92 Phase 3: pure-logic redemption + discount-stacking tests.
// Interpretation B: Helix applies to post-discount price, capped 15%.

import { describe, it, expect } from 'vitest';
import { validateRedemption } from '@/lib/helix/redemption-engine';
import { computeDiscountWithHelix, MAX_HELIX_PERCENT } from '@/lib/helix/discount-stacking';
import type { SupplementDiscountRule, UserPricingContext } from '@/types/pricing';
import type { Database } from '@/lib/supabase/types';

type Row = Database['public']['Tables']['helix_redemption_catalog']['Row'];

function catalogRow(partial: Partial<Row>): Row {
  return {
    id: 'supp_15pct',
    display_name: '15% off',
    description: null,
    redemption_type: 'supplement_discount',
    points_cost: 1500,
    discount_percent: 15,
    credit_dollars_cents: null,
    stock_limit: null,
    stock_remaining: null,
    redemption_limit_per_user: null,
    valid_from: null,
    valid_until: null,
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    ...partial,
  } as Row;
}

describe('validateRedemption', () => {
  it('rejects when balance is insufficient', () => {
    const r = validateRedemption({
      item: catalogRow({}),
      userBalanceAvailable: 1000,
      userRedemptionCountForItem: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Insufficient/);
  });

  it('rejects when out of stock', () => {
    const r = validateRedemption({
      item: catalogRow({ stock_limit: 10, stock_remaining: 0 }),
      userBalanceAvailable: 10_000,
      userRedemptionCountForItem: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Out of stock/);
  });

  it('rejects when per-user limit reached', () => {
    const r = validateRedemption({
      item: catalogRow({ redemption_limit_per_user: 1 }),
      userBalanceAvailable: 10_000,
      userRedemptionCountForItem: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Redemption limit/);
  });

  it('rejects supplement_discount exceeding 15%', () => {
    const r = validateRedemption({
      item: catalogRow({ discount_percent: 25 }),
      userBalanceAvailable: 10_000,
      userRedemptionCountForItem: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/15 percent/);
  });

  it('accepts a valid redemption', () => {
    const r = validateRedemption({
      item: catalogRow({}),
      userBalanceAvailable: 1500,
      userRedemptionCountForItem: 0,
    });
    expect(r.ok).toBe(true);
  });

  it('rejects expired redemptions', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const r = validateRedemption({
      item: catalogRow({ valid_until: yesterday }),
      userBalanceAvailable: 10_000,
      userRedemptionCountForItem: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/expired/);
  });

  it('rejects redemptions not yet available', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    const r = validateRedemption({
      item: catalogRow({ valid_from: tomorrow }),
      userBalanceAvailable: 10_000,
      userRedemptionCountForItem: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not yet available/);
  });
});

// ---- Interpretation B: discount stacking ----

const RULES: SupplementDiscountRule[] = [
  { id: 'subscription_base', display_name: 'Auto-ship', discount_percent: 10, rule_priority: 1, requires_subscription: true, requires_genex360_any: false, requires_genex360_complete: false, requires_active_protocol: false, is_annual_prepay_bonus: false, is_active: true, created_at: new Date().toISOString() },
  { id: 'genex360_member', display_name: 'GeneX360 member', discount_percent: 15, rule_priority: 2, requires_subscription: true, requires_genex360_any: true, requires_genex360_complete: false, requires_active_protocol: false, is_annual_prepay_bonus: false, is_active: true, created_at: new Date().toISOString() },
  { id: 'full_precision', display_name: 'Full precision', discount_percent: 20, rule_priority: 3, requires_subscription: true, requires_genex360_any: false, requires_genex360_complete: true, requires_active_protocol: true, is_annual_prepay_bonus: false, is_active: true, created_at: new Date().toISOString() },
  { id: 'annual_prepay_bonus', display_name: 'Annual prepay', discount_percent: 5, rule_priority: 99, requires_subscription: true, requires_genex360_any: false, requires_genex360_complete: false, requires_active_protocol: false, is_annual_prepay_bonus: true, is_active: true, created_at: new Date().toISOString() },
];

function ctx(o: Partial<UserPricingContext> = {}): UserPricingContext {
  return {
    userId: 'u1', currentTier: 'gold', tierLevel: 1,
    hasActiveMembership: true, hasActiveSubscription: true, isAnnualPrepay: false,
    ownsAnyGeneX360: false, ownsGeneX360Complete: false, hasActiveProtocol: false,
    activeFamilyMemberCount: { adults: 0, children: 0 }, giftMemberships: [],
    ...o,
  };
}

describe('computeDiscountWithHelix (Interpretation B)', () => {
  it('no base, +15% Helix on $100 → $85 (15% of $100)', () => {
    const r = computeDiscountWithHelix({
      originalPriceCents: 10_000,
      context: ctx(),
      rules: RULES,
      options: { isSubscriptionPurchase: false },
      helixDiscountPercent: 15,
    });
    expect(r.finalPriceCents).toBe(8500);
    expect(r.baseSavingsCents).toBe(0);
    expect(r.helixSavingsCents).toBe(1500);
    expect(r.effectiveTotalPercent).toBe(15);
  });

  it('10% base + 15% Helix on $100 → $100→$90→$76.50', () => {
    const r = computeDiscountWithHelix({
      originalPriceCents: 10_000,
      context: ctx(),
      rules: RULES,
      options: { isSubscriptionPurchase: true },
      helixDiscountPercent: 15,
    });
    expect(r.baseSavingsCents).toBe(1000); // 10%
    expect(r.finalPriceCents).toBe(7650);  // 9000 * 0.85 = 7650
    expect(r.helixSavingsCents).toBe(1350);
    expect(r.effectiveTotalPercent).toBe(23.5);
  });

  it('20% base + 15% Helix on $100 → $68 (23.5+... wait: 80*0.85=68 => 32%)', () => {
    const r = computeDiscountWithHelix({
      originalPriceCents: 10_000,
      context: ctx({ ownsAnyGeneX360: true, ownsGeneX360Complete: true, hasActiveProtocol: true }),
      rules: RULES,
      options: { isSubscriptionPurchase: true },
      helixDiscountPercent: 15,
    });
    expect(r.baseSavingsCents).toBe(2000); // 20%
    expect(r.finalPriceCents).toBe(6800);  // 8000 * 0.85 = 6800
    expect(r.helixSavingsCents).toBe(1200);
    expect(r.effectiveTotalPercent).toBe(32);
  });

  it('5% Helix on $100 with 10% base → $100 → $90 → $85.50', () => {
    const r = computeDiscountWithHelix({
      originalPriceCents: 10_000,
      context: ctx(),
      rules: RULES,
      options: { isSubscriptionPurchase: true },
      helixDiscountPercent: 5,
    });
    expect(r.baseSavingsCents).toBe(1000);
    expect(r.finalPriceCents).toBe(8550);  // 9000 * 0.95 = 8550
    expect(r.helixSavingsCents).toBe(450);
  });

  it('caps Helix at 15% even if caller passes 25', () => {
    const r = computeDiscountWithHelix({
      originalPriceCents: 10_000,
      context: ctx(),
      rules: RULES,
      options: { isSubscriptionPurchase: false },
      helixDiscountPercent: 25,
    });
    expect(r.helixContributionPercent).toBe(15);
    expect(r.finalPriceCents).toBe(8500);
  });

  it('negative Helix percent clamps to 0 (no negative discount)', () => {
    const r = computeDiscountWithHelix({
      originalPriceCents: 10_000,
      context: ctx(),
      rules: RULES,
      options: { isSubscriptionPurchase: false },
      helixDiscountPercent: -10,
    });
    expect(r.helixContributionPercent).toBe(0);
    expect(r.finalPriceCents).toBe(10_000);
  });

  it('MAX_HELIX_PERCENT constant is 15', () => {
    expect(MAX_HELIX_PERCENT).toBe(15);
  });

  it('preserves Prompt #90 base-discount 25% cap', () => {
    // Base discount can still cap at 25%; Helix stacks on top separately.
    const r = computeDiscountWithHelix({
      originalPriceCents: 10_000,
      context: ctx({ ownsAnyGeneX360: true, ownsGeneX360Complete: true, hasActiveProtocol: true }),
      rules: RULES,
      options: { isSubscriptionPurchase: true, isAnnualPrepay: true },
      helixDiscountPercent: 15,
    });
    expect(r.breakdown.totalDiscount).toBe(25); // base hits cap
    expect(r.baseSavingsCents).toBe(2500);
    expect(r.finalPriceCents).toBe(6375);  // 7500 * 0.85 = 6375
    expect(r.effectiveTotalPercent).toBe(36.3);
  });

  it('10% base + 5% Helix → $90 → $85.50, 14.5% total', () => {
    const r = computeDiscountWithHelix({
      originalPriceCents: 10_000,
      context: ctx(),
      rules: RULES,
      options: { isSubscriptionPurchase: true },
      helixDiscountPercent: 5,
    });
    expect(r.finalPriceCents).toBe(8550);
    expect(r.effectiveTotalPercent).toBe(14.5);
  });

  it('0 price yields 0 everywhere', () => {
    const r = computeDiscountWithHelix({
      originalPriceCents: 0,
      context: ctx(),
      rules: RULES,
      options: { isSubscriptionPurchase: true },
      helixDiscountPercent: 15,
    });
    expect(r.finalPriceCents).toBe(0);
    expect(r.helixSavingsCents).toBe(0);
    expect(r.baseSavingsCents).toBe(0);
  });
});
