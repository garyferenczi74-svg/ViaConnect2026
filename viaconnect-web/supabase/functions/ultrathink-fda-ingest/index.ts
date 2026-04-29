// =============================================================================
// ultrathink-fda-ingest (Prompt #60 — Layer 2, Source #3)
// =============================================================================
// Calls openFDA Drug Adverse Events API for supplement+drug co-occurrence
// signals (drug-supplement interactions). Pulls reports updated in the last
// N days, dedupes by safetyreportid, inserts to ultrathink_research_feed.
//
// Free public API. 240 req/min, 1000/day without API key.
// Set FDA_API_KEY env var for higher quota (120k/day).
// Endpoint: https://api.fda.gov/drug/event.json
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const fdaBreaker = getCircuitBreaker('fda-api');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FDA_KEY      = Deno.env.get('FDA_API_KEY') ?? '';

interface FdaResp {
  results?: FdaReport[];
  meta?: { results?: { total?: number } };
}
interface FdaReport {
  safetyreportid?: string;
  receivedate?: string;
  serious?: string;
  patient?: {
    drug?: Array<{
      medicinalproduct?: string;
      drugcharacterization?: string;
      drugindication?: string;
    }>;
    reaction?: Array<{ reactionmeddrapt?: string }>;
  };
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
}

// Search query: events involving common supplement-class words.
// Constrained to past 14 days to keep result sizes manageable.
const DEFAULT_QUERY = 'patient.drug.medicinalproduct:(vitamin+OR+supplement+OR+omega+OR+probiotic+OR+magnesium+OR+turmeric+OR+ginkgo+OR+st+john+wort)';

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  let body: { search?: string; days?: number; limit?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const days = body.days ?? 14;
  const limit = Math.min(body.limit ?? 100, 1000);

  // Date range filter
  const fromDate = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10).replace(/-/g, '');
  const toDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fullSearch = `${body.search ?? DEFAULT_QUERY}+AND+receivedate:[${fromDate}+TO+${toDate}]`;

  let added = 0, skipped = 0, fetched = 0;

  try {
    const url = new URL('https://api.fda.gov/drug/event.json');
    url.searchParams.set('search', fullSearch);
    url.searchParams.set('limit', String(limit));
    if (FDA_KEY) url.searchParams.set('api_key', FDA_KEY);

    const r = await fetch(url.toString());
    if (!r.ok) {
      // openFDA returns 404 when zero hits — treat as ok
      if (r.status === 404) {
        await db.rpc('ultrathink_record_sync', {
          p_run_id: runId, p_source: 'openfda', p_action: 'no_hits',
          p_in: 0, p_added: 0, p_skipped: 0, p_error: 0,
          p_cost: 0, p_duration: Date.now() - t0,
          p_status: 'ok', p_err_msg: null, p_metadata: { search: fullSearch },
        });
        return json({ ok: true, run_id: runId, fetched: 0 });
      }
      throw new Error(`openfda HTTP ${r.status}`);
    }
    const j = (await r.json()) as FdaResp;
    const results = j.results ?? [];
    fetched = results.length;

    const reportIds = results
      .map(r => r.safetyreportid)
      .filter((id): id is string => !!id);

    const { data: existing } = await db
      .from('ultrathink_research_feed')
      .select('external_id')
      .eq('source', 'openfda')
      .in('external_id', reportIds);
    const known = new Set((existing ?? []).map(r => r.external_id));

    const rows = results
      .filter(r => r.safetyreportid && !known.has(r.safetyreportid))
      .map(rep => {
        const id = rep.safetyreportid!;
        const drugs = (rep.patient?.drug ?? []).map(d => d.medicinalproduct ?? '?').filter(Boolean);
        const reactions = (rep.patient?.reaction ?? []).map(rx => rx.reactionmeddrapt ?? '?').filter(Boolean);
        const title = `FDA AE: ${drugs.slice(0, 3).join(', ')} → ${reactions.slice(0, 3).join(', ')}`;
        return {
          source: 'openfda' as const,
          external_id: id,
          title,
          abstract: `Drugs involved: ${drugs.join('; ')}\nReactions: ${reactions.join('; ')}\nSerious: ${rep.serious === '1'}`,
          authors: [],
          published_at: rep.receivedate
            ? `${rep.receivedate.slice(0,4)}-${rep.receivedate.slice(4,6)}-${rep.receivedate.slice(6,8)}`
            : null,
          url: `https://api.fda.gov/drug/event.json?search=safetyreportid:${id}`,
          raw_payload: rep as unknown as Record<string, unknown>,
          status: 'pending' as const,
        };
      });

    skipped = fetched - rows.length;
    if (rows.length > 0) {
      const { error: insertErr } = await db.from('ultrathink_research_feed').insert(rows);
      if (insertErr) throw new Error(`insert: ${insertErr.message}`);
      added = rows.length;
    }

    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'openfda', p_action: 'ingest_success',
      p_in: fetched, p_added: added, p_skipped: skipped, p_error: 0,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'ok', p_err_msg: null, p_metadata: { days, limit },
    });

    return json({ ok: true, run_id: runId, fetched, added, skipped });
  } catch (e) {
    const msg = (e as Error).message;
    if (isCircuitBreakerError(e)) safeLog.warn('ultrathink.fda-ingest', 'fda circuit open', { runId, error: e });
    else if (isTimeoutError(e)) safeLog.warn('ultrathink.fda-ingest', 'fda timeout', { runId, error: e });
    else safeLog.error('ultrathink.fda-ingest', 'ingest failed', { runId, error: e });
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'openfda', p_action: 'ingest_error',
      p_in: fetched, p_added: added, p_skipped: skipped, p_error: 1,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'error', p_err_msg: msg, p_metadata: { days },
    });
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});
