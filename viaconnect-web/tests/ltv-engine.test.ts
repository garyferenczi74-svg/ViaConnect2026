// Prompt #94 Phase 3: LTV + variable costs + retention pure-function tests.

import { describe, it, expect } from 'vitest';
import {
  estimateShippingCents,
  estimatePaymentProcessingCents,
  estimateGenex360LabCostCents,
  SUPPORT_ALLOCATION_PER_CUSTOMER_MONTH_CENTS,
  cogsForLineItem,
  totalVariableCostsForOrder,
  type OrderLineItem,
} from '@/lib/analytics/variable-costs';
import {
  computeNRR,
  computeGRR,
  fitExponentialDecay,
  projectExponentialDecay,
  type RetentionPoint,
} from '@/lib/analytics/retention-engine';
import {
  computeCohortLTV,
  type CohortMonthlyAggregate,
} from '@/lib/analytics/ltv-engine';

describe('estimateShippingCents', () => {
  it('domestic at 750 cents', () => {
    expect(estimateShippingCents('domestic')).toBe(750);
  });
  it('international at 1500 cents', () => {
    expect(estimateShippingCents('international')).toBe(1500);
  });
});

describe('estimatePaymentProcessingCents', () => {
  it('matches Stripe formula: 2.9% + $0.30', () => {
    // $100 → 290 + 30 = 320
    expect(estimatePaymentProcessingCents(10_000)).toBe(320);
  });
  it('rounds to nearest cent', () => {
    // $33.33 (3333) → 96.66 + 30 = 126.66 → 127
    expect(estimatePaymentProcessingCents(3333)).toBe(127);
  });
  it('zero amount returns 30 (still applies fixed fee)', () => {
    expect(estimatePaymentProcessingCents(0)).toBe(30);
  });
});

describe('estimateGenex360LabCostCents', () => {
  it.each([
    ['genex_m', 8500],
    ['core', 14500],
    ['complete', 21500],
  ] as const)('%s tier costs %i cents', (tier, expected) => {
    expect(estimateGenex360LabCostCents(tier)).toBe(expected);
  });

  it('returns null for unknown tier', () => {
    expect(estimateGenex360LabCostCents('mystery_tier' as any)).toBeNull();
  });
});

describe('SUPPORT_ALLOCATION_PER_CUSTOMER_MONTH_CENTS', () => {
  it('is the documented $2/month placeholder', () => {
    expect(SUPPORT_ALLOCATION_PER_CUSTOMER_MONTH_CENTS).toBe(200);
  });
});

describe('cogsForLineItem', () => {
  it('uses explicit per-unit COGS when present', () => {
    const item: OrderLineItem = {
      sku: 'X',
      quantity: 2,
      unitPriceCents: 5000,
      unitCogsCents: 1750,
    };
    expect(cogsForLineItem(item)).toBe(3500); // 1750 * 2
  });

  it('falls back to 35% of unit price when COGS missing', () => {
    const item: OrderLineItem = {
      sku: 'X',
      quantity: 3,
      unitPriceCents: 5000,
      unitCogsCents: null,
    };
    // 35% of 5000 = 1750 per unit, * 3 = 5250
    expect(cogsForLineItem(item)).toBe(5250);
  });

  it('zero quantity is zero', () => {
    expect(cogsForLineItem({
      sku: 'X', quantity: 0, unitPriceCents: 5000, unitCogsCents: 1000,
    })).toBe(0);
  });
});

describe('totalVariableCostsForOrder', () => {
  it('sums COGS + shipping + payment processing + Helix redemption', () => {
    const r = totalVariableCostsForOrder({
      lineItems: [
        { sku: 'A', quantity: 2, unitPriceCents: 5000, unitCogsCents: 1500 },
        { sku: 'B', quantity: 1, unitPriceCents: 3000, unitCogsCents: 900 },
      ],
      orderTotalCents: 13_000, // $130
      shippingDestination: 'domestic',
      helixRedemptionDiscountCents: 500,
      genex360TierIfPresent: null,
    });
    // COGS: 3000 + 900 = 3900
    // Shipping: 750
    // Payment: 13000 * 0.029 + 30 = 377 + 30 = 407
    // Helix redemption cost: 500
    // Total: 3900 + 750 + 407 + 500 = 5557
    expect(r.cogs_cents).toBe(3900);
    expect(r.shipping_cents).toBe(750);
    expect(r.payment_processing_cents).toBe(407);
    expect(r.helix_redemption_cents).toBe(500);
    expect(r.genex360_lab_cost_cents).toBe(0);
    expect(r.total_cents).toBe(5557);
  });

  it('includes GeneX360 lab cost when tier present', () => {
    const r = totalVariableCostsForOrder({
      lineItems: [],
      orderTotalCents: 38_800,
      shippingDestination: 'domestic',
      helixRedemptionDiscountCents: 0,
      genex360TierIfPresent: 'genex_m',
    });
    expect(r.genex360_lab_cost_cents).toBe(8500);
  });
});

