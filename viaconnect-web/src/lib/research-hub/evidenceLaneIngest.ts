/**
 * Prompt 227a: evidence-lane Research Hub ingest.
 * Reads live eutils/rss sources from authorities_sources (lane=evidence).
 * Mercola and excluded lanes are never queried.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  pubmedEfetchAbstracts,
  pubmedEsearch,
  pubmedEsummary,
} from '@/lib/hounddog/ingest/pubmed';
import { redactDoseInstructionText } from '@/lib/thanos/doseRedaction';
import { safeLog } from '@/lib/utils/safe-log';
import { PHASE1_JOURNAL } from '@/lib/research-hub/phase1JournalIngest';

const DEFAULT_MINDATE = '2026/06/01';
const DEFAULT_EUTILS_BATCH = 2;
const MAX_SOURCES_PER_RUN = 20;

function isPlausibleArticleUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (!u.startsWith('http')) return false;
  if (u.includes('tap-en-') || u.includes('/settings') || u.includes('/ads')) {
    return false;
  }
  if (u.includes('login') || u.includes('signup') || u.includes('cookie')) {
    return false;
  }
  return true;
}

function sanitizeText(input: string): string {
  const red = redactDoseInstructionText(input);
  return red.text.replace(/[\u2013\u2014]/g, '-').trim();
}

function parsePubDate(pubDate?: string): string | null {
  if (!pubDate) return null;
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

type RegistrySource = {
  domain: string;
  label: string;
  source_tier: number | null;
  transport: string | null;
  journal_filter: string | null;
  feed_url: string | null;
  cursor_topic_key: string | null;
  provenance_cap: string | null;
  registry_status: string | null;
};

type CursorConfig = {
  seen_pmids?: string[];
  seen_urls?: string[];
  journal?: string;
  mindate?: string;
};

export type EvidenceSourceResult = {
  domain: string;
  label: string;
  transport: string;
  discovered: number;
  inserted: number;
  skippedDuplicate: number;
  ids: string[];
  error?: string;
};

export type EvidenceLaneRunResult = {
  ok: boolean;
  runId: string;
  sourcesAttempted: number;
  sourcesOk: number;
  totalInserted: number;
  bySource: EvidenceSourceResult[];
  error?: string;
};

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

async function loadCursor(
  admin: ReturnType<typeof createAdminClient>,
  topicKey: string,
): Promise<{ mindate: string; seenPmids: Set<string>; seenUrls: Set<string> }> {
  const { data } = await admin
    .from('discovery_cursors')
    .select('cursor_date, config')
    .eq('source_key', 'research_hub')
    .eq('topic_key', topicKey)
    .maybeSingle();
  const config = (data?.config ?? {}) as CursorConfig;
  const seenPmids = new Set(
    Array.isArray(config.seen_pmids) ? config.seen_pmids.map(String) : [],
  );
  const seenUrls = new Set(
    Array.isArray(config.seen_urls) ? config.seen_urls.map(String) : [],
  );
  const mindate =
    (typeof config.mindate === 'string' && config.mindate) || DEFAULT_MINDATE;
  return {
    mindate: mindate.includes('/') ? mindate : mindate.replace(/-/g, '/'),
    seenPmids,
    seenUrls,
  };
}

async function saveCursor(
  admin: ReturnType<typeof createAdminClient>,
  topicKey: string,
  opts: {
    mindate: string;
    seenPmids: Set<string>;
    seenUrls: Set<string>;
    status: string;
    newItems: number;
    label: string;
  },
): Promise<void> {
  const cursorDate = opts.mindate.includes('/')
    ? opts.mindate.replace(/\//g, '-')
    : opts.mindate;
  await admin.from('discovery_cursors').upsert(
    {
      source_key: 'research_hub',
      topic_key: topicKey,
      cursor_date: cursorDate.slice(0, 10),
      last_run_at: new Date().toISOString(),
      last_run_status: opts.status,
      last_new_items: opts.newItems,
      config: {
        seen_pmids: [...opts.seenPmids].slice(-500),
        seen_urls: [...opts.seenUrls].slice(-500),
        journal: opts.label,
        mindate: opts.mindate,
        phase: '227a-evidence-lane',
      },
    },
    { onConflict: 'source_key,topic_key' },
  );
}

async function ingestEutilsSource(opts: {
  admin: ReturnType<typeof createAdminClient>;
  categoryId: string;
  source: RegistrySource;
  batchSize: number;
}): Promise<EvidenceSourceResult> {
  const topicKey =
    opts.source.cursor_topic_key ||
    opts.source.domain.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const journalFilter = opts.source.journal_filter;
  const out: EvidenceSourceResult = {
    domain: opts.source.domain,
    label: opts.source.label,
    transport: 'eutils',
    discovered: 0,
    inserted: 0,
    skippedDuplicate: 0,
    ids: [],
  };
  if (!journalFilter) {
    out.error = 'missing_journal_filter';
    return out;
  }

  const cursor = await loadCursor(opts.admin, topicKey);
  const ids = await pubmedEsearch(journalFilter, cursor.mindate, 30);
  out.discovered = ids.length;
  const batch = ids.filter((id) => !cursor.seenPmids.has(id)).slice(0, opts.batchSize);
  if (batch.length === 0) {
    await saveCursor(opts.admin, topicKey, {
      mindate: cursor.mindate,
      seenPmids: cursor.seenPmids,
      seenUrls: cursor.seenUrls,
      status: 'empty',
      newItems: 0,
      label: opts.source.label,
    });
    return out;
  }

  const summaries = await pubmedEsummary(batch);
  const abstracts = await pubmedEfetchAbstracts(batch);
  for (const row of summaries) {
    const title = sanitizeText(row.title || `PMID ${row.pmid}`);
    const summary = sanitizeText(abstracts.get(row.pmid) || '').slice(0, 500);
    const url = `https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/`;
    const { error } = await opts.admin.from('research_hub_items').insert({
      category_id: opts.categoryId,
      source_name: opts.source.label,
      title,
      summary: summary || null,
      original_url: url,
      author: null,
      published_at: parsePubDate(row.pubDate),
      tags: [
        topicKey,
        'pubmed',
        `tier-${opts.source.source_tier ?? 2}`,
        'evidence-lane',
        '227a',
      ],
      raw_metadata: {
        pmid: row.pmid,
        journal: opts.source.label,
        transport: 'eutils',
        source_tier: opts.source.source_tier ?? 2,
        lane: 'evidence',
        prompt: '227a-evidence-lane',
        domain: opts.source.domain,
        provenance_cap: opts.source.provenance_cap,
        pubDate: row.pubDate ?? null,
        dose_redaction_applied: true,
      },
    });
    if (error) {
      if (
        error.code === '23505' ||
        String(error.message || '')
          .toLowerCase()
          .includes('duplicate')
      ) {
        out.skippedDuplicate += 1;
        cursor.seenPmids.add(row.pmid);
        continue;
      }
      safeLog.warn('research-hub.evidence', 'insert failed', {
        pmid: row.pmid,
        error: error.message,
      });
      continue;
    }
    cursor.seenPmids.add(row.pmid);
    out.inserted += 1;
    out.ids.push(row.pmid);
  }

  await saveCursor(opts.admin, topicKey, {
    mindate: cursor.mindate,
    seenPmids: cursor.seenPmids,
    seenUrls: cursor.seenUrls,
    status: out.inserted > 0 ? 'ok' : 'empty',
    newItems: out.inserted,
    label: opts.source.label,
  });
  return out;
}

function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
}> {
  const items: Array<{
    title: string;
    link: string;
    summary: string;
    publishedAt: string | null;
  }> = [];
  const chunks = xml.split(/<item[\s>]/i);
  for (const chunk of chunks.slice(1)) {
    const title =
      chunk.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ||
      chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      '';
    const link =
      chunk.match(/<link[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i)?.[1] ||
      chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
      chunk.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] ||
      '';
    const summary =
      chunk.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] ||
      chunk.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ||
      '';
    const pub =
      chunk.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ||
      chunk.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1] ||
      null;
    const cleanTitle = sanitizeText(title.replace(/<[^>]+>/g, ' '));
    const cleanLink = link.replace(/<[^>]+>/g, '').trim();
    if (!cleanTitle || !cleanLink) continue;
    let publishedAt: string | null = null;
    if (pub) {
      const d = new Date(pub.replace(/<[^>]+>/g, '').trim());
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    items.push({
      title: cleanTitle,
      link: cleanLink,
      summary: sanitizeText(summary.replace(/<[^>]+>/g, ' ')).slice(0, 500),
      publishedAt,
    });
  }
  return items;
}

async function ingestRssSource(opts: {
  admin: ReturnType<typeof createAdminClient>;
  categoryId: string;
  source: RegistrySource;
  batchSize: number;
}): Promise<EvidenceSourceResult> {
  const topicKey =
    opts.source.cursor_topic_key ||
    opts.source.domain.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const out: EvidenceSourceResult = {
    domain: opts.source.domain,
    label: opts.source.label,
    transport: 'rss',
    discovered: 0,
    inserted: 0,
    skippedDuplicate: 0,
    ids: [],
  };
  if (!opts.source.feed_url) {
    out.error = 'missing_feed_url';
    return out;
  }

  const cursor = await loadCursor(opts.admin, topicKey);
  let xml = '';
  try {
    const res = await fetch(opts.source.feed_url, {
      headers: { 'User-Agent': 'ViaConnectResearchHub/227a' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      out.error = `rss_http_${res.status}`;
      return out;
    }
    xml = await res.text();
  } catch (err) {
    out.error = err instanceof Error ? err.message : String(err);
    return out;
  }

  const items = parseRssItems(xml);
  out.discovered = items.length;
  const batch = items
    .filter((it) => isPlausibleArticleUrl(it.link) && !cursor.seenUrls.has(it.link))
    .slice(0, opts.batchSize);

  if (batch.length === 0) {
    await saveCursor(opts.admin, topicKey, {
      mindate: cursor.mindate,
      seenPmids: cursor.seenPmids,
      seenUrls: cursor.seenUrls,
      status: 'empty',
      newItems: 0,
      label: opts.source.label,
    });
    return out;
  }

  for (const item of batch) {
    const { error } = await opts.admin.from('research_hub_items').insert({
      category_id: opts.categoryId,
      source_name: opts.source.label,
      title: item.title,
      summary: item.summary || null,
      original_url: item.link,
      author: null,
      published_at: item.publishedAt,
      tags: [
        topicKey,
        'rss',
        `tier-${opts.source.source_tier ?? 3}`,
        'evidence-lane',
        '227a',
        'discovery-signal',
      ],
      raw_metadata: {
        transport: 'rss',
        source_tier: opts.source.source_tier ?? 3,
        lane: 'evidence',
        prompt: '227a-evidence-lane',
        domain: opts.source.domain,
        provenance_cap: opts.source.provenance_cap,
        dose_redaction_applied: true,
        note: 'RSS entry is a discovery signal; not the publication record.',
      },
    });
    if (error) {
      if (
        error.code === '23505' ||
        String(error.message || '')
          .toLowerCase()
          .includes('duplicate')
      ) {
        out.skippedDuplicate += 1;
        cursor.seenUrls.add(item.link);
        continue;
      }
      safeLog.warn('research-hub.evidence-rss', 'insert failed', {
        link: item.link,
        error: error.message,
      });
      continue;
    }
    cursor.seenUrls.add(item.link);
    out.inserted += 1;
    out.ids.push(item.link);
  }

  await saveCursor(opts.admin, topicKey, {
    mindate: cursor.mindate,
    seenPmids: cursor.seenPmids,
    seenUrls: cursor.seenUrls,
    status: out.inserted > 0 ? 'ok' : 'empty',
    newItems: out.inserted,
    label: opts.source.label,
  });
  return out;
}

export async function runEvidenceLaneIngest(options?: {
  batchSize?: number;
  maxSources?: number;
}): Promise<EvidenceLaneRunResult> {
  const runId = `ops-research-hub-evidence-${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  const runDate = startedAt.slice(0, 10);
  const admin = createAdminClient();
  const batchSize = options?.batchSize ?? DEFAULT_EUTILS_BATCH;
  const maxSources = options?.maxSources ?? MAX_SOURCES_PER_RUN;

  const result: EvidenceLaneRunResult = {
    ok: false,
    runId,
    sourcesAttempted: 0,
    sourcesOk: 0,
    totalInserted: 0,
    bySource: [],
  };

  try {
    const categoryId = await resolveCategoryId(admin);
    if (!categoryId) {
      result.error = 'publications_category_missing';
      await admin.from('pipeline_runs').upsert(
        {
          run_id: runId,
          run_date: runDate,
          status: 'error',
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          stages: { phase: '227a-evidence-lane', error: result.error },
        },
        { onConflict: 'run_id' },
      );
      return result;
    }

    const { data: sources, error: srcErr } = await admin
      .from('authorities_sources')
      .select(
        'domain,label,source_tier,transport,journal_filter,feed_url,cursor_topic_key,provenance_cap,registry_status',
      )
      .eq('lane', 'evidence')
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .eq('registry_status', 'live')
      .in('transport', ['eutils', 'rss'])
      .not('domain', 'ilike', '%mercola%')
      .order('source_tier', { ascending: true })
      .limit(80);

    if (srcErr) {
      result.error = srcErr.message;
      return result;
    }

    const list = ((sources ?? []) as RegistrySource[]).filter((s) => {
      if (s.transport === 'eutils') {
        return Boolean(s.journal_filter && s.domain.startsWith('journal.'));
      }
      if (s.transport === 'rss') {
        return Boolean(s.feed_url);
      }
      return false;
    });
    // Prefer journal.* eutils first, then rss
    const ordered = [
      ...list.filter((s) => s.transport === 'eutils'),
      ...list.filter((s) => s.transport === 'rss'),
    ].slice(0, maxSources);

    for (const source of ordered) {
      result.sourcesAttempted += 1;
      let one: EvidenceSourceResult;
      if (source.transport === 'eutils') {
        one = await ingestEutilsSource({ admin, categoryId, source, batchSize });
      } else {
        one = await ingestRssSource({ admin, categoryId, source, batchSize });
      }
      result.bySource.push(one);
      result.totalInserted += one.inserted;
      if (!one.error && (one.inserted > 0 || one.discovered >= 0)) {
        result.sourcesOk += 1;
      }
      // Touch last_successful_run when yield > 0
      if (one.inserted > 0) {
        await admin
          .from('authorities_sources')
          .update({ last_successful_run: new Date().toISOString() })
          .eq('domain', source.domain);
      }
    }

    result.ok = result.totalInserted > 0 || result.sourcesOk > 0;
    await admin.from('pipeline_runs').upsert(
      {
        run_id: runId,
        run_date: runDate,
        status: result.totalInserted > 0 ? 'ok' : 'empty',
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        stages: {
          phase: '227a-evidence-lane',
          sourcesAttempted: result.sourcesAttempted,
          sourcesOk: result.sourcesOk,
          totalInserted: result.totalInserted,
          bySource: result.bySource,
        },
      },
      { onConflict: 'run_id' },
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.error = message;
    safeLog.error('research-hub.evidence-lane', 'threw', { error: message });
    try {
      await admin.from('pipeline_runs').upsert(
        {
          run_id: runId,
          run_date: runDate,
          status: 'error',
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          stages: { phase: '227a-evidence-lane', error: message },
        },
        { onConflict: 'run_id' },
      );
    } catch {
      /* open */
    }
    return result;
  }
}
