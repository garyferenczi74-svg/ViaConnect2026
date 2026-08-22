/**
 * Prompt 227b: public curation transparency loader for Science & Authorities.
 * Service-role reads; API route still requires session. Public fields only.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export type ReviewQueueDepth = {
  total: number;
  byClass: Record<string, number>;
  /** Hours; null means UNKNOWN (no reviewed sample). */
  medianReviewHours: number | null;
  medianByClass: Record<string, number | null>;
};

export type RecentAdditionRow = {
  id: string;
  targetTable: string;
  targetField: string;
  changeClass: number;
  status: string;
  sourceTier: number | null;
  occurredAt: string;
  compoundSlug: string | null;
};

export type CorrectionPublicRow = {
  id: string;
  occurredAt: string;
  compoundSlug: string | null;
  publicSummary: string;
  direction: string;
};

export type NegativeResultPublicRow = {
  id: string;
  createdAt: string;
  gapType: string;
  sourcesSearched: string[];
  interpretation: string;
};

export type CyclePublicSummary = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  gapsClosed: number;
  proposalsRaised: Record<string, number>;
  negativeResultsCount: number;
  killSwitchHit: boolean;
};

export type GapCensusPublic = {
  computedAt: string | null;
  counts: Record<string, number> | null;
  hasCycle: boolean;
};

