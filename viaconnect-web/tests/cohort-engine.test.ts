// Prompt #94 Phase 4: Cohort engine pure-function tests.
// Retention + revenue + comparison are deterministic over pre-aggregated
// per-month buckets. Migration shape lives in the migration-shape sweep.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  computeRetentionCurve,
  computeRevenueCurve,
  compareCohorts,
  type CohortBucket,
  ACTIVE_DEFINITIONS,
} from '@/lib/analytics/cohort-engine';

function bucket(
  m: number,
  active: number,
  paying: number,
  loggedIn: number,
  rev: number,
  margin: number,
): CohortBucket {
  return {
    month_offset: m,
    active_subscription_count: paying,
    any_purchase_or_active_count: active,
    logged_in_count: loggedIn,
    revenue_cents: rev,
    contribution_margin_cents: margin,
  };
}

describe('computeRetentionCurve', () => {
  it('zero cohort size returns empty curve', () => {
    const r = computeRetentionCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 0,
      buckets: [],
      activeDefinition: 'strict',
      horizonMonths: 12,
    });
    expect(r.cohort_size_initial).toBe(0);
    expect(r.retention_by_month).toHaveLength(0);
  });

  it('strict definition uses active_subscription_count', () => {
    const r = computeRetentionCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 100,
      buckets: [
        bucket(0, 100, 100, 100, 0, 0),
        bucket(1, 90, 80, 95, 0, 0),
        bucket(2, 80, 60, 90, 0, 0),
      ],
      activeDefinition: 'strict',
      horizonMonths: 3,
    });
    expect(r.retention_by_month[0].retention_rate).toBe(1);   // 100/100
    expect(r.retention_by_month[1].retention_rate).toBe(0.8); // 80/100
    expect(r.retention_by_month[2].retention_rate).toBe(0.6); // 60/100
  });

  it('standard definition uses any_purchase_or_active_count', () => {
    const r = computeRetentionCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 100,
      buckets: [
        bucket(0, 100, 100, 100, 0, 0),
        bucket(1, 90, 80, 95, 0, 0),
      ],
      activeDefinition: 'standard',
      horizonMonths: 2,
    });
    expect(r.retention_by_month[1].retention_rate).toBe(0.9); // 90/100
  });

  it('loose definition uses logged_in_count and is labeled engagement', () => {
    const r = computeRetentionCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 100,
      buckets: [
        bucket(0, 100, 100, 100, 0, 0),
        bucket(1, 90, 80, 95, 0, 0),
      ],
      activeDefinition: 'loose',
      horizonMonths: 2,
    });
    expect(r.retention_by_month[1].retention_rate).toBe(0.95);
    expect(r.is_engagement_not_retention).toBe(true);
  });

  it('strict + standard are NOT labeled as engagement', () => {
    const inputs = ['strict', 'standard'] as const;
    for (const def of inputs) {
      const r = computeRetentionCurve({
        cohortMonth: '2026-01-01',
        cohortSize: 100,
        buckets: [bucket(0, 100, 100, 100, 0, 0)],
        activeDefinition: def,
        horizonMonths: 1,
      });
      expect(r.is_engagement_not_retention).toBe(false);
    }
  });

  it('extends curve out to horizonMonths with is_projected=true on missing buckets', () => {
    const r = computeRetentionCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 100,
      buckets: [bucket(0, 100, 100, 100, 0, 0), bucket(1, 90, 80, 95, 0, 0)],
      activeDefinition: 'strict',
      horizonMonths: 12,
    });
    expect(r.retention_by_month).toHaveLength(12);
    expect(r.retention_by_month[1].is_projected).toBe(false);
    expect(r.retention_by_month[2].is_projected).toBe(true);
    expect(r.retention_by_month[2].active_count).toBeNull();
  });

  it('checkpoint helpers expose 1/3/6/12/24-month rates', () => {
    const buckets: CohortBucket[] = [];
    for (let i = 0; i < 25; i++) {
      buckets.push(bucket(i, 100 - i * 2, 100 - i * 3, 100 - i, 0, 0));
    }
    const r = computeRetentionCurve({
      cohortMonth: '2025-04-01',
      cohortSize: 100,
      buckets,
      activeDefinition: 'strict',
      horizonMonths: 25,
    });
    // strict uses paying counts: 100, 97, 94, 91, ..., (100 - 3*m)
    expect(r.checkpoints.month_1).toBe(0.97);
    expect(r.checkpoints.month_3).toBe(0.91);
    expect(r.checkpoints.month_6).toBe(0.82);
    expect(r.checkpoints.month_12).toBe(0.64);
    expect(r.checkpoints.month_24).toBe(0.28);
  });

  it('exposes the canonical ACTIVE_DEFINITIONS list', () => {
    expect(ACTIVE_DEFINITIONS).toEqual(['strict', 'standard', 'loose']);
  });
});

