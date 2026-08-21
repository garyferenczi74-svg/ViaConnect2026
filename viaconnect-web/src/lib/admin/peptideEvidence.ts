/**
 * Prompt 225a: admin peptide evidence tiles data loader.
 * Service-role reads. Never returns dose amounts from trials/pubs.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface PeptideEvidenceTile {
  slug: string;
  displayName: string;
  consumerSafe: boolean;
  trialsLinked: number;
  publicationsLinked: number;
  trialsRegistered: number;
  trialsCompleted: number;
  trialsResultsPosted: number;
  publicationsHuman: number;
  publicationsAnimal: number;
  evidenceGapStatement: string;
  coverageNote: string;
  honestyComputedAt: string | null;
}

export interface PeptideEvidenceDashboard {
  tiles: PeptideEvidenceTile[];
  totals: {
    peptidesWithHonesty: number;
    kbTrials: number;
    kbPublications: number;
    evidenceLinks: number;
  };
  sourceStatus: Array<{
    sourceSystem: string;
    status: string;
    coverageNote: string;
  }>;
  canonicalFraming: string;
}

type HonestyShape = {
  trials_registered?: number;
  trials_completed?: number;
  trials_with_results_posted?: number;
  publications_human?: number;
  publications_animal?: number;
  evidence_gap_statement?: string;
  coverage_note?: string;
  computed_at?: string;
};

export async function loadPeptideEvidenceDashboard(opts?: {
  limit?: number;
}): Promise<PeptideEvidenceDashboard> {
  const admin = createAdminClient();
  const limit = Math.min(60, Math.max(5, opts?.limit ?? 24));

  const [
    peptidesRes,
    trialsCount,
    pubsCount,
    linksCount,
    sourcesRes,
  ] = await Promise.all([
    admin
      .from('kb_peptides')
      .select(
        'id, slug, display_name, consumer_safe, honesty_layer, exclusion_tier',
      )
      .eq('exclusion_tier', 'educational')
      .order('slug', { ascending: true })
      .limit(200),
    admin.from('kb_trials').select('id', { count: 'exact', head: true }),
    admin.from('kb_publications').select('id', { count: 'exact', head: true }),
    admin
      .from('kb_peptide_evidence_links')
      .select('id', { count: 'exact', head: true }),
    admin
      .from('kb_ingest_source_status')
      .select('source_system, status, coverage_note')
      .order('source_system', { ascending: true }),
  ]);

  const peptides = peptidesRes.data ?? [];
  const peptideIds = peptides.map((p) => p.id as string);

  const linkRows =
    peptideIds.length === 0
      ? []
      : (
          await admin
            .from('kb_peptide_evidence_links')
            .select('peptide_id, trial_id, publication_id')
            .in('peptide_id', peptideIds)
        ).data ?? [];

  const trialLinkCount = new Map<string, number>();
  const pubLinkCount = new Map<string, number>();
  for (const row of linkRows) {
    const pid = String(row.peptide_id);
    if (row.trial_id) {
      trialLinkCount.set(pid, (trialLinkCount.get(pid) ?? 0) + 1);
    }
    if (row.publication_id) {
      pubLinkCount.set(pid, (pubLinkCount.get(pid) ?? 0) + 1);
    }
  }

  const withHonesty = peptides.filter((p) => {
    const h = p.honesty_layer as HonestyShape | null;
    return Boolean(h && (h.evidence_gap_statement || typeof h.trials_registered === 'number'));
  });

  // Prefer peptides that already have honesty or evidence links; fill to limit.
  const ranked = [...peptides].sort((a, b) => {
    const ha = a.honesty_layer as HonestyShape | null;
    const hb = b.honesty_layer as HonestyShape | null;
    const score = (id: string, h: HonestyShape | null) =>
      (h?.evidence_gap_statement ? 4 : 0) +
      (trialLinkCount.get(id) ?? 0) +
      (pubLinkCount.get(id) ?? 0) +
      (typeof h?.trials_registered === 'number' ? 1 : 0);
    return score(String(b.id), hb) - score(String(a.id), ha);
  });

  const tiles: PeptideEvidenceTile[] = ranked.slice(0, limit).map((p) => {
    const h = (p.honesty_layer as HonestyShape | null) ?? {};
    return {
      slug: String(p.slug),
      displayName: String(p.display_name ?? p.slug),
      consumerSafe: p.consumer_safe === true,
      trialsLinked: trialLinkCount.get(String(p.id)) ?? 0,
      publicationsLinked: pubLinkCount.get(String(p.id)) ?? 0,
      trialsRegistered: Number(h.trials_registered ?? 0),
      trialsCompleted: Number(h.trials_completed ?? 0),
      trialsResultsPosted: Number(h.trials_with_results_posted ?? 0),
      publicationsHuman: Number(h.publications_human ?? 0),
      publicationsAnimal: Number(h.publications_animal ?? 0),
      evidenceGapStatement: String(h.evidence_gap_statement ?? '').slice(0, 500),
      coverageNote: String(h.coverage_note ?? '').slice(0, 300),
      honestyComputedAt: h.computed_at ? String(h.computed_at) : null,
    };
  });

  return {
    tiles,
    totals: {
      peptidesWithHonesty: withHonesty.length,
      kbTrials: trialsCount.count ?? 0,
      kbPublications: pubsCount.count ?? 0,
      evidenceLinks: linksCount.count ?? 0,
    },
    sourceStatus: (sourcesRes.data ?? []).map((s) => ({
      sourceSystem: String(s.source_system),
      status: String(s.status),
      coverageNote: String(s.coverage_note ?? ''),
    })),
    canonicalFraming:
      'Registration is not completion. Completion is not publication. Publication is not a positive result.',
  };
}
