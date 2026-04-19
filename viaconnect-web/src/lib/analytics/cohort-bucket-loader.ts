// Prompt #94 Phase 4.5: Cohort bucket loader.
//
// DB-backed reader that materializes raw cohort_customer_monthly rows into
// the CohortBucket[] shape the pure cohort-engine consumes. Optionally
// applies a segment filter (channel, archetype, practitioner_attached, tier).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CohortBucket } from './cohort-engine';

export type SegmentType =
  | 'overall'
  | 'channel'
  | 'archetype'
  | 'practitioner_attached'
  | 'tier';

export interface LoadCohortBucketsInput {
  cohortMonthIso: string;            // YYYY-MM-01
  segmentType?: SegmentType;
  segmentValue?: string;             // 'all', channel id, archetype id, 'true'/'false', tier id
}

export interface LoadCohortBucketsResult {
  cohortSize: number;
  buckets: CohortBucket[];
}

export async function loadCohortBuckets(
  input: LoadCohortBucketsInput,
  supabase: SupabaseClient | unknown,
): Promise<LoadCohortBucketsResult> {
  const sb = supabase as any;
  let q = sb
    .from('cohort_customer_monthly')
    .select(
      'user_id, cohort_month, activity_month, was_active_strict, was_active_standard, was_logged_in, revenue_cents, contribution_margin_cents, first_touch_channel, archetype_id, is_practitioner_attached, initial_tier_id',
    )
    .eq('cohort_month', input.cohortMonthIso);

  // Segment filter at the DB layer when present.
  if (input.segmentType && input.segmentType !== 'overall' && input.segmentValue) {
    switch (input.segmentType) {
      case 'channel':
        q = q.eq('first_touch_channel', input.segmentValue);
        break;
      case 'archetype':
        q = q.eq('archetype_id', input.segmentValue);
        break;
      case 'practitioner_attached':
        q = q.eq('is_practitioner_attached', input.segmentValue === 'true');
        break;
      case 'tier':
        q = q.eq('initial_tier_id', input.segmentValue);
        break;
    }
  }

  const { data } = await q;
  const rows = (data ?? []) as Array<{
    user_id: string;
    activity_month: string;
    was_active_strict: boolean;
    was_active_standard: boolean;
    was_logged_in: boolean;
    revenue_cents: number;
    contribution_margin_cents: number;
  }>;

  const cohortStart = new Date(`${input.cohortMonthIso}T00:00:00.000Z`);
  const usersInCohort = new Set<string>();
  const grouped = new Map<number, {
    active_subscription_count: number;
    any_purchase_or_active_count: number;
    logged_in_count: number;
    revenue_cents: number;
    contribution_margin_cents: number;
  }>();

  for (const r of rows) {
    usersInCohort.add(r.user_id);
    const am = new Date(`${r.activity_month}T00:00:00.000Z`);
    const offset =
      (am.getUTCFullYear() - cohortStart.getUTCFullYear()) * 12 +
      (am.getUTCMonth() - cohortStart.getUTCMonth());
    if (offset < 0) continue;

    const cur = grouped.get(offset) ?? {
      active_subscription_count: 0,
      any_purchase_or_active_count: 0,
      logged_in_count: 0,
      revenue_cents: 0,
      contribution_margin_cents: 0,
    };
    if (r.was_active_strict)   cur.active_subscription_count    += 1;
    if (r.was_active_standard) cur.any_purchase_or_active_count += 1;
    if (r.was_logged_in)       cur.logged_in_count              += 1;
    cur.revenue_cents              += r.revenue_cents ?? 0;
    cur.contribution_margin_cents  += r.contribution_margin_cents ?? 0;
    grouped.set(offset, cur);
  }

  const buckets: CohortBucket[] = Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month_offset, v]) => ({
      month_offset,
      active_subscription_count: v.active_subscription_count,
      any_purchase_or_active_count: v.any_purchase_or_active_count,
      logged_in_count: v.logged_in_count,
      revenue_cents: v.revenue_cents,
      contribution_margin_cents: v.contribution_margin_cents,
    }));

  return {
    cohortSize: usersInCohort.size,
    buckets,
  };
}
