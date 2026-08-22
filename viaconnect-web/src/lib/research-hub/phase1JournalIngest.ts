/**
 * Prompt 227a Phase 1: prove one Tier 2 PubMed journal updates Research Hub.
 * Default journal: Aging Cell via E-utilities. Cursor-batched so two runs
 * can each yield new items without duplicates.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  pubmedEfetchAbstracts,
  pubmedEsearch,
  pubmedEsummary,
} from '@/lib/hounddog/ingest/pubmed';
import { redactDoseInstructionText } from '@/lib/thanos/doseRedaction';
import { safeLog } from '@/lib/utils/safe-log';

export const PHASE1_JOURNAL = {
  sourceName: 'Aging Cell',
  journalTerm: '"Aging Cell"[Journal]',
  categorySlug: 'publications',
  cursorSourceKey: 'research_hub',
  cursorTopicKey: 'aging-cell',
  fallback: {
    sourceName: 'American Journal of Clinical Nutrition',
    journalTerm: '"American Journal of Clinical Nutrition"[Journal]',
    cursorTopicKey: 'ajcn',
  },
} as const;

const DEFAULT_MINDATE = '2026/06/01';
const DEFAULT_BATCH = 3;

function sanitizeText(input: string): string {
  const red = redactDoseInstructionText(input);
  return red.text.replace(/[\u2013\u2014]/g, '-').trim();
}

function parsePubDate(pubDate?: string): string | null {
  if (!pubDate) return null;
  // Forms: "2026 Sep", "2026 Sep 12", "2026"
  const m = pubDate.match(/^(\d{4})(?:\s+([A-Za-z]{3}))?(?:\s+(\d{1,2}))?/);
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  };
  const y = m[1];
  const mo = m[2] ? months[m[2]] || '01' : '01';
  const d = m[3] ? String(m[3]).padStart(2, '0') : '01';
  return `${y}-${mo}-${d}T12:00:00.000Z`;
}

export type Phase1IngestResult = {
  ok: boolean;
  journal: string;
  runId: string;
  discovered: number;
  inserted: number;
  skippedDuplicate: number;
  pmidsInserted: string[];
  cursorBefore: string | null;
  cursorAfter: string | null;
  seenPmidCount: number;
  categoryId: string | null;
  error?: string;
  usedFallback: boolean;
};

type CursorConfig = {
  seen_pmids?: string[];
  journal?: string;
  mindate?: string;
};

async function loadCursor(
  admin: ReturnType<typeof createAdminClient>,
  topicKey: string,
): Promise<{ mindate: string; seen: Set<string>; raw: CursorConfig }> {
  const { data } = await admin
    .from('discovery_cursors')
    .select('cursor_date, config, last_run_at')
    .eq('source_key', PHASE1_JOURNAL.cursorSourceKey)
    .eq('topic_key', topicKey)
    .maybeSingle();

  const config = (data?.config ?? {}) as CursorConfig;
  const seen = new Set<string>(
    Array.isArray(config.seen_pmids)
      ? config.seen_pmids.map(String).filter(Boolean)
      : [],
  );
  const mindate =
    (typeof config.mindate === 'string' && config.mindate) ||
    (typeof data?.cursor_date === 'string' && data.cursor_date
      ? String(data.cursor_date).replace(/-/g, '/').slice(0, 10)
      : DEFAULT_MINDATE);
  return { mindate: mindate.includes('/') ? mindate : mindate.replace(/-/g, '/'), seen, raw: config };
}

async function saveCursor(
  admin: ReturnType<typeof createAdminClient>,
  topicKey: string,
  opts: {
    mindate: string;
    seen: Set<string>;
    status: string;
    newItems: number;
    journal: string;
  },
): Promise<void> {
  const seenList = [...opts.seen].slice(-500);
  const cursorDate = opts.mindate.includes('/')
    ? opts.mindate.replace(/\//g, '-')
    : opts.mindate;
  await admin.from('discovery_cursors').upsert(
    {
      source_key: PHASE1_JOURNAL.cursorSourceKey,
      topic_key: topicKey,
      cursor_date: cursorDate.slice(0, 10),
      last_run_at: new Date().toISOString(),
      last_run_status: opts.status,
      last_new_items: opts.newItems,
      config: {
        seen_pmids: seenList,
        journal: opts.journal,
        mindate: opts.mindate,
        phase: '227a-phase1',
      },
    },
    { onConflict: 'source_key,topic_key' },
  );
}

async function resolveCategoryId(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  const { data } = await admin
    .from('research_hub_categories')
    .select('id')
    .eq('slug', PHASE1_JOURNAL.categorySlug)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function ingestOneJournal(opts: {
  sourceName: string;
  journalTerm: string;
  topicKey: string;
  batchSize: number;
  mindateOverride?: string;
}): Promise<Phase1IngestResult> {
  const runId = `ops-research-hub-phase1-${opts.topicKey}-${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  const admin = createAdminClient();
  const runDate = startedAt.slice(0, 10);

  const base: Phase1IngestResult = {
    ok: false,
    journal: opts.sourceName,
    runId,
    discovered: 0,
    inserted: 0,
    skippedDuplicate: 0,
    pmidsInserted: [],
    cursorBefore: null,
    cursorAfter: null,
    seenPmidCount: 0,
    categoryId: null,
    usedFallback: opts.topicKey !== PHASE1_JOURNAL.cursorTopicKey,
  };

  try {
    const categoryId = await resolveCategoryId(admin);
    if (!categoryId) {
      base.error = 'publications_category_missing';
      await admin.from('pipeline_runs').upsert(
        {
          run_id: runId,
          run_date: runDate,
          status: 'error',
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          stages: { phase: '227a-phase1', error: base.error },
        },
        { onConflict: 'run_id' },
      );
      return base;
    }
    base.categoryId = categoryId;

    const cursor = await loadCursor(admin, opts.topicKey);
    const mindate = opts.mindateOverride || cursor.mindate || DEFAULT_MINDATE;
    base.cursorBefore = mindate;
    base.seenPmidCount = cursor.seen.size;

    const ids = await pubmedEsearch(opts.journalTerm, mindate, 40);
    base.discovered = ids.length;

    const unseen = ids.filter((id) => !cursor.seen.has(id));
    const batch = unseen.slice(0, opts.batchSize);

    if (batch.length === 0) {
      await saveCursor(admin, opts.topicKey, {
        mindate,
        seen: cursor.seen,
        status: 'empty',
        newItems: 0,
        journal: opts.sourceName,
      });
      base.cursorAfter = mindate;
      base.ok = true;
      await admin.from('pipeline_runs').upsert(
        {
          run_id: runId,
          run_date: runDate,
          status: 'empty',
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          stages: {
            phase: '227a-phase1',
            journal: opts.sourceName,
            discovered: ids.length,
            inserted: 0,
            unseen: unseen.length,
          },
        },
        { onConflict: 'run_id' },
      );
      return base;
    }

    const summaries = await pubmedEsummary(batch);
    const abstracts = await pubmedEfetchAbstracts(batch);

    for (const row of summaries) {
      const title = sanitizeText(row.title || `PMID ${row.pmid}`);
      const abs = abstracts.get(row.pmid) || '';
      const summary = sanitizeText(abs).slice(0, 500);
      const publishedAt = parsePubDate(row.pubDate);
      const url = `https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/`;

      const tagSlug =
        opts.topicKey === 'ajcn' ? 'ajcn' : 'aging-cell';

      const { error } = await admin.from('research_hub_items').insert({
        category_id: categoryId,
        source_name: opts.sourceName,
        title,
        summary: summary || null,
        original_url: url,
        author: null,
        published_at: publishedAt,
        tags: [tagSlug, 'pubmed', 'tier-2', 'phase1-227a'],
        raw_metadata: {
          pmid: row.pmid,
          journal: opts.sourceName,
          transport: 'eutils',
          source_tier: 2,
          lane: 'evidence',
          prompt: '227a-phase1',
          pubDate: row.pubDate ?? null,
          dose_redaction_applied: true,
        },
      });

      if (error) {
        // Unique (source_name, title) collision
        if (String(error.message || '').toLowerCase().includes('duplicate') || error.code === '23505') {
          base.skippedDuplicate += 1;
          cursor.seen.add(row.pmid);
          continue;
        }
        safeLog.warn('research-hub.phase1', 'insert failed', {
          pmid: row.pmid,
          error: error.message,
        });
        continue;
      }

      cursor.seen.add(row.pmid);
      base.inserted += 1;
      base.pmidsInserted.push(row.pmid);
    }

    // Advance mindate conservatively to today (edat window); seen_pmids carries pagination.
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    base.cursorAfter = today;
    await saveCursor(admin, opts.topicKey, {
      mindate: today,
      seen: cursor.seen,
      status: base.inserted > 0 ? 'ok' : 'empty',
      newItems: base.inserted,
      journal: opts.sourceName,
    });

    base.seenPmidCount = cursor.seen.size;
    base.ok = base.inserted > 0;

    await admin.from('pipeline_runs').upsert(
      {
        run_id: runId,
        run_date: runDate,
        status: base.inserted > 0 ? 'ok' : 'empty',
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        stages: {
          phase: '227a-phase1',
          journal: opts.sourceName,
          discovered: base.discovered,
          inserted: base.inserted,
          skippedDuplicate: base.skippedDuplicate,
          pmidsInserted: base.pmidsInserted,
          cursorBefore: base.cursorBefore,
          cursorAfter: base.cursorAfter,
        },
      },
      { onConflict: 'run_id' },
    );

    return base;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    base.error = message;
    safeLog.error('research-hub.phase1', 'threw', { error: message });
    try {
      await createAdminClient().from('pipeline_runs').upsert(
        {
          run_id: runId,
          run_date: runDate,
          status: 'error',
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          stages: { phase: '227a-phase1', error: message },
        },
        { onConflict: 'run_id' },
      );
    } catch {
      /* open */
    }
    return base;
  }
}

