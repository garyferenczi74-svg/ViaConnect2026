// Prompt #94 Phase 2: CAC + payback period tests.
// Pure-function tests over computeBlendedCAC, computeChannelCAC,
// calculatePaybackPeriod. Migration-shape assertions live in Phase 1 suite;
// API route is exercised at runtime.

import { describe, it, expect } from 'vitest';
import {
  computeBlendedCAC,
  computeChannelCAC,
  smoothTrailing3Month,
  type SpendBucket,
  type ConversionBucket,
} from '@/lib/analytics/cac-engine';
import { calculatePaybackPeriod } from '@/lib/analytics/payback-period';

describe('computeBlendedCAC', () => {
  it('divides total spend by paid conversions only', () => {
    const r = computeBlendedCAC({
      monthIso: '2026-04-01',
      spendCents: 1_000_000, // $10,000
      paidConversions: 50,
    });
    expect(r.cac_cents).toBe(20_000); // $200 CAC
    expect(r.confidence).toBe('high');
  });

  it('returns null CAC when zero paid conversions but spend > 0', () => {
    const r = computeBlendedCAC({
      monthIso: '2026-04-01',
      spendCents: 500_000,
      paidConversions: 0,
    });
    expect(r.cac_cents).toBeNull();
    expect(r.notes.some((n) => n.includes('zero paid conversions'))).toBe(true);
  });

  it('low confidence flag when fewer than 10 paid conversions', () => {
    const r = computeBlendedCAC({
      monthIso: '2026-04-01',
      spendCents: 100_000,
      paidConversions: 3,
    });
    expect(r.confidence).toBe('low');
    expect(r.cac_cents).toBe(33_333);
    expect(r.notes.some((n) => n.includes('low statistical'))).toBe(true);
  });

  it('medium confidence between 10 and 29 conversions', () => {
    expect(computeBlendedCAC({ monthIso: '2026-04-01', spendCents: 100_000, paidConversions: 10 }).confidence).toBe('medium');
    expect(computeBlendedCAC({ monthIso: '2026-04-01', spendCents: 100_000, paidConversions: 29 }).confidence).toBe('medium');
  });

  it('high confidence at 30+ conversions', () => {
    expect(computeBlendedCAC({ monthIso: '2026-04-01', spendCents: 100_000, paidConversions: 30 }).confidence).toBe('high');
  });

  it('rounds CAC to nearest cent (banker math via Math.round)', () => {
    const r = computeBlendedCAC({
      monthIso: '2026-04-01',
      spendCents: 1_000,
      paidConversions: 3,
    });
    expect(r.cac_cents).toBe(333); // 1000/3 = 333.33 -> 333
  });

  it('zero spend with zero conversions returns null CAC, no notes about wasted spend', () => {
    const r = computeBlendedCAC({
      monthIso: '2026-04-01',
      spendCents: 0,
      paidConversions: 0,
    });
    expect(r.cac_cents).toBeNull();
    expect(r.notes.some((n) => n.includes('zero paid'))).toBe(false);
  });
});

describe('computeChannelCAC', () => {
  it('computes CAC for a specific channel via first-touch attribution', () => {
    const r = computeChannelCAC({
      monthIso: '2026-04-01',
      channel: 'facebook_ads',
      channelSpendCents: 800_000,
      channelConversions: 40,
    });
    expect(r.cac_cents).toBe(20_000);
    expect(r.segment_value).toBe('facebook_ads');
  });

  it('flags spend with zero attributed conversions', () => {
    const r = computeChannelCAC({
      monthIso: '2026-04-01',
      channel: 'tiktok_ads',
      channelSpendCents: 200_000,
      channelConversions: 0,
    });
    expect(r.cac_cents).toBeNull();
    expect(r.notes.some((n) => n.includes('zero attributed conversions'))).toBe(true);
  });

  it('flags conversions with zero spend (likely lag from prior month)', () => {
    const r = computeChannelCAC({
      monthIso: '2026-04-01',
      channel: 'forbes_article',
      channelSpendCents: 0,
      channelConversions: 12,
    });
    expect(r.cac_cents).toBeNull();
    expect(r.notes.some((n) => n.includes('zero spend recorded'))).toBe(true);
  });

  it('channel-level confidence thresholds (lower than blended)', () => {
    // Channel-level data is sparser, so thresholds are lower
    expect(computeChannelCAC({ monthIso: '2026-04-01', channel: 'facebook_ads', channelSpendCents: 100_000, channelConversions: 5 }).confidence).toBe('medium');
    expect(computeChannelCAC({ monthIso: '2026-04-01', channel: 'facebook_ads', channelSpendCents: 100_000, channelConversions: 20 }).confidence).toBe('high');
    expect(computeChannelCAC({ monthIso: '2026-04-01', channel: 'facebook_ads', channelSpendCents: 100_000, channelConversions: 4 }).confidence).toBe('low');
  });
});

