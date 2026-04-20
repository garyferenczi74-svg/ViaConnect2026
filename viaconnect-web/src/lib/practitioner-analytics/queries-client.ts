// Prompt #99 Phase 2 (Path A): browser-side loaders for practitioner
// analytics surfaces whose upstream data is live. Each loader hits a
// row-filtered wrapper view (v_practitioner_*) so the practitioner
// only ever sees their own row; admins see all; consumer + naturopath
// see zero rows.
//
// The wrapper views isolate reward-program data by construction — the
// underlying MVs never select it, and the views only re-expose the
// MV's own columns.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SherlockPage } from './sherlock-stub';
import { PRACTITIONER_PENDING_REASON, type QueryOutcome } from './constants';

export interface PracticeHealthRow {
  practitionerId: string;
  totalActiveClients: number;
  newClients30d: number;
  newClients90d: number;
  avgBioOptimizationScore: number;
  clientsBioOptHigh: number;
  clientsBioOptMid: number;
  clientsBioOptLow: number;
  avgEngagementScore: number;
  refreshedAt: string;
}

export interface EngagementSummaryRow {
  practitionerId: string;
  consentingClientCount: number;
  clientsWithScore: number;
  avgEngagementScore: number;
  p50EngagementScore: number;
  p90EngagementScore: number;
  clientsLowEngagement: number;
  clientsMediumEngagement: number;
  clientsHighEngagement: number;
  clientsVeryHighEngagement: number;
  refreshedAt: string;
}

export interface ProtocolEffectivenessRow {
  practitionerId: string;
  protocolName: string;
  activeClientCount: number;
  totalClientCount: number;
  avgConfidenceScore: number;
  mostRecentAssignment: string | null;
  refreshedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any;

function asLoose(supabase: SupabaseClient): LooseClient {
  return supabase as unknown as LooseClient;
}

export async function fetchPracticeHealth(
  supabase: SupabaseClient,
): Promise<QueryOutcome<PracticeHealthRow | null>> {
  const { data } = await asLoose(supabase)
    .from('v_practitioner_practice_health')
    .select('*')
    .maybeSingle();
  if (!data) {
    return {
      status: 'dependency_pending',
      pendingReason: PRACTITIONER_PENDING_REASON.practice_health,
    };
  }
  const row = data as Record<string, unknown>;
  return {
    status: 'live',
    data: {
      practitionerId: row.practitioner_id as string,
      totalActiveClients: Number(row.total_active_clients ?? 0),
      newClients30d: Number(row.new_clients_30d ?? 0),
      newClients90d: Number(row.new_clients_90d ?? 0),
      avgBioOptimizationScore: Number(row.avg_bio_optimization_score ?? 0),
      clientsBioOptHigh: Number(row.clients_bio_opt_high ?? 0),
      clientsBioOptMid: Number(row.clients_bio_opt_mid ?? 0),
      clientsBioOptLow: Number(row.clients_bio_opt_low ?? 0),
      avgEngagementScore: Number(row.avg_engagement_score ?? 0),
      refreshedAt: String(row.refreshed_at ?? ''),
    },
  };
}

export async function fetchEngagementSummary(
  supabase: SupabaseClient,
): Promise<QueryOutcome<EngagementSummaryRow | null>> {
  const { data } = await asLoose(supabase)
    .from('v_practitioner_engagement_summary')
    .select('*')
    .maybeSingle();
  if (!data) {
    return {
      status: 'dependency_pending',
      pendingReason: PRACTITIONER_PENDING_REASON.engagement,
    };
  }
  const row = data as Record<string, unknown>;
  return {
    status: 'live',
    data: {
      practitionerId: row.practitioner_id as string,
      consentingClientCount: Number(row.consenting_client_count ?? 0),
      clientsWithScore: Number(row.clients_with_score ?? 0),
      avgEngagementScore: Number(row.avg_engagement_score ?? 0),
      p50EngagementScore: Number(row.p50_engagement_score ?? 0),
      p90EngagementScore: Number(row.p90_engagement_score ?? 0),
      clientsLowEngagement: Number(row.clients_low_engagement ?? 0),
      clientsMediumEngagement: Number(row.clients_medium_engagement ?? 0),
      clientsHighEngagement: Number(row.clients_high_engagement ?? 0),
      clientsVeryHighEngagement: Number(row.clients_very_high_engagement ?? 0),
      refreshedAt: String(row.refreshed_at ?? ''),
    },
  };
}

export async function fetchProtocolEffectiveness(
  supabase: SupabaseClient,
): Promise<QueryOutcome<ProtocolEffectivenessRow[]>> {
  const { data } = await asLoose(supabase)
    .from('v_practitioner_protocol_effectiveness')
    .select('*')
    .order('active_client_count', { ascending: false })
    .limit(10);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return {
      status: 'dependency_pending',
      pendingReason: PRACTITIONER_PENDING_REASON.protocols,
      data: [],
    };
  }
  return {
    status: 'live',
    data: rows.map((row) => ({
      practitionerId: row.practitioner_id as string,
      protocolName: row.protocol_name as string,
      activeClientCount: Number(row.active_client_count ?? 0),
      totalClientCount: Number(row.total_client_count ?? 0),
      avgConfidenceScore: Number(row.avg_confidence_score ?? 0),
      mostRecentAssignment: (row.most_recent_assignment as string | null) ?? null,
      refreshedAt: String(row.refreshed_at ?? ''),
    })),
  };
}

/** Pure: choose a direction label for a KPI delta. Returns 'up' for
 *  positive, 'down' for negative, 'flat' for zero. */
export function deltaDirection(n: number): 'up' | 'down' | 'flat' {
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'flat';
}

/** Pure: translate an engagement score bucket count into a percentage
 *  of the consenting denominator, clamped to [0,100]. Used for the
 *  distribution bar chart. Avoids divide-by-zero. */
export function bucketSharePercent(bucketCount: number, denominator: number): number {
  if (denominator <= 0) return 0;
  const pct = (bucketCount / denominator) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** Pure: map a Sherlock page name to the wrapper view it reads from.
 *  Useful for telemetry + tests that assert we never read a raw MV
 *  from browser code. */
export const PRACTITIONER_VIEW_NAME: Record<
  Extract<SherlockPage, 'practice_health' | 'protocols' | 'engagement'>,
  string
> = {
  practice_health: 'v_practitioner_practice_health',
  protocols: 'v_practitioner_protocol_effectiveness',
  engagement: 'v_practitioner_engagement_summary',
};
