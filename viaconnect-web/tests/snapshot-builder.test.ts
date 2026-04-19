// Prompt #94 Phase 7.2: Snapshot builder + alert evaluation tests.

import { describe, it, expect } from 'vitest';
import {
  computeSnapshotMetrics,
  evaluateAlerts,
  ALERT_THRESHOLDS,
  type SnapshotInputs,
  type ComputedSnapshot,
} from '@/lib/analytics/snapshot-builder';

function inputs(over: Partial<SnapshotInputs> = {}): SnapshotInputs {
  return {
    snapshotMonthIso: '2026-04-01',
    segmentType: 'overall',
    segmentValue: 'all',
    newCustomersCount: 100,
    activeCustomersCount: 1000,
    churnedCustomersCount: 20,
    activeCustomersStartOfMonth: 1020,
    totalRevenueCents: 50_000_00,            // $50,000
    subscriptionRevenueCents: 30_000_00,
    supplementRevenueCents: 15_000_00,
    genex360RevenueCents: 3_000_00,
    practitionerSubscriptionRevenueCents: 1_500_00,
    certificationRevenueCents: 500_00,
    cogsCents: 8_000_00,
    shippingCostCents: 2_000_00,
    paymentProcessingCents: 1_500_00,
    helixRedemptionCostCents: 500_00,
    marketingSpendCents: 5_000_00,
    blendedCacCents: 5_000,                  // $50 — input typically from buildBlendedCAC
    paybackPeriodMonths: 4,
    ltv12moCents: 30_000,
    ltv24moCents: 60_000,
    ltv36moCents: 90_000,
    netRevenueRetentionPercent: 105.0,
    grossRevenueRetentionPercent: 92.0,
    arpuCents: 5_000,
    mrrCents: 30_000_00,
    activeMembershipCount: 600,
    averageMrrPerMembershipCents: 5_000,
    ...over,
  };
}

describe('computeSnapshotMetrics', () => {
  it('computes contribution margin = revenue minus variable costs', () => {
    const r = computeSnapshotMetrics(inputs());
    // 50000 - (8000 + 2000 + 1500 + 500) = 38000
    expect(r.contribution_margin_cents).toBe(38_000_00);
    expect(r.total_variable_cost_cents).toBe(12_000_00);
  });

  it('computes contribution margin percent', () => {
    const r = computeSnapshotMetrics(inputs());
    // 38000 / 50000 = 76%
    expect(r.contribution_margin_percent).toBeCloseTo(76, 1);
  });

  it('computes LTV:CAC ratio at all three horizons', () => {
    const r = computeSnapshotMetrics(inputs());
    expect(r.ltv_cac_ratio_12mo).toBeCloseTo(6, 2);
    expect(r.ltv_cac_ratio_24mo).toBeCloseTo(12, 2);
    expect(r.ltv_cac_ratio_36mo).toBeCloseTo(18, 2);
  });

  it('LTV:CAC is null when CAC is null', () => {
    const r = computeSnapshotMetrics(inputs({ blendedCacCents: null }));
    expect(r.ltv_cac_ratio_24mo).toBeNull();
  });

  it('computes monthly + annualised churn from churned/start counts', () => {
    const r = computeSnapshotMetrics(inputs());
    // 20 / 1020 ≈ 1.961%
    expect(r.monthly_churn_rate_percent!).toBeCloseTo(1.961, 2);
    // (1 - (1 - 0.01961)^12) * 100 ≈ 21.18
    expect(r.annual_churn_rate_percent!).toBeGreaterThan(20);
    expect(r.annual_churn_rate_percent!).toBeLessThan(22);
  });

  it('emits ARR = MRR * 12', () => {
    const r = computeSnapshotMetrics(inputs({ mrrCents: 30_000_00 }));
    expect(r.arr_cents).toBe(360_000_00);
  });

  it('returns null monthly_churn when start-of-month is zero', () => {
    const r = computeSnapshotMetrics(inputs({ activeCustomersStartOfMonth: 0 }));
    expect(r.monthly_churn_rate_percent).toBeNull();
    expect(r.annual_churn_rate_percent).toBeNull();
  });

  it('preserves segment + month in output', () => {
    const r = computeSnapshotMetrics(inputs({
      snapshotMonthIso: '2026-03-01',
      segmentType: 'tier',
      segmentValue: 'platinum',
    }));
    expect(r.snapshot_month).toBe('2026-03-01');
    expect(r.segment_type).toBe('tier');
    expect(r.segment_value).toBe('platinum');
  });
});