/**
 * Run Phase 1 batch. Prefers Aging Cell; if zero inserts and fallback enabled,
 * tries AJCN once in the same invocation (still one mechanism proof).
 */
export async function runPhase1ResearchHubIngest(options?: {
  batchSize?: number;
  allowFallback?: boolean;
  mindateOverride?: string;
}): Promise<Phase1IngestResult> {
  const batchSize = options?.batchSize ?? DEFAULT_BATCH;
  const primary = await ingestOneJournal({
    sourceName: PHASE1_JOURNAL.sourceName,
    journalTerm: PHASE1_JOURNAL.journalTerm,
    topicKey: PHASE1_JOURNAL.cursorTopicKey,
    batchSize,
    mindateOverride: options?.mindateOverride,
  });

  if (primary.inserted > 0 || options?.allowFallback === false) {
    return primary;
  }

  // Fallback only when Aging Cell yielded nothing new
  if (options?.allowFallback !== false && primary.inserted === 0) {
    const fb = await ingestOneJournal({
      sourceName: PHASE1_JOURNAL.fallback.sourceName,
      journalTerm: PHASE1_JOURNAL.fallback.journalTerm,
      topicKey: PHASE1_JOURNAL.fallback.cursorTopicKey,
      batchSize,
      mindateOverride: options?.mindateOverride,
    });
    return { ...fb, usedFallback: true };
  }

  return primary;
}
