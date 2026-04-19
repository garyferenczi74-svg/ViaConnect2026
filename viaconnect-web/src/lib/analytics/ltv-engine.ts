// Prompt #94 Phase 3.2: LTV calculation engine.
//
// LTV = cumulative contribution margin per customer over a horizon
// (12, 24, or 36 months). Two layers:
//
//   * computeCohortLTV (PURE): takes pre-aggregated per-month buckets and
//     returns LTV per horizon. Marks horizons as projected when the cohort
//     has not yet aged that far.
//   * buildCohortLTV (DB): reads from cohort_customer_monthly materialized
//     view (Phase 4) when present, or falls back to live aggregation. Calls
//     the pure core.
//
// Critical honesty rule: projected horizons are always returned with
// is_*_projected = true. The dashboard renders projected months distinctly.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fitExponentialDecay,
  projectExponentialDecay,
  type ProjectionMethod,
  type RetentionPoint,
} from './retention-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CohortMonthlyAggregate {
  month_offset: number;            // 0 = first month of cohort
  active_count: number;            // customers still active in this month
  revenue_cents: number;           // total revenue from cohort in this month
  variable_cost_cents: number;     // total variable cost in this month
}

export interface CohortLTVResult {
  cohort_month: string;            // YYYY-MM-01
  segment_type: string;
  segment_value: string;
  cohort_size: number;

  // Per-customer per-month (full curve, includes projection)
  revenue_per_customer_by_month: number[];
  variable_cost_per_customer_by_month: number[];
  contribution_margin_per_customer_by_month: number[];
  cumulative_ltv_per_customer_by_month: number[];

  // Horizon summaries
  ltv_12mo_cents: number;
  ltv_24mo_cents: number;
  ltv_36mo_cents: number;

  is_12mo_projected: boolean;
  is_24mo_projected: boolean;
  is_36mo_projected: boolean;

  retention_curve: number[];       // 0..1 per month
  projection_method: ProjectionMethod;
}

export interface ComputeCohortLTVInput {
  cohortMonth: string;             // YYYY-MM-01
  cohortSize: number;
  monthlyAggregates: CohortMonthlyAggregate[];
  horizons: number[];              // [12, 24, 36] typical
  segmentType?: string;
  segmentValue?: string;
}

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

export function computeCohortLTV(input: ComputeCohortLTVInput): CohortLTVResult {
  const { cohortMonth, cohortSize, monthlyAggregates, horizons } = input;
  const segmentType = input.segmentType ?? 'overall';
  const segmentValue = input.segmentValue ?? 'all';

  if (cohortSize <= 0 || monthlyAggregates.length === 0) {
    return zeroResult(cohortMonth, segmentType, segmentValue);
  }

  const monthsActual = monthlyAggregates.length;
  const maxHorizon = Math.max(...horizons);

  // Per-customer per-month (revenue / cost / margin)
  const revPerCustActual: number[] = [];
  const varPerCustActual: number[] = [];
  const marginPerCustActual: number[] = [];
  const retentionActual: number[] = [];

  for (const bucket of monthlyAggregates) {
    revPerCustActual.push(bucket.revenue_cents / cohortSize);
    varPerCustActual.push(bucket.variable_cost_cents / cohortSize);
    marginPerCustActual.push(
      (bucket.revenue_cents - bucket.variable_cost_cents) / cohortSize,
    );
    retentionActual.push(bucket.active_count / cohortSize);
  }

  // Build retention fit and project the remaining months out to maxHorizon.
  const retentionPoints: RetentionPoint[] = retentionActual.map((r, m) => ({
    month: m,
    retention: r,
  }));
  const fit = fitExponentialDecay(retentionPoints);

  // Mean per-customer revenue and variable cost while active. Used to
  // project future months by multiplying projected retention by mean
  // active-customer revenue + cost.
  const lastActualRev = revPerCustActual[revPerCustActual.length - 1] ?? 0;
  const lastActualVar = varPerCustActual[varPerCustActual.length - 1] ?? 0;
  const lastActualRet = retentionActual[retentionActual.length - 1] ?? 0;
  const revPerActive = lastActualRet > 0 ? lastActualRev / lastActualRet : 0;
  const varPerActive = lastActualRet > 0 ? lastActualVar / lastActualRet : 0;

  const revPerCust = [...revPerCustActual];
  const varPerCust = [...varPerCustActual];
  const marginPerCust = [...marginPerCustActual];
  const retention = [...retentionActual];

  for (let m = monthsActual; m < maxHorizon; m++) {
    const projRet = projectExponentialDecay(fit, m);
    const r = projRet * revPerActive;
    const v = projRet * varPerActive;
    revPerCust.push(r);
    varPerCust.push(v);
    marginPerCust.push(r - v);
    retention.push(projRet);
  }

  // Cumulative LTV per customer
  const cumulative: number[] = [];
  let running = 0;
  for (const m of marginPerCust) {
    running += m;
    cumulative.push(Math.round(running));
  }

  function ltvAt(horizon: number): number {
    if (horizon <= 0) return 0;
    const idx = Math.min(horizon - 1, cumulative.length - 1);
    return cumulative[idx] ?? 0;
  }

  return {
    cohort_month: cohortMonth,
    segment_type: segmentType,
    segment_value: segmentValue,
    cohort_size: cohortSize,
    revenue_per_customer_by_month: roundCentsArray(revPerCust),
    variable_cost_per_customer_by_month: roundCentsArray(varPerCust),
    contribution_margin_per_customer_by_month: roundCentsArray(marginPerCust),
    cumulative_ltv_per_customer_by_month: cumulative,
    ltv_12mo_cents: ltvAt(12),
    ltv_24mo_cents: ltvAt(24),
    ltv_36mo_cents: ltvAt(36),
    is_12mo_projected: monthsActual < 12,
    is_24mo_projected: monthsActual < 24,
    is_36mo_projected: monthsActual < 36,
    retention_curve: retention.map((r) => Math.round(r * 1000) / 1000),
    projection_method: monthsActual >= maxHorizon ? 'actual' : fit.method,
  };
}

