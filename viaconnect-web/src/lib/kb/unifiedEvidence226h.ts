/**
 * Prompt 226h Wave B: shared evidence + source registry loaders.
 * One corpus shape for Science registry, Research Hub Evidence tab, and Hannah.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  BIOREGULATOR_PROVENANCE_DISCLOSURE_226H,
  formatProvenanceCounts,
  isConsumerRetrievablePublication,
} from '@/lib/peptides/gradeCap226h';
import type { PreparationClass } from '@/lib/peptides/preparationClass226h';

export type SourceRegistryRow = {
  id: string;
  domain: string;
  label: string;
  sourceKind: string;
  sourceTier: number | null;
  transport: string | null;
  registryStatus: string | null;
  blockedReason: string | null;
  coverageNote: string;
  lastSuccessfulRun: string | null;
  isActive: boolean;
  approvalStatus: string;
  cadence: string | null;
};

export type IngestSourceStatusRow = {
  sourceSystem: string;
  status: string;
  reason: string;
  coverageNote: string;
  lastSuccessfulRun: string | null;
};

export type EvidenceRecord = {
  recordId: string;
  recordType: 'trial' | 'publication';
  title: string;
  sourceUrl: string;
  peptideSlug: string;
  peptideDisplayName: string;
  relevance: string;
  sourceTier: number | null;
  preparationClass: PreparationClass;
  provenanceDisclosure: string;
  freshnessLabel: string;
};

export type PeptideEvidenceBundle = {
  query: string;
  peptides: Array<{
    peptideId: string;
    slug: string;
    displayName: string;
    preparationClass: PreparationClass;
    provenanceDisclosure: string;
    derivedFromSlug: string | null;
    honesty: Record<string, unknown>;
  }>;
  records: EvidenceRecord[];
  ingestStatus: IngestSourceStatusRow[];
  provenanceSummary: string | null;
};

function staleLabel(lastRun: string | null, slaHours: number): string {
  if (!lastRun) return 'No successful run recorded';
  const ageMs = Date.now() - new Date(lastRun).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'Freshness UNKNOWN';
  const ageH = ageMs / (1000 * 60 * 60);
  if (ageH > slaHours) {
    return `Stale: last success ${Math.floor(ageH)}h ago (SLA ${slaHours}h)`;
  }
  return `Updated ${Math.max(1, Math.floor(ageH))}h ago`;
}

export async function loadSourceRegistry(): Promise<{
  sources: SourceRegistryRow[];
  ingestStatus: IngestSourceStatusRow[];
}> {
  const admin = createAdminClient();
  const [srcRes, statusRes] = await Promise.all([
    admin
      .from('authorities_sources')
      .select(
        'id, domain, label, source_kind, source_tier, transport, registry_status, blocked_reason, coverage_note, last_successful_run, is_active, approval_status, cadence, notes',
      )
      .order('source_tier', { ascending: true, nullsFirst: false })
      .order('label', { ascending: true })
      .limit(200),
    admin
      .from('kb_ingest_source_status')
      .select('source_system, status, reason, coverage_note, last_successful_run')
      .order('source_system', { ascending: true }),
  ]);

  if (srcRes.error) {
    safeLog.warn('kb.unifiedEvidence', 'registry load failed', {
      error: srcRes.error.message,
    });
  }

  const sources: SourceRegistryRow[] = (srcRes.data ?? []).map((r) => ({
    id: String(r.id),
    domain: String(r.domain ?? ''),
    label: String(r.label ?? r.domain ?? ''),
    sourceKind: String(r.source_kind ?? ''),
    sourceTier: r.source_tier == null ? null : Number(r.source_tier),
    transport: r.transport == null ? null : String(r.transport),
    registryStatus: r.registry_status == null ? null : String(r.registry_status),
    blockedReason: r.blocked_reason == null ? null : String(r.blocked_reason),
    coverageNote: String(
      r.coverage_note || r.notes || '',
    ).slice(0, 500),
    lastSuccessfulRun: r.last_successful_run
      ? String(r.last_successful_run)
      : null,
    isActive: r.is_active === true,
    approvalStatus: String(r.approval_status ?? ''),
    cadence: r.cadence == null ? null : String(r.cadence),
  }));

  const ingestStatus: IngestSourceStatusRow[] = (statusRes.data ?? []).map(
    (r) => ({
      sourceSystem: String(r.source_system ?? ''),
      status: String(r.status ?? ''),
      reason: String(r.reason ?? ''),
      coverageNote: String(r.coverage_note ?? ''),
      lastSuccessfulRun: r.last_successful_run
        ? String(r.last_successful_run)
        : null,
    }),
  );

  return { sources, ingestStatus };
}

export async function loadPeptideEvidenceBundle(opts: {
  query?: string;
  slug?: string;
  limit?: number;
}): Promise<PeptideEvidenceBundle> {
  const admin = createAdminClient();
  const limit = Math.min(40, Math.max(5, opts.limit ?? 20));
  const q = (opts.query ?? opts.slug ?? '').trim();

  const { data: statusData } = await admin
    .from('kb_ingest_source_status')
    .select('source_system, status, reason, coverage_note, last_successful_run')
    .order('source_system', { ascending: true });

  const ingestStatus: IngestSourceStatusRow[] = (statusData ?? []).map((r) => ({
    sourceSystem: String(r.source_system ?? ''),
    status: String(r.status ?? ''),
    reason: String(r.reason ?? ''),
    coverageNote: String(r.coverage_note ?? ''),
    lastSuccessfulRun: r.last_successful_run
      ? String(r.last_successful_run)
      : null,
  }));

  const pubmedFresh = ingestStatus.find((s) => s.sourceSystem === 'pubmed');
  const freshnessLabel = staleLabel(pubmedFresh?.lastSuccessfulRun ?? null, 12);

  let pepQuery = admin
    .from('kb_peptides')
    .select(
      'id, slug, display_name, preparation_class, provenance_disclosure, derived_from_peptide_id, honesty_layer, exclusion_tier, consumer_safe',
    )
    .eq('exclusion_tier', 'educational')
    .eq('consumer_safe', true)
    .limit(80);

  if (opts.slug) {
    pepQuery = pepQuery.eq('slug', opts.slug);
  }

  const { data: peptidesRaw, error: pepErr } = await pepQuery;
  if (pepErr) {
    safeLog.warn('kb.unifiedEvidence', 'peptide load failed', {
      error: pepErr.message,
    });
    return {
      query: q,
      peptides: [],
      records: [],
      ingestStatus,
      provenanceSummary: null,
    };
  }

  let peptides = peptidesRaw ?? [];
  if (q && !opts.slug) {
    const nq = q.toLowerCase();
    peptides = peptides.filter((p) => {
      const blob = `${p.slug} ${p.display_name}`.toLowerCase();
      return blob.includes(nq);
    });
  }

  peptides = peptides.slice(0, 12);
  if (peptides.length === 0) {
    return {
      query: q,
      peptides: [],
      records: [],
      ingestStatus,
      provenanceSummary: null,
    };
  }

  const derivedIds = peptides
    .map((p) => p.derived_from_peptide_id)
    .filter((id): id is string => Boolean(id));
  const derivedSlugById = new Map<string, string>();
  if (derivedIds.length > 0) {
    const { data: derived } = await admin
      .from('kb_peptides')
      .select('id, slug')
      .in('id', derivedIds);
    for (const d of derived ?? []) {
      derivedSlugById.set(String(d.id), String(d.slug));
    }
  }

  const peptideIds = peptides.map((p) => String(p.id));
  const { data: links } = await admin
    .from('kb_peptide_evidence_links')
    .select('peptide_id, trial_id, publication_id, relevance')
    .in('peptide_id', peptideIds)
    .limit(200);

  const trialIds = [
    ...new Set(
      (links ?? [])
        .map((l) => l.trial_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const pubIds = [
    ...new Set(
      (links ?? [])
        .map((l) => l.publication_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const trialById = new Map<string, { brief_title: string; source_url: string }>();
  if (trialIds.length > 0) {
    const { data: trials } = await admin
      .from('kb_trials')
      .select('id, brief_title, source_url, dose_redaction_applied')
      .in('id', trialIds);
    for (const t of trials ?? []) {
      if (t.dose_redaction_applied !== true) continue;
      trialById.set(String(t.id), {
        brief_title: String(t.brief_title ?? 'Untitled trial'),
        source_url: String(t.source_url ?? ''),
      });
    }
  }

  const pubById = new Map<
    string,
    {
      title: string;
      source_url: string;
      source_tier: number | null;
      translation_method: string;
      translation_reviewed_by: string | null;
      author_network_id: string | null;
    }
  >();
  if (pubIds.length > 0) {
    const { data: pubs } = await admin
      .from('kb_publications')
      .select(
        'id, title, source_url, source_tier, translation_method, translation_reviewed_by, author_network_id, dose_redaction_applied',
      )
      .in('id', pubIds);
    for (const p of pubs ?? []) {
      if (p.dose_redaction_applied !== true) continue;
      if (
        !isConsumerRetrievablePublication({
          translationMethod: p.translation_method as
            | 'published_translation'
            | 'machine_translation'
            | 'human_translation'
            | 'none'
            | null,
          translationReviewedBy: p.translation_reviewed_by as string | null,
          sourceTier: p.source_tier == null ? null : Number(p.source_tier),
        })
      ) {
        continue;
      }
      pubById.set(String(p.id), {
        title: String(p.title ?? 'Untitled publication'),
        source_url: String(p.source_url ?? ''),
        source_tier: p.source_tier == null ? null : Number(p.source_tier),
        translation_method: String(p.translation_method ?? 'none'),
        translation_reviewed_by: p.translation_reviewed_by
          ? String(p.translation_reviewed_by)
          : null,
        author_network_id: p.author_network_id
          ? String(p.author_network_id)
          : null,
      });
    }
  }

  const pepById = new Map(peptides.map((p) => [String(p.id), p]));
  const records: EvidenceRecord[] = [];

  for (const link of links ?? []) {
    const pep = pepById.get(String(link.peptide_id));
    if (!pep) continue;
    const prep = (pep.preparation_class ??
      'not_applicable') as PreparationClass;
    const disclosure =
      String(pep.provenance_disclosure ?? '').trim() ||
      (prep !== 'not_applicable'
        ? BIOREGULATOR_PROVENANCE_DISCLOSURE_226H
        : '');

    if (link.trial_id && trialById.has(String(link.trial_id))) {
      const t = trialById.get(String(link.trial_id))!;
      records.push({
        recordId: String(link.trial_id),
        recordType: 'trial',
        title: t.brief_title,
        sourceUrl: t.source_url,
        peptideSlug: String(pep.slug),
        peptideDisplayName: String(pep.display_name ?? pep.slug),
        relevance: String(link.relevance ?? ''),
        sourceTier: 1,
        preparationClass: prep,
        provenanceDisclosure: disclosure,
        freshnessLabel,
      });
    }
    if (link.publication_id && pubById.has(String(link.publication_id))) {
      const p = pubById.get(String(link.publication_id))!;
      records.push({
        recordId: String(link.publication_id),
        recordType: 'publication',
        title: p.title,
        sourceUrl: p.source_url,
        peptideSlug: String(pep.slug),
        peptideDisplayName: String(pep.display_name ?? pep.slug),
        relevance: String(link.relevance ?? ''),
        sourceTier: p.source_tier,
        preparationClass: prep,
        provenanceDisclosure: disclosure,
        freshnessLabel,
      });
    }
    if (records.length >= limit) break;
  }

  const networkCounts = new Map<string, number>();
  for (const r of records) {
    if (r.recordType !== 'publication') continue;
    const pub = pubById.get(r.recordId);
    const net = pub?.author_network_id ?? 'unknown';
    networkCounts.set(net, (networkCounts.get(net) ?? 0) + 1);
  }
  const pubCount = records.filter((r) => r.recordType === 'publication').length;
  const distinctNets = [...networkCounts.keys()].filter((k) => k !== 'unknown')
    .length;
  const largest = Math.max(0, ...networkCounts.values(), 0);
  const provenanceSummary =
    pubCount > 0
      ? formatProvenanceCounts({
          publicationCount: pubCount,
          distinctAuthorNetworks: Math.max(1, distinctNets || 1),
          largestNetworkCount: largest || pubCount,
          independentReplicationCount:
            distinctNets > 1 ? Math.max(0, distinctNets - 1) : 0,
        })
      : null;

  return {
    query: q,
    peptides: peptides.map((p) => ({
      peptideId: String(p.id),
      slug: String(p.slug),
      displayName: String(p.display_name ?? p.slug),
      preparationClass: (p.preparation_class ??
        'not_applicable') as PreparationClass,
      provenanceDisclosure:
        String(p.provenance_disclosure ?? '').trim() ||
        ((p.preparation_class ?? 'not_applicable') !== 'not_applicable'
          ? BIOREGULATOR_PROVENANCE_DISCLOSURE_226H
          : ''),
      derivedFromSlug: p.derived_from_peptide_id
        ? derivedSlugById.get(String(p.derived_from_peptide_id)) ?? null
        : null,
      honesty:
        p.honesty_layer && typeof p.honesty_layer === 'object'
          ? (p.honesty_layer as Record<string, unknown>)
          : {},
    })),
    records: records.slice(0, limit),
    ingestStatus,
    provenanceSummary,
  };
}

/** Stable sorted record ids for cross-surface consistency proofs. */
export function evidenceRecordIds(bundle: PeptideEvidenceBundle): string[] {
  return [...new Set(bundle.records.map((r) => `${r.recordType}:${r.recordId}`))].sort();
}