describe('evaluateAlerts', () => {
  function snap(over: Partial<ComputedSnapshot> = {}): ComputedSnapshot {
    return {
      snapshot_month: '2026-04-01',
      segment_type: 'overall',
      segment_value: 'all',
      new_customers_count: 100,
      active_customers_count: 1000,
      churned_customers_count: 20,
      total_revenue_cents: 50_000_00,
      subscription_revenue_cents: 30_000_00,
      supplement_revenue_cents: 15_000_00,
      genex360_revenue_cents: 3_000_00,
      practitioner_subscription_revenue_cents: 1_500_00,
      certification_revenue_cents: 500_00,
      cogs_cents: 8_000_00,
      shipping_cost_cents: 2_000_00,
      payment_processing_cents: 1_500_00,
      helix_redemption_cost_cents: 500_00,
      total_variable_cost_cents: 12_000_00,
      contribution_margin_cents: 38_000_00,
      contribution_margin_percent: 76,
      marketing_spend_cents: 5_000_00,
      blended_cac_cents: 5_000,
      payback_period_months: 4,
      ltv_12mo_cents: 30_000,
      ltv_24mo_cents: 60_000,
      ltv_36mo_cents: 90_000,
      ltv_cac_ratio_12mo: 6,
      ltv_cac_ratio_24mo: 12,
      ltv_cac_ratio_36mo: 18,
      net_revenue_retention_percent: 105,
      gross_revenue_retention_percent: 92,
      monthly_churn_rate_percent: 1.96,
      annual_churn_rate_percent: 21,
      arpu_cents: 5_000,
      mrr_cents: 30_000_00,
      arr_cents: 360_000_00,
      ...over,
    };
  }

  it('returns empty array for a healthy snapshot', () => {
    expect(evaluateAlerts(snap())).toEqual([]);
  });

  it('fires LTV:CAC critical alert when ratio drops below 1', () => {
    const a = evaluateAlerts(snap({ ltv_cac_ratio_24mo: 0.7 }));
    const alert = a.find((x) => x.alert_type === 'ltv_cac_below_threshold');
    expect(alert).toBeTruthy();
    expect(alert!.severity).toBe('critical');
  });

  it('fires LTV:CAC warning alert when ratio is between 1.0 and 3.0', () => {
    const a = evaluateAlerts(snap({ ltv_cac_ratio_24mo: 2.5 }));
    const alert = a.find((x) => x.alert_type === 'ltv_cac_below_threshold');
    expect(alert).toBeTruthy();
    expect(alert!.severity).toBe('warning');
  });

  it('does NOT fire LTV:CAC alert when ratio is at or above 3.0', () => {
    const a = evaluateAlerts(snap({ ltv_cac_ratio_24mo: 3.5 }));
    expect(a.find((x) => x.alert_type === 'ltv_cac_below_threshold')).toBeFalsy();
  });

  it('fires payback alert when payback exceeds the threshold', () => {
    const a = evaluateAlerts(snap({ payback_period_months: ALERT_THRESHOLDS.PAYBACK_MAX_MONTHS + 1 }));
    expect(a.find((x) => x.alert_type === 'payback_above_threshold')).toBeTruthy();
  });

  it('fires GRR alert when GRR drops below the floor', () => {
    const a = evaluateAlerts(snap({ gross_revenue_retention_percent: ALERT_THRESHOLDS.GRR_MIN_PERCENT - 5 }));
    expect(a.find((x) => x.alert_type === 'grr_below_threshold')).toBeTruthy();
  });

  it('fires NRR alert when NRR drops below 100', () => {
    const a = evaluateAlerts(snap({ net_revenue_retention_percent: 92 }));
    expect(a.find((x) => x.alert_type === 'nrr_below_threshold')).toBeTruthy();
  });

  it('fires monthly-churn alert when churn exceeds the ceiling', () => {
    const a = evaluateAlerts(snap({ monthly_churn_rate_percent: ALERT_THRESHOLDS.MONTHLY_CHURN_MAX_PERCENT + 1 }));
    expect(a.find((x) => x.alert_type === 'monthly_churn_above_threshold')).toBeTruthy();
  });

  it('fires margin alert when contribution margin drops below the floor', () => {
    const a = evaluateAlerts(snap({ contribution_margin_percent: 30 }));
    expect(a.find((x) => x.alert_type === 'contribution_margin_below_threshold')).toBeTruthy();
  });

  it('does not fire LTV:CAC alert when ratio is null (data not yet available)', () => {
    const a = evaluateAlerts(snap({ ltv_cac_ratio_24mo: null }));
    expect(a.find((x) => x.alert_type === 'ltv_cac_below_threshold')).toBeFalsy();
  });

  it('alerts include a human-readable message', () => {
    const a = evaluateAlerts(snap({ payback_period_months: 24 }));
    const payback = a.find((x) => x.alert_type === 'payback_above_threshold')!;
    expect(payback.message).toMatch(/payback/i);
    expect(payback.message).toMatch(/24/);
  });
});