// ---------------------------------------------------------------------------
// DB wrapper
// ---------------------------------------------------------------------------

export interface BuildCohortLTVDeps {
  supabase: SupabaseClient | unknown;
}

export interface BuildCohortLTVInput {
  cohortMonthIso: string;
  segmentType?: string;
  segmentValue?: string;
  horizons?: number[];
}

export async function buildCohortLTV(
  input: BuildCohortLTVInput,
  deps: BuildCohortLTVDeps,
): Promise<CohortLTVResult> {
  const horizons = input.horizons ?? [12, 24, 36];
  const segmentType = input.segmentType ?? 'overall';
  const segmentValue = input.segmentValue ?? 'all';

  // Phase 4 ships the cohort_customer_monthly materialized view; until
  // then we read from a live join. The shape returned here matches
  // CohortMonthlyAggregate so the pure core does not change when the
  // view goes live.
  const sb = deps.supabase as any;
  const { data: rawBuckets } = await sb
    .from('cohort_customer_monthly')
    .select('cohort_month, activity_month, revenue_cents, contribution_margin_cents, was_active')
    .eq('cohort_month', input.cohortMonthIso)
    .order('activity_month', { ascending: true });

  const rows = (rawBuckets ?? []) as Array<{
    cohort_month: string;
    activity_month: string;
    revenue_cents: number;
    contribution_margin_cents: number;
    was_active: boolean;
  }>;

  // Group by month_offset (months since cohort_month).
  const cohortStart = new Date(`${input.cohortMonthIso}T00:00:00.000Z`);
  const grouped = new Map<number, { rev: number; cost: number; active: number }>();
  for (const r of rows) {
    const am = new Date(`${r.activity_month}T00:00:00.000Z`);
    const offset =
      (am.getUTCFullYear() - cohortStart.getUTCFullYear()) * 12 +
      (am.getUTCMonth() - cohortStart.getUTCMonth());
    const cur = grouped.get(offset) ?? { rev: 0, cost: 0, active: 0 };
    cur.rev += r.revenue_cents ?? 0;
    cur.cost += (r.revenue_cents ?? 0) - (r.contribution_margin_cents ?? 0);
    cur.active += r.was_active ? 1 : 0;
    grouped.set(offset, cur);
  }

  const monthlyAggregates: CohortMonthlyAggregate[] = Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month_offset, v]) => ({
      month_offset,
      active_count: v.active,
      revenue_cents: v.rev,
      variable_cost_cents: v.cost,
    }));

  // Cohort size = active count at month_offset 0
  const cohortSize = monthlyAggregates.find((b) => b.month_offset === 0)?.active_count ?? 0;

  return computeCohortLTV({
    cohortMonth: input.cohortMonthIso,
    cohortSize,
    monthlyAggregates,
    horizons,
    segmentType,
    segmentValue,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function zeroResult(
  cohortMonth: string,
  segmentType: string,
  segmentValue: string,
): CohortLTVResult {
  return {
    cohort_month: cohortMonth,
    segment_type: segmentType,
    segment_value: segmentValue,
    cohort_size: 0,
    revenue_per_customer_by_month: [],
    variable_cost_per_customer_by_month: [],
    contribution_margin_per_customer_by_month: [],
    cumulative_ltv_per_customer_by_month: [],
    ltv_12mo_cents: 0,
    ltv_24mo_cents: 0,
    ltv_36mo_cents: 0,
    is_12mo_projected: true,
    is_24mo_projected: true,
    is_36mo_projected: true,
    retention_curve: [],
    projection_method: 'actual',
  };
}

function roundCentsArray(arr: number[]): number[] {
  return arr.map((n) => Math.round(n));
}
