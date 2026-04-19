// Prompt #94 Phase 4.2: Cohort engine.
//
// Pure-function cores. The DB layer (cohort_customer_monthly materialized
// view, refreshed nightly) provides per-cohort, per-month buckets; this
// file does the math the dashboard renders.
//
// Three "active" definitions per spec:
//   strict   active paid subscription in the month             (LTV / board)
//   standard subscription OR any purchase in the month         (operations)
//   loose    logged into the app in the month                  (engagement)
//
// Loose is exposed only with is_engagement_not_retention=true so the
// dashboard can label it distinctly. Gary cannot inadvertently use loose
// as the LTV basis.

export const ACTIVE_DEFINITIONS = ['strict', 'standard', 'loose'] as const;
export type ActiveDefinition = (typeof ACTIVE_DEFINITIONS)[number];

export interface CohortBucket {
  month_offset: number;                       // 0 = first month of cohort
  active_subscription_count: number;          // strict
  any_purchase_or_active_count: number;       // standard (>= strict)
  logged_in_count: number;                    // loose (>= standard)
  revenue_cents: number;                      // total revenue from cohort
  contribution_margin_cents: number;          // revenue minus variable costs
}

// ---------------------------------------------------------------------------
// Retention curve
// ---------------------------------------------------------------------------

export interface RetentionMonthCell {
  month_offset: number;
  active_count: number | null;     // null when month is beyond last bucket
  retention_rate: number | null;
  is_projected: boolean;           // true when no actual data for this offset
}

export interface RetentionCurve {
  cohort_month: string;
  cohort_size_initial: number;
  active_definition: ActiveDefinition;
  is_engagement_not_retention: boolean;
  retention_by_month: RetentionMonthCell[];
  checkpoints: {
    month_1:  number | null;
    month_3:  number | null;
    month_6:  number | null;
    month_12: number | null;
    month_24: number | null;
  };
}

export interface ComputeRetentionInput {
  cohortMonth: string;
  cohortSize: number;
  buckets: CohortBucket[];
  activeDefinition: ActiveDefinition;
  horizonMonths: number;
}

export function computeRetentionCurve(input: ComputeRetentionInput): RetentionCurve {
  const isEngagement = input.activeDefinition === 'loose';

  if (input.cohortSize <= 0) {
    return {
      cohort_month: input.cohortMonth,
      cohort_size_initial: 0,
      active_definition: input.activeDefinition,
      is_engagement_not_retention: isEngagement,
      retention_by_month: [],
      checkpoints: { month_1: null, month_3: null, month_6: null, month_12: null, month_24: null },
    };
  }

  const byOffset = new Map<number, CohortBucket>();
  for (const b of input.buckets) byOffset.set(b.month_offset, b);

  const cells: RetentionMonthCell[] = [];
  for (let m = 0; m < input.horizonMonths; m++) {
    const b = byOffset.get(m);
    if (!b) {
      cells.push({
        month_offset: m,
        active_count: null,
        retention_rate: null,
        is_projected: true,
      });
      continue;
    }
    const count = pickActiveCount(b, input.activeDefinition);
    cells.push({
      month_offset: m,
      active_count: count,
      retention_rate: roundRate(count / input.cohortSize),
      is_projected: false,
    });
  }

  return {
    cohort_month: input.cohortMonth,
    cohort_size_initial: input.cohortSize,
    active_definition: input.activeDefinition,
    is_engagement_not_retention: isEngagement,
    retention_by_month: cells,
    checkpoints: {
      month_1:  cells[1]?.retention_rate  ?? null,
      month_3:  cells[3]?.retention_rate  ?? null,
      month_6:  cells[6]?.retention_rate  ?? null,
      month_12: cells[12]?.retention_rate ?? null,
      month_24: cells[24]?.retention_rate ?? null,
    },
  };
}

function pickActiveCount(b: CohortBucket, def: ActiveDefinition): number {
  switch (def) {
    case 'strict':   return b.active_subscription_count;
    case 'standard': return b.any_purchase_or_active_count;
    case 'loose':    return b.logged_in_count;
  }
}

function roundRate(r: number): number {
  return Math.round(r * 100) / 100;
}

// ---------------------------------------------------------------------------
// Revenue curve
// ---------------------------------------------------------------------------

export interface RevenueCurve {
  cohort_month: string;
  cohort_size_initial: number;
  monthly_revenue_per_customer_by_month: number[];
  cumulative_revenue_per_customer_by_month: number[];
  cumulative_contribution_margin_per_customer_by_month: number[];
}