describe('smoothTrailing3Month', () => {
  it('sums last 3 months of spend and conversions, returns aggregated CAC', () => {
    const buckets: Array<{ spend: SpendBucket; conv: ConversionBucket }> = [
      { spend: { monthIso: '2026-02-01', spendCents: 100_000 }, conv: { monthIso: '2026-02-01', paidConversions: 10 } },
      { spend: { monthIso: '2026-03-01', spendCents: 200_000 }, conv: { monthIso: '2026-03-01', paidConversions: 20 } },
      { spend: { monthIso: '2026-04-01', spendCents: 300_000 }, conv: { monthIso: '2026-04-01', paidConversions: 30 } },
    ];
    const r = smoothTrailing3Month({
      monthIso: '2026-04-01',
      buckets,
    });
    // Total: $6000, 60 conversions => $100 CAC
    expect(r.spend_total_cents).toBe(600_000);
    expect(r.conversions_total).toBe(60);
    expect(r.cac_cents).toBe(10_000);
  });

  it('zero conversions across the trailing window returns null CAC', () => {
    const r = smoothTrailing3Month({
      monthIso: '2026-04-01',
      buckets: [
        { spend: { monthIso: '2026-02-01', spendCents: 100_000 }, conv: { monthIso: '2026-02-01', paidConversions: 0 } },
        { spend: { monthIso: '2026-03-01', spendCents: 100_000 }, conv: { monthIso: '2026-03-01', paidConversions: 0 } },
        { spend: { monthIso: '2026-04-01', spendCents: 100_000 }, conv: { monthIso: '2026-04-01', paidConversions: 0 } },
      ],
    });
    expect(r.cac_cents).toBeNull();
  });
});

describe('calculatePaybackPeriod', () => {
  it('returns 0 when CAC is zero', () => {
    expect(calculatePaybackPeriod(0, [100, 100, 100]).payback_month).toBe(0);
  });

  it('returns null when never recovers within window', () => {
    const r = calculatePaybackPeriod(10_000, [100, 100, 100]);
    expect(r.payback_month).toBeNull();
    expect(r.exceeds_36_months).toBe(false); // window only 3 months
  });

  it('returns exceeds_36_months when window is 36+ months and not paid back', () => {
    const r = calculatePaybackPeriod(1_000_000, new Array(36).fill(100));
    expect(r.payback_month).toBeNull();
    expect(r.exceeds_36_months).toBe(true);
  });

  it('linear interpolation gives fractional month precision', () => {
    // CAC 1500, monthly margins 1000, 1000, 1000.
    // Cumulative: 1000 (m=0), 2000 (m=1).
    // At m=1, cumulative 2000 >= 1500. overshoot = 500. fraction = 1 - 500/1000 = 0.5.
    // payback_month = 1 + 0.5 = 1.5
    const r = calculatePaybackPeriod(1500, [1000, 1000, 1000]);
    expect(r.payback_month).toBe(1.5);
  });

  it('exact-match returns the integer month boundary', () => {
    // CAC 2000, margins 1000, 1000.
    // m=0: cumulative 1000, not yet.
    // m=1: cumulative 2000, exactly equal. overshoot=0, fraction=1, month=1+1=2.
    const r = calculatePaybackPeriod(2000, [1000, 1000]);
    expect(r.payback_month).toBe(2);
  });

  it('payback in month 0 (immediate)', () => {
    const r = calculatePaybackPeriod(500, [1000, 1000]);
    // m=0: cumulative=1000, overshoot=500, fraction=0.5, month=0+0.5=0.5
    expect(r.payback_month).toBe(0.5);
  });
});
