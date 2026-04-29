// =============================================================================
// ultrathink-pubmed-ingest (Prompt #60 — Layer 2, Source #1)
// =============================================================================
// Calls PubMed E-utils (esearch + esummary) for supplement/peptide-related
// articles published in the last N days, dedupes against ultrathink_research_feed
// by pmid, inserts new ones, logs the run via ultrathink_record_sync.
//
// Free public API. NCBI rate limits to 3 req/sec without an API key.
// Add NCBI_API_KEY env var to bump that to 10 req/sec.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const pubmedBreaker = getCircuitBreaker('pubmed-api');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NCBI_KEY     = Deno.env.get('NCBI_API_KEY') ?? '';

// Default search: supplement/peptide therapy articles in the last 7 days
const DEFAULT_QUERY = '(supplement therapy OR peptide therapy OR functional medicine OR nutraceutical) AND (clinical trial[pt] OR meta-analysis[pt] OR systematic review[pt])';

interface EsearchResp { esearchresult?: { idlist?: string[]; count?: string } }
interface EsummaryResp { result?: Record<string, EsummaryArticle> }
interface EsummaryArticle {
  uid: string;
  title?: string;
  authors?: Array<{ name: string }>;
  pubdate?: string;
  source?: string;
  fulljournalname?: string;
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function esearch(query: string, days: number, retmax: number): Promise<string[]> {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: `${query} AND last ${days} days[edat]`,
    retmode: 'json',
    retmax: String(retmax),
    sort: 'pub+date',
  });
  if (NCBI_KEY) params.set('api_key', NCBI_KEY);
  const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params}`);
  if (!r.ok) throw new Error(`esearch HTTP ${r.status}`);
  const j = (await r.json()) as EsearchResp;
  return j.esearchresult?.idlist ?? [];
}

async function esummary(pmids: string[]): Promise<Record<string, EsummaryArticle>> {
  if (pmids.length === 0) return {};
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  });
  if (NCBI_KEY) params.set('api_key', NCBI_KEY);
  const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${params}`);
  if (!r.ok) throw new Error(`esummary HTTP ${r.status}`);
  const j = (await r.json()) as EsummaryResp;
  return j.result ?? {};
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  let body: { query?: string; days?: number; retmax?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const query = body.query ?? DEFAULT_QUERY;
  const days = body.days ?? 7;
  const retmax = Math.min(body.retmax ?? 50, 200);

  let added = 0, skipped = 0, errors = 0;
  let pmids: string[] = [];

  try {
    pmids = await esearch(query, days, retmax);
    if (pmids.length === 0) {
      await db.rpc('ultrathink_record_sync', {
        p_run_id: runId, p_source: 'pubmed', p_action: 'esearch_empty',
        p_in: 0, p_added: 0, p_skipped: 0, p_error: 0,
        p_cost: 0, p_duration: Date.now() - t0,
        p_status: 'ok', p_err_msg: null, p_metadata: { query, days, retmax },
      });
      return json({ ok: true, run_id: runId, fetched: 0, added: 0 });
    }

    // Filter out already-known pmids in one batch query
    const { data: existing } = await db
      .from('ultrathink_research_feed')
      .select('external_id')
      .eq('source', 'pubmed')
      .in('external_id', pmids);
    const known = new Set((existing ?? []).map(r => r.external_id));
    const fresh = pmids.filter(p => !known.has(p));
    skipped = pmids.length - fresh.length;

    if (fresh.length === 0) {
      await db.rpc('ultrathink_record_sync', {
        p_run_id: runId, p_source: 'pubmed', p_action: 'all_known',
        p_in: pmids.length, p_added: 0, p_skipped: skipped, p_error: 0,
        p_cost: 0, p_duration: Date.now() - t0,
        p_status: 'ok', p_err_msg: null, p_metadata: { query, days },
      });
      return json({ ok: true, run_id: runId, fetched: pmids.length, added: 0, skipped });
    }

    // Fetch summaries for fresh pmids
    const summaries = await esummary(fresh);

    // Build rows for insert
    const rows = fresh.map(pmid => {
      const a = summaries[pmid];
      return {
        source: 'pubmed' as const,
        external_id: pmid,
        title: a?.title ?? `[no title] ${pmid}`,
        abstract: null,                          // esummary doesn't return abstracts; fetch via efetch in Phase 2
        authors: (a?.authors ?? []).map(au => au.name),
        published_at: a?.pubdate ? toIsoDate(a.pubdate) : null,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        raw_payload: a as unknown as Record<string, unknown>,
        status: 'pending' as const,
      };
    });

    const { error: insertErr } = await db.from('ultrathink_research_feed').insert(rows);
    if (insertErr) {
      errors = rows.length;
      throw new Error(`insert: ${insertErr.message}`);
    }
    added = rows.length;

    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'pubmed', p_action: 'ingest_success',
      p_in: pmids.length, p_added: added, p_skipped: skipped, p_error: errors,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'ok', p_err_msg: null,
      p_metadata: { query, days, retmax },
    });

    return json({ ok: true, run_id: runId, fetched: pmids.length, added, skipped });
  } catch (e) {
    const msg = (e as Error).message;
    if (isCircuitBreakerError(e)) safeLog.warn('ultrathink.pubmed-ingest', 'pubmed circuit open', { runId, error: e });
    else if (isTimeoutError(e)) safeLog.warn('ultrathink.pubmed-ingest', 'pubmed timeout', { runId, error: e });
    else safeLog.error('ultrathink.pubmed-ingest', 'ingest failed', { runId, error: e });
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'pubmed', p_action: 'ingest_error',
      p_in: pmids.length, p_added: added, p_skipped: skipped, p_error: errors || 1,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'error', p_err_msg: msg, p_metadata: { query, days },
    });
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});

function toIsoDate(s: string): string | null {
  // PubMed pubdate formats vary: "2026 Apr 5", "2026 Apr", "2026"
  const m = s.match(/^(\d{4})(?:\s+(\w+))?(?:\s+(\d{1,2}))?/);
  if (!m) return null;
  const months: Record<string, string> = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
  const yr = m[1];
  const mo = m[2] ? (months[m[2].slice(0,3)] ?? '01') : '01';
  const dy = m[3] ? m[3].padStart(2, '0') : '01';
  return `${yr}-${mo}-${dy}`;
}