export type CurationTransparencyBundle = {
  reviewQueue: ReviewQueueDepth;
  recentAdditions: RecentAdditionRow[];
  corrections: CorrectionPublicRow[];
  negatives: NegativeResultPublicRow[];
  census: GapCensusPublic;
  lastCycle: CyclePublicSummary | null;
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function hoursBetween(start: string, end: string): number | null {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return (b - a) / (1000 * 60 * 60);
}

export async function loadCurationTransparency(): Promise<CurationTransparencyBundle> {
  const admin = createAdminClient();

  const empty: CurationTransparencyBundle = {
    reviewQueue: {
      total: 0,
      byClass: {},
      medianReviewHours: null,
      medianByClass: {},
    },
    recentAdditions: [],
    corrections: [],
    negatives: [],
    census: { computedAt: null, counts: null, hasCycle: false },
    lastCycle: null,
  };

  try {
    const [
      proposedRes,
      reviewedRes,
      additionsRes,
      correctionsRes,
      negativesRes,
      censusRes,
      cycleRes,
    ] = await Promise.all([
      admin
        .from('curation_proposals')
        .select('id, change_class, created_at')
        .eq('status', 'proposed')
        .limit(2000),
      admin
        .from('curation_proposals')
        .select('change_class, created_at, reviewed_at')
        .in('status', ['approved', 'rejected'])
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(500),
      admin
        .from('curation_proposals')
        .select(
          'id, target_table, target_field, target_row_id, change_class, status, source_tier, applied_at, created_at, direction',
        )
        .eq('direction', 'addition')
        .in('status', ['auto_applied', 'approved'])
        .order('created_at', { ascending: false })
        .limit(20),
      admin
        .from('curation_corrections')
        .select(
          'id, occurred_at, compound_slug, public_summary, direction, marshall_status',
        )
        .eq('marshall_status', 'approved')
        .not('public_summary', 'is', null)
        .order('occurred_at', { ascending: false })
        .limit(30),
      admin
        .from('curation_negative_results')
        .select(
          'id, created_at, gap_type, sources_searched, interpretation',
        )
        .order('created_at', { ascending: false })
        .limit(10),
      admin
        .from('curation_gap_census_snapshots')
        .select('computed_at, counts')
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('curation_cycles')
        .select(
          'id, started_at, ended_at, gaps_closed, proposals_raised, negative_results_count, kill_switch_hit, status',
        )
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const byClass: Record<string, number> = {};
    for (const row of proposedRes.data ?? []) {
      const k = String(row.change_class ?? '?');
      byClass[k] = (byClass[k] ?? 0) + 1;
    }

    const reviewedHours: number[] = [];
    const reviewedByClass: Record<string, number[]> = {};
    for (const row of reviewedRes.data ?? []) {
      if (!row.created_at || !row.reviewed_at) continue;
      const h = hoursBetween(String(row.created_at), String(row.reviewed_at));
      if (h === null) continue;
      reviewedHours.push(h);
      const k = String(row.change_class ?? '?');
      if (!reviewedByClass[k]) reviewedByClass[k] = [];
      reviewedByClass[k]!.push(h);
    }
    const medianByClass: Record<string, number | null> = {};
    for (const [k, arr] of Object.entries(reviewedByClass)) {
      medianByClass[k] = median(arr);
    }

    // Resolve peptide slugs for additions targeting kb_peptides
    const peptideIds = [
      ...new Set(
        (additionsRes.data ?? [])
          .filter(
            (r) =>
              r.target_table === 'kb_peptides' &&
              typeof r.target_row_id === 'string',
          )
          .map((r) => String(r.target_row_id)),
      ),
    ];
    const slugById = new Map<string, string>();
    if (peptideIds.length > 0) {
      const { data: peps } = await admin
        .from('kb_peptides')
        .select('id, slug')
        .in('id', peptideIds);
      for (const p of peps ?? []) {
        slugById.set(String(p.id), String(p.slug));
      }
    }

    const recentAdditions: RecentAdditionRow[] = (additionsRes.data ?? []).map(
      (r) => ({
        id: String(r.id),
        targetTable: String(r.target_table),
        targetField: String(r.target_field),
        changeClass: Number(r.change_class),
        status: String(r.status),
        sourceTier:
          r.source_tier === null || r.source_tier === undefined
            ? null
            : Number(r.source_tier),
        occurredAt: String(r.applied_at ?? r.created_at),
        compoundSlug:
          r.target_table === 'kb_peptides' && r.target_row_id
            ? slugById.get(String(r.target_row_id)) ?? null
            : null,
      }),
    );

    const corrections: CorrectionPublicRow[] = (correctionsRes.data ?? [])
      .filter((r) => String(r.public_summary ?? '').trim().length > 0)
      .map((r) => ({
        id: String(r.id),
        occurredAt: String(r.occurred_at),
        compoundSlug: r.compound_slug ? String(r.compound_slug) : null,
        publicSummary: String(r.public_summary).slice(0, 500),
        direction: String(r.direction),
      }));

    const negatives: NegativeResultPublicRow[] = (negativesRes.data ?? []).map(
      (r) => ({
        id: String(r.id),
        createdAt: String(r.created_at),
        gapType: String(r.gap_type),
        sourcesSearched: Array.isArray(r.sources_searched)
          ? (r.sources_searched as string[]).map(String)
          : [],
        interpretation: String(r.interpretation ?? '').slice(0, 280),
      }),
    );

    const censusCounts =
      censusRes.data?.counts && typeof censusRes.data.counts === 'object'
        ? (censusRes.data.counts as Record<string, number>)
        : null;

    const cycle = cycleRes.data;
    const lastCycle: CyclePublicSummary | null = cycle
      ? {
          id: String(cycle.id),
          startedAt: String(cycle.started_at),
          endedAt: cycle.ended_at ? String(cycle.ended_at) : null,
          gapsClosed: Number(cycle.gaps_closed ?? 0),
          proposalsRaised:
            cycle.proposals_raised &&
            typeof cycle.proposals_raised === 'object'
              ? (cycle.proposals_raised as Record<string, number>)
              : {},
          negativeResultsCount: Number(cycle.negative_results_count ?? 0),
          killSwitchHit: cycle.kill_switch_hit === true,
        }
      : null;

    return {
      reviewQueue: {
        total: (proposedRes.data ?? []).length,
        byClass,
        medianReviewHours: median(reviewedHours),
        medianByClass,
      },
      recentAdditions,
      corrections,
      negatives,
      census: {
        computedAt: censusRes.data?.computed_at
          ? String(censusRes.data.computed_at)
          : null,
        counts: censusCounts,
        hasCycle: Boolean(lastCycle),
      },
      lastCycle,
    };
  } catch (err) {
    safeLog.warn('kb.curationTransparency227b', 'load failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }
}