describe('computeNRR', () => {
  it('matches definition: (start + expansion - contraction - churn) / start', () => {
    const r = computeNRR({
      startingMrrCents: 10_000,
      expansionMrrCents: 1_500,
      contractionMrrCents: 200,
      churnMrrCents: 800,
    });
    // (10000 + 1500 - 200 - 800) / 10000 = 10500 / 10000 = 1.05 → 105.000
    expect(r.nrr_percent).toBe(105);
    expect(r.is_expansion_mode).toBe(true);
  });

  it('NRR can exceed 100% (expansion exceeds churn)', () => {
    const r = computeNRR({
      startingMrrCents: 10_000,
      expansionMrrCents: 3_000,
      contractionMrrCents: 0,
      churnMrrCents: 1_000,
    });
    expect(r.nrr_percent).toBe(120);
    expect(r.is_expansion_mode).toBe(true);
  });

  it('NRR null when starting MRR is zero', () => {
    const r = computeNRR({
      startingMrrCents: 0,
      expansionMrrCents: 100,
      contractionMrrCents: 0,
      churnMrrCents: 0,
    });
    expect(r.nrr_percent).toBeNull();
  });
});

describe('computeGRR', () => {
  it('matches definition: (start - contraction - churn) / start', () => {
    // Same inputs as NRR test 1 but excluding expansion
    // (10000 - 200 - 800) / 10000 = 9000 / 10000 = 0.90 → 90.000
    expect(computeGRR({
      startingMrrCents: 10_000,
      contractionMrrCents: 200,
      churnMrrCents: 800,
    }).grr_percent).toBe(90);
  });

  it('GRR cannot exceed 100% (caps at start)', () => {
    const r = computeGRR({
      startingMrrCents: 10_000,
      contractionMrrCents: 0,
      churnMrrCents: 0,
    });
    expect(r.grr_percent).toBe(100);
  });

  it('GRR null when starting MRR is zero', () => {
    expect(computeGRR({
      startingMrrCents: 0,
      contractionMrrCents: 0,
      churnMrrCents: 0,
    }).grr_percent).toBeNull();
  });
});

describe('fitExponentialDecay + projectExponentialDecay', () => {
  it('fits a clean decay (1.0, 0.5, 0.25, 0.125) and predicts the next value', () => {
    const points: RetentionPoint[] = [
      { month: 0, retention: 1.0 },
      { month: 1, retention: 0.5 },
      { month: 2, retention: 0.25 },
      { month: 3, retention: 0.125 },
    ];
    const fit = fitExponentialDecay(points);
    expect(fit.method).toBe('exponential_decay');
    // Project month 4 should be approximately 0.0625
    const next = projectExponentialDecay(fit, 4);
    expect(next).toBeGreaterThan(0.04);
    expect(next).toBeLessThan(0.08);
  });

  it('falls back to linear when fewer than 3 points', () => {
    const points: RetentionPoint[] = [
      { month: 0, retention: 1.0 },
      { month: 1, retention: 0.7 },
    ];
    const fit = fitExponentialDecay(points);
    expect(fit.method).toBe('linear_decay');
  });

  it('clamps projection to >= 0', () => {
    const points: RetentionPoint[] = [
      { month: 0, retention: 1.0 },
      { month: 1, retention: 0.5 },
      { month: 2, retention: 0.25 },
    ];
    const fit = fitExponentialDecay(points);
    const distantFuture = projectExponentialDecay(fit, 999);
    expect(distantFuture).toBeGreaterThanOrEqual(0);
  });
});

describe('computeCohortLTV', () => {
  function bucket(n: number, revenue: number, varCost: number, retention: number): CohortMonthlyAggregate {
    return {
      month_offset: n,
      active_count: Math.round(retention * 100),
      revenue_cents: revenue,
      variable_cost_cents: varCost,
    };
  }

  it('computes 12mo LTV from actual data when cohort is mature', () => {
    const buckets: CohortMonthlyAggregate[] = [];
    for (let i = 0; i < 12; i++) {
      buckets.push(bucket(i, 10_000, 4_000, 1 - i * 0.05)); // declining retention
    }
    const r = computeCohortLTV({
      cohortMonth: '2025-04-01',
      cohortSize: 100,
      monthlyAggregates: buckets,
      horizons: [12, 24, 36],
    });
    expect(r.ltv_12mo_cents).toBeGreaterThan(0);
    expect(r.is_12mo_projected).toBe(false); // 12 months actual data
    expect(r.is_24mo_projected).toBe(true);  // 24mo requires projection
    expect(r.is_36mo_projected).toBe(true);
  });

  it('cohort_size of zero returns zero LTV across all horizons', () => {
    const r = computeCohortLTV({
      cohortMonth: '2025-04-01',
      cohortSize: 0,
      monthlyAggregates: [],
      horizons: [12, 24, 36],
    });
    expect(r.ltv_12mo_cents).toBe(0);
    expect(r.ltv_24mo_cents).toBe(0);
    expect(r.ltv_36mo_cents).toBe(0);
  });

  it('cumulative LTV monotonically increases month over month', () => {
    const buckets: CohortMonthlyAggregate[] = [
      bucket(0, 10_000, 3_000, 1.0),
      bucket(1, 9_000, 2_700, 0.9),
      bucket(2, 8_000, 2_400, 0.8),
    ];
    const r = computeCohortLTV({
      cohortMonth: '2026-04-01',
      cohortSize: 100,
      monthlyAggregates: buckets,
      horizons: [12],
    });
    for (let i = 1; i < r.cumulative_ltv_per_customer_by_month.length; i++) {
      expect(r.cumulative_ltv_per_customer_by_month[i])
        .toBeGreaterThanOrEqual(r.cumulative_ltv_per_customer_by_month[i - 1]);
    }
  });
});