describe('computeRevenueCurve', () => {
  it('per-customer revenue divides by INITIAL cohort size, not current active', () => {
    // Critical correctness: 100 acquired customers, 50 active in month 1
    // contributing $5000. Per-customer should be $50, NOT $100.
    const r = computeRevenueCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 100,
      buckets: [
        bucket(0, 100, 100, 100, 0, 0),
        bucket(1, 50, 50, 60, 500_000, 200_000),
      ],
      horizonMonths: 2,
    });
    expect(r.monthly_revenue_per_customer_by_month[1]).toBe(5000); // 500000/100
  });

  it('cumulative is monotonic non-decreasing', () => {
    const buckets: CohortBucket[] = [];
    for (let i = 0; i < 10; i++) {
      buckets.push(bucket(i, 100, 100, 100, 100_000, 30_000));
    }
    const r = computeRevenueCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 100,
      buckets,
      horizonMonths: 10,
    });
    for (let i = 1; i < r.cumulative_revenue_per_customer_by_month.length; i++) {
      expect(r.cumulative_revenue_per_customer_by_month[i])
        .toBeGreaterThanOrEqual(r.cumulative_revenue_per_customer_by_month[i - 1]);
    }
  });

  it('contribution margin curve uses contribution_margin_cents directly', () => {
    const r = computeRevenueCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 100,
      buckets: [
        bucket(0, 100, 100, 100, 100_000, 40_000),
        bucket(1, 100, 100, 100, 100_000, 40_000),
      ],
      horizonMonths: 2,
    });
    // Cumulative contribution margin per customer at m=1: 800
    // (40000+40000)/100 = 800 per customer
    expect(r.cumulative_contribution_margin_per_customer_by_month[1]).toBe(800);
  });

  it('handles cohort_size = 0 by returning zero arrays', () => {
    const r = computeRevenueCurve({
      cohortMonth: '2026-01-01',
      cohortSize: 0,
      buckets: [],
      horizonMonths: 12,
    });
    expect(r.monthly_revenue_per_customer_by_month.every((v) => v === 0)).toBe(true);
  });
});

describe('compareCohorts', () => {
  it('aligns multiple cohorts to a shared month-offset axis', () => {
    const result = compareCohorts({
      cohorts: [
        {
          cohortMonth: '2026-01-01',
          segmentDescriptor: 'tier=platinum',
          cohortSize: 100,
          buckets: [
            bucket(0, 100, 100, 100, 100_000, 40_000),
            bucket(1, 90, 90, 95, 90_000, 36_000),
            bucket(2, 80, 80, 90, 80_000, 32_000),
          ],
          horizonMonths: 24,
          ltv24moCents: 50_000,
        },
        {
          cohortMonth: '2026-02-01',
          segmentDescriptor: 'tier=gold',
          cohortSize: 50,
          buckets: [
            bucket(0, 50, 50, 50, 30_000, 12_000),
            bucket(1, 45, 45, 47, 27_000, 10_800),
          ],
          horizonMonths: 24,
          ltv24moCents: 25_000,
        },
      ],
      activeDefinition: 'strict',
    });
    expect(result.cohorts).toHaveLength(2);
    expect(result.cohorts[0].segment_descriptor).toBe('tier=platinum');
    expect(result.cohorts[0].retention_curve[0]).toBe(1);
    expect(result.cohorts[0].retention_curve[1]).toBe(0.9);
    expect(result.cohorts[1].retention_curve[1]).toBe(0.9);
    expect(result.comparison_notes.length).toBeGreaterThanOrEqual(0);
  });

  it('flags cohort_size disparity in notes', () => {
    const result = compareCohorts({
      cohorts: [
        {
          cohortMonth: '2026-01-01',
          segmentDescriptor: 'channel=facebook',
          cohortSize: 1000,
          buckets: [bucket(0, 1000, 1000, 1000, 0, 0)],
          horizonMonths: 12,
          ltv24moCents: 0,
        },
        {
          cohortMonth: '2026-01-01',
          segmentDescriptor: 'channel=podcast',
          cohortSize: 5,
          buckets: [bucket(0, 5, 5, 5, 0, 0)],
          horizonMonths: 12,
          ltv24moCents: 0,
        },
      ],
      activeDefinition: 'strict',
    });
    expect(
      result.comparison_notes.some((n) =>
        n.toLowerCase().includes('disparity') ||
        n.toLowerCase().includes('low statistical') ||
        n.toLowerCase().includes('small'),
      ),
    ).toBe(true);
  });
});

describe('Phase 4 migration shape', () => {
  const repo = path.resolve(__dirname, '..');

  it('cohort_customer_monthly is a MATERIALIZED VIEW, not a table', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000350_cohort_customer_monthly_mv.sql'),
      'utf8',
    );
    expect(sql).toMatch(/CREATE MATERIALIZED VIEW IF NOT EXISTS public\.cohort_customer_monthly/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS/);
  });

  it('refresh cron schedule exists', () => {
    const sql = readFileSync(
      path.join(repo, 'supabase/migrations/20260418000360_cohort_mv_refresh_cron.sql'),
      'utf8',
    );
    expect(sql).toMatch(/cron\.schedule/);
    expect(sql).toMatch(/REFRESH MATERIALIZED VIEW/);
  });
});
