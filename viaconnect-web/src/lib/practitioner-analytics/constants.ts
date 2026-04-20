// Prompt #99 Phase 1 (Path A): Client-safe constants + types for the
// practitioner analytics surfaces. Lives in its own module so client
// page scaffolds can import without pulling in the server Supabase
// client (which reaches for next/headers and would break the build
// from a 'use client' boundary).

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
