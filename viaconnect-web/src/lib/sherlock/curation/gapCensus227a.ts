/**
 * Prompt 227a: gap census for Sherlock Collection 14 curation agenda.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export type GapCensusCounts = {
  unknownFdaStatus: number;
  unknownWadaStatus: number;
  unknown503a: number;
  zeroEvidenceLinks: number;
  weakGoalLinks: number;
  unknownBioavailabilityRoutes: number;
  staleTrials: number;
  stalePublications: number;
  terminatedMissingReason: number;
  peptidesEducational: number;
  computedAt: string;
};

const SLA_MS = 7 * 24 * 60 * 60 * 1000;

export async function computeGapCensus(): Promise<GapCensusCounts> {
  const admin = createAdminClient();
  const computedAt = new Date().toISOString();
  const staleBefore = new Date(Date.now() - SLA_MS).toISOString();

  const [
    pepRes,
    linksRes,
    goalRes,
    routesRes,
    trialsStale,
    pubsStale,
    terminated,
  ] = await Promise.all([
    admin
      .from('kb_peptides')
      .select('id, fda_status, wada_status, fda_503a_category, exclusion_tier')
      .eq('exclusion_tier', 'educational'),
    admin.from('kb_peptide_evidence_links').select('peptide_id'),
    admin
      .from('kb_goal_peptide_links')
      .select('id, indication_match')
      .in('indication_match', ['mechanistic_only', 'community_claim_only']),
    admin
      .from('kb_peptide_routes')
      .select('id, bioavailability_value')
      .is('bioavailability_value', null),
    admin
      .from('kb_trials')
      .select('id', { count: 'exact', head: true })
      .lt('last_verified_at', staleBefore),
    admin
      .from('kb_publications')
      .select('id', { count: 'exact', head: true })
      .lt('last_verified_at', staleBefore),
    admin
      .from('kb_trials')
      .select('id, status_reason')
      .in('status', ['terminated', 'withdrawn']),
  ]);

  if (pepRes.error) {
    safeLog.warn('sherlock.curation.census', 'peptides failed', {
      error: pepRes.error.message,
    });
  }

  const peptides = pepRes.data ?? [];
  const linked = new Set(
    (linksRes.data ?? []).map((r) => String(r.peptide_id)),
  );

  let unknownFdaStatus = 0;
  let unknownWadaStatus = 0;
  let unknown503a = 0;
  let zeroEvidenceLinks = 0;

  for (const p of peptides) {
    if (String(p.fda_status ?? 'unknown') === 'unknown') unknownFdaStatus += 1;
    if (String(p.wada_status ?? 'unknown') === 'unknown') unknownWadaStatus += 1;
    if (String(p.fda_503a_category ?? 'unknown') === 'unknown') unknown503a += 1;
    if (!linked.has(String(p.id))) zeroEvidenceLinks += 1;
  }

  const terminatedMissingReason = (terminated.data ?? []).filter((t) => {
    const reason = String(t.status_reason ?? '').trim();
    return reason.length === 0;
  }).length;

  return {
    unknownFdaStatus,
    unknownWadaStatus,
    unknown503a,
    zeroEvidenceLinks,
    weakGoalLinks: goalRes.data?.length ?? 0,
    unknownBioavailabilityRoutes: routesRes.data?.length ?? 0,
    staleTrials: trialsStale.count ?? 0,
    stalePublications: pubsStale.count ?? 0,
    terminatedMissingReason,
    peptidesEducational: peptides.length,
    computedAt,
  };
}

export async function persistGapCensus(args: {
  cycleId: string | null;
  counts: GapCensusCounts;
}): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('curation_gap_census_snapshots')
    .insert({
      cycle_id: args.cycleId,
      computed_at: args.counts.computedAt,
      counts: args.counts,
      details: {},
    })
    .select('id')
    .maybeSingle();
  if (error) {
    safeLog.warn('sherlock.curation.census', 'persist failed', {
      error: error.message,
    });
    return null;
  }
  return data?.id ? String(data.id) : null;
}