export interface ComputeRevenueInput {
  cohortMonth: string;
  cohortSize: number;
  buckets: CohortBucket[];
  horizonMonths: number;
}

export function computeRevenueCurve(input: ComputeRevenueInput): RevenueCurve {
  const monthly: number[] = [];
  const cumulativeRev: number[] = [];
  const cumulativeMargin: number[] = [];

  if (input.cohortSize <= 0) {
    for (let m = 0; m < input.horizonMonths; m++) {
      monthly.push(0);
      cumulativeRev.push(0);
      cumulativeMargin.push(0);
    }
    return {
      cohort_month: input.cohortMonth,
      cohort_size_initial: 0,
      monthly_revenue_per_customer_by_month: monthly,
      cumulative_revenue_per_customer_by_month: cumulativeRev,
      cumulative_contribution_margin_per_customer_by_month: cumulativeMargin,
    };
  }

  const byOffset = new Map<number, CohortBucket>();
  for (const b of input.buckets) byOffset.set(b.month_offset, b);

  let runningRev = 0;
  let runningMargin = 0;
  for (let m = 0; m < input.horizonMonths; m++) {
    const b = byOffset.get(m);
    const monthRev = b ? b.revenue_cents / input.cohortSize : 0;
    const monthMargin = b ? b.contribution_margin_cents / input.cohortSize : 0;
    runningRev += monthRev;
    runningMargin += monthMargin;
    monthly.push(Math.round(monthRev));
    cumulativeRev.push(Math.round(runningRev));
    cumulativeMargin.push(Math.round(runningMargin));
  }

  return {
    cohort_month: input.cohortMonth,
    cohort_size_initial: input.cohortSize,
    monthly_revenue_per_customer_by_month: monthly,
    cumulative_revenue_per_customer_by_month: cumulativeRev,
    cumulative_contribution_margin_per_customer_by_month: cumulativeMargin,
  };
}

// ---------------------------------------------------------------------------
// Cohort comparison
// ---------------------------------------------------------------------------

export interface CohortComparisonInput {
  cohorts: Array<{
    cohortMonth: string;
    segmentDescriptor: string;
    cohortSize: number;
    buckets: CohortBucket[];
    horizonMonths: number;
    ltv24moCents: number;
  }>;
  activeDefinition: ActiveDefinition;
}

export interface CohortComparisonResult {
  cohorts: Array<{
    cohort_month: string;
    segment_descriptor: string;
    cohort_size: number;
    retention_curve: number[];        // length = horizonMonths
    revenue_curve: number[];          // cumulative per-customer
    ltv_24mo_cents: number;
  }>;
  comparison_notes: string[];
}

export function compareCohorts(input: CohortComparisonInput): CohortComparisonResult {
  const minCohortSize = Math.min(...input.cohorts.map((c) => c.cohortSize));
  const maxCohortSize = Math.max(...input.cohorts.map((c) => c.cohortSize));
  const notes: string[] = [];

  if (input.cohorts.length >= 2 && minCohortSize > 0 && maxCohortSize / minCohortSize >= 10) {
    notes.push(
      `Cohort size disparity flagged: smallest cohort ${minCohortSize}, largest ${maxCohortSize}. Smaller cohort comparisons have low statistical confidence.`,
    );
  }
  if (input.cohorts.some((c) => c.cohortSize < 30)) {
    notes.push(
      'One or more cohorts has fewer than 30 customers, treat retention and LTV deltas with caution.',
    );
  }

  return {
    cohorts: input.cohorts.map((c) => {
      const ret = computeRetentionCurve({
        cohortMonth: c.cohortMonth,
        cohortSize: c.cohortSize,
        buckets: c.buckets,
        activeDefinition: input.activeDefinition,
        horizonMonths: c.horizonMonths,
      });
      const rev = computeRevenueCurve({
        cohortMonth: c.cohortMonth,
        cohortSize: c.cohortSize,
        buckets: c.buckets,
        horizonMonths: c.horizonMonths,
      });
      return {
        cohort_month: c.cohortMonth,
        segment_descriptor: c.segmentDescriptor,
        cohort_size: c.cohortSize,
        retention_curve: ret.retention_by_month.map((cell) => cell.retention_rate ?? 0),
        revenue_curve: rev.cumulative_revenue_per_customer_by_month,
        ltv_24mo_cents: c.ltv24moCents,
      };
    }),
    comparison_notes: notes,
  };
}
