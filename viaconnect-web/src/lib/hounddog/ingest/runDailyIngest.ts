/**
 * Prompt 214b: Hound Dog daily multi-source ingest orchestrator.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { type FirecrawlBudget } from '@/lib/hounddog/firecrawl/client';
import { createDayAwareBudget } from '@/lib/hounddog/firecrawl/dayCap';
import { runPubMedTopicDiscovery } from './pubmed';
import { runSocialDiscovery } from './social';
import { watchIgsrRelease, panelAlleleFreqSeed } from './genomes';
import { processHoundDogGateQueue } from '@/lib/hounddog/contentGate';

export interface IngestRunStats {
  runId: string;
  runDate: string;
  pubmed: { discovered: number; staged: number; enriched: number };
  social: { staged: number; skippedDisallowed: number };
  genomes: { watched: boolean; isNew: boolean; releaseId: string | null; snps: number };
  gate: { approved: number; blocked: number; escalated: number };
  budget: FirecrawlBudget;
  hitBudget: boolean;
}

function mindateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, '/');
}

export async function runHoundDogDailyIngest(opts?: {
  runId?: string;
  runDate?: string;
  /** Default: Mondays only. Prompt 214c sets false; Elysium owns IGSR. */
  includeGenomes?: boolean;
  enrichFullText?: boolean;
}): Promise<IngestRunStats> {
  const runDate = opts?.runDate ?? new Date().toISOString().slice(0, 10);
  const runId = opts?.runId ?? `ingest-${runDate}`;
  const supabase = createAdminClient();
  // 219g: shared daily ceiling from firecrawl_run_ledger (not a fresh 200 each run)
  const budget = await createDayAwareBudget(supabase);

  const stats: IngestRunStats = {
    runId,
    runDate,
    pubmed: { discovered: 0, staged: 0, enriched: 0 },
    social: { staged: 0, skippedDisallowed: 0 },
    genomes: { watched: false, isNew: false, releaseId: null, snps: 0 },
    gate: { approved: 0, blocked: 0, escalated: 0 },
    budget,
    hitBudget: false,
  };

  // Load approved topics
  const { data: topics } = await supabase
    .from('ingest_topic_registry')
    .select('topic_key, query_text, source_classes')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .limit(20);

  const topicRows = Array.isArray(topics) ? topics : [];
  // 219M: default forward window if cursors unavailable (still bounded)
  const fallbackMindate = mindateDaysAgo(3);

  // Cursor helpers (fail-open if table missing)
  let loadCursor: typeof import('@/lib/jeffery/ops/discoveryCursors').loadDiscoveryCursor | null =
    null;
  let ensureCursor: typeof import('@/lib/jeffery/ops/discoveryCursors').ensureDiscoveryCursor | null =
    null;
  let advanceCursor: typeof import('@/lib/jeffery/ops/discoveryCursors').advanceDiscoveryCursor | null =
    null;
  let pubmedMindateFromCursor:
    | typeof import('@/lib/jeffery/ops/discoveryCursors').pubmedMindateFromCursor
    | null = null;
  let todayUtcDate: typeof import('@/lib/jeffery/ops/discoveryCursors').todayUtcDate | null =
    null;
  try {
    const cursors = await import('@/lib/jeffery/ops/discoveryCursors');
    loadCursor = cursors.loadDiscoveryCursor;
    ensureCursor = cursors.ensureDiscoveryCursor;
    advanceCursor = cursors.advanceDiscoveryCursor;
    pubmedMindateFromCursor = cursors.pubmedMindateFromCursor;
    todayUtcDate = cursors.todayUtcDate;
  } catch {
    /* open */
  }

  for (const t of topicRows) {
    if (budget.hitBudget) break;
    const row = t as {
      topic_key?: string;
      query_text?: string;
      source_classes?: string[];
    };
    const classes = row.source_classes ?? ['pubmed'];
    const topicKey = row.topic_key ?? 'topic';
    const query = row.query_text ?? topicKey;

    if (classes.includes('pubmed')) {
      if (ensureCursor) {
        await ensureCursor({
          sourceKey: 'pubmed',
          topicKey,
          seedDate: '2026-08-15',
        });
      }
      const cur = loadCursor ? await loadCursor('pubmed', topicKey) : null;
      const mindate =
        pubmedMindateFromCursor && cur
          ? pubmedMindateFromCursor(cur.cursor_date)
          : fallbackMindate;

      let pmStagedThisTopic = 0;
      let pmDiscoveredThisTopic = 0;
      let pmFailed = false;
      try {
        const pm = await runPubMedTopicDiscovery({
          topicKey,
          query,
          mindate,
          budget,
          enrichFullText: opts?.enrichFullText ?? true,
        });
        stats.pubmed.discovered += pm.discovered;
        pmDiscoveredThisTopic = pm.discovered;
        for (const rec of pm.staged) {
          const { error } = await supabase.from('hounddog_staging_items').upsert(
            {
              source_url: rec.sourceUrl,
              source_type: 'clinical_study',
              title: rec.title.slice(0, 500),
              summary: (rec.abstract || rec.fullTextExcerpt || '').slice(0, 4000),
              retrieved_at: new Date().toISOString(),
              raw_payload: {
                pmid: rec.pmid,
                pubDate: rec.pubDate,
                supersedes: rec.supersedesExternalId,
                mindate,
              },
              is_aggregate_only: true,
              robots_ok: true,
              gate_status: 'pending',
              content_hash: rec.contentHash,
              external_id: rec.externalId,
              topic_key: topicKey,
              relevance_score: 1,
              supersedes_external_id: rec.supersedesExternalId ?? null,
              full_text_excerpt: rec.fullTextExcerpt ?? null,
            },
            { onConflict: 'source_url' },
          );
          if (!error) {
            stats.pubmed.staged += 1;
            pmStagedThisTopic += 1;
            if (rec.fullTextExcerpt) stats.pubmed.enriched += 1;
          }
        }
      } catch (err) {
        pmFailed = true;
        safeLog.warn('ingest.pubmed', 'topic failed', {
          topicKey,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (advanceCursor) {
        const status = pmFailed
          ? 'failed'
          : pmStagedThisTopic > 0
            ? 'ok'
            : 'empty';
        await advanceCursor({
          sourceKey: 'pubmed',
          topicKey,
          status,
          newItems: pmStagedThisTopic,
          // Full success advances covered-through to today (forward only)
          cursorDate:
            status === 'ok' || status === 'empty'
              ? todayUtcDate
                ? todayUtcDate()
                : new Date().toISOString().slice(0, 10)
              : undefined,
          error: pmFailed ? 'pubmed_topic_failed' : null,
        });
      }
      void pmDiscoveredThisTopic;
    }

    if (classes.includes('social') && !budget.hitBudget) {
      if (ensureCursor) {
        await ensureCursor({
          sourceKey: 'firecrawl_social',
          topicKey,
          seedDate: '2026-08-15',
        });
      }
      let socialStaged = 0;
      let socialFailed = false;
      try {
        const soc = await runSocialDiscovery({ topicKey, query, budget });
        stats.social.skippedDisallowed += soc.skippedDisallowed;
        for (const item of soc.items) {
          const { error } = await supabase.from('hounddog_staging_items').upsert(
            {
              source_url: item.sourceUrl,
              source_type: 'social_aggregate',
              title: item.title,
              summary: item.summary,
              retrieved_at: new Date().toISOString(),
              raw_payload: { relevance: item.relevance },
              is_aggregate_only: true,
              robots_ok: true,
              gate_status: 'pending',
              content_hash: item.contentHash,
              external_id: item.externalId,
              topic_key: topicKey,
              relevance_score: item.relevance,
            },
            { onConflict: 'source_url' },
          );
          // Upsert: count only when row is new enough; conflict still ok for novelty metric
          // Prefer counting successful writes without error as processed; novelty uses hash dedupe at source.
          if (!error) {
            stats.social.staged += 1;
            socialStaged += 1;
          }
        }
      } catch (err) {
        socialFailed = true;
        safeLog.warn('ingest.social', 'topic failed', {
          topicKey,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      if (advanceCursor) {
        const status = socialFailed
          ? 'failed'
          : socialStaged > 0
            ? 'ok'
            : 'empty';
        await advanceCursor({
          sourceKey: 'firecrawl_social',
          topicKey,
          status,
          newItems: socialStaged,
          cursorTimestamp:
            status === 'ok' || status === 'empty'
              ? new Date().toISOString()
              : undefined,
          error: socialFailed ? 'social_topic_failed' : null,
        });
      }
    }
  }

  // Genomes weekly: default Mondays UTC. Explicit false disables (214c Elysium owns IGSR).
  const isMonday = new Date().getUTCDay() === 1;
  const includeGenomes = opts?.includeGenomes ?? isMonday;
  if (includeGenomes) {
    const { data: lastRel } = await supabase
      .from('genomics_reference_releases')
      .select('release_id')
      .order('ingested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastId = (lastRel as { release_id?: string } | null)?.release_id ?? null;
    const watch = await watchIgsrRelease(budget, lastId);
    stats.genomes.watched = watch.scraped;
    stats.genomes.releaseId = watch.releaseId;
    stats.genomes.isNew = watch.isNew;

    if (watch.releaseId && (watch.isNew || includeGenomes)) {
      await supabase.from('genomics_reference_releases').upsert(
        {
          release_id: watch.releaseId,
          announced_at: new Date().toISOString(),
          source_url: watch.sourceUrl,
          notes: watch.notes,
        },
        { onConflict: 'release_id' },
      );
      const seeds = panelAlleleFreqSeed(watch.releaseId);
      for (const s of seeds) {
        await supabase.from('genomics_panel_allele_freq').upsert(s, {
          onConflict: 'release_id,rsid,population',
        });
      }
      stats.genomes.snps = seeds.length;
    }
  }

  // Gate promotion
  stats.gate = await processHoundDogGateQueue(supabase, 40);
  stats.hitBudget = budget.hitBudget;
  stats.budget = budget;

  // Prompt 219H: platform events for continuous ops (fail-open)
  try {
    const { emitPlatformEvent } = await import('@/lib/jeffery/ops/eventBus');
    const staged =
      (stats.pubmed?.staged ?? 0) + (stats.social?.staged ?? 0);
    if (staged > 0) {
      await emitPlatformEvent({
        eventType: 'staging_landed',
        payload: { staged, runId },
        coalesceKey: 'staging_landed:global',
      });
    }
    if ((stats.gate?.approved ?? 0) > 0) {
      await emitPlatformEvent({
        eventType: 'content_gated',
        payload: { approved: stats.gate.approved, runId },
        coalesceKey: 'content_gated:global',
      });
    }
  } catch {
    /* fail-open */
  }

  // Ledger
  await supabase.from('firecrawl_run_ledger').insert({
    run_id: runId,
    run_date: runDate,
    source_class: 'multi',
    pages_used: budget.pagesUsed,
    credits_used: budget.creditsUsed,
    budget_pages: budget.maxPages,
    budget_credits: budget.maxCredits,
    hit_budget: budget.hitBudget,
    detail: {
      pubmed: stats.pubmed,
      social: stats.social,
      genomes: stats.genomes,
      gate: stats.gate,
    },
  });

  safeLog.info('hounddog.ingest', 'daily complete', {
    runId,
    pubmed: stats.pubmed,
    social: stats.social,
    genomes: stats.genomes,
    gate: stats.gate,
    hitBudget: budget.hitBudget,
  });

  return stats;
}
