// Prompt #99 Phase 1 (Path A): Supabase query helpers for practitioner
// analytics. In Path A most materialized views are not yet live — the
// helpers return a `dependency_pending` result so page scaffolds can
// render a banner instead of throwing at the Supabase boundary.

import { createClient } from '@/lib/supabase/server';
import type { SherlockPage } from './sherlock-stub';

export type DependencyStatus = 'live' | 'dependency_pending';

export interface QueryOutcome<T> {
  status: DependencyStatus;
  /** Present when status === 'live'. */
  data?: T;
  /** Friendly label for the missing dependency (e.g.
   *  "clients + bio_optimization_scores"). */
  pendingReason?: string;
}

/** Materialized-view names per Prompt #99 §5. Kept in one place so the
 *  page scaffolds can reference them without stringly-typed typos, and
 *  so Path B can flip them to 'live' one-by-one. */
export const PRACTITIONER_MV: Record<SherlockPage, string> = {
  practice_health: 'practitioner_practice_health_mv',
  cohorts: 'practitioner_cohort_outcomes_mv',
  protocols: 'practitioner_protocol_effectiveness_mv',
  revenue: 'practitioner_revenue_rollup_mv',
  engagement: 'practitioner_engagement_summary_mv',
};

/** Pending-reason strings shown in the dependency banner. */
export const PRACTITIONER_PENDING_REASON: Record<SherlockPage, string> = {
  practice_health: 'clients + bio_optimization_scores',
  cohorts: 'clients + bio_optimization_scores + caq_submissions',
  protocols: 'user_protocols + interaction_events',
  revenue: 'whitelabel_orders + referral_commissions + practitioner_transactions',
  engagement: 'engagement_score_snapshots + wearables',
};

/** Fetches the cached Sherlock insight row for a page if one exists.
 *  This table IS live (migration 20260419000010), so it's safe to
 *  query. Returns null when no cache exists for today. */
export async function fetchCachedSherlockInsight(
  practitionerId: string,
  page: SherlockPage,
): Promise<null | {
  headline: string;
  body: string;
  suggestedAction: string | null;
  confidence: 'high' | 'medium' | 'low';
  generatedAt: string;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as unknown as any;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('sherlock_insights_cache')
    .select('headline, body, suggested_action, confidence, generated_at')
    .eq('practitioner_id', practitionerId)
    .eq('page', page)
    .eq('generated_at', today)
    .maybeSingle();
  const row = data as
    | {
        headline: string;
        body: string;
        suggested_action: string | null;
        confidence: 'high' | 'medium' | 'low';
        generated_at: string;
      }
    | null;
  if (!row) return null;
  return {
    headline: row.headline,
    body: row.body,
    suggestedAction: row.suggested_action,
    confidence: row.confidence,
    generatedAt: row.generated_at,
  };
}

/** Path A placeholder for the MV read. Returns 'dependency_pending'
 *  for every surface so the UI renders the banner. Path B flips this
 *  one page at a time as dependencies land. */
export function fetchMaterializedView<T>(page: SherlockPage): QueryOutcome<T> {
  return {
    status: 'dependency_pending',
    pendingReason: PRACTITIONER_PENDING_REASON[page],
  };
}
