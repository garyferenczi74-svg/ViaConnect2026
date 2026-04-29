// =============================================================================
// ultrathink-clinicaltrials-ingest (Prompt #60 — Layer 2, Source #2)
// =============================================================================
// Calls ClinicalTrials.gov v2 API (the modern JSON one, not the old v1).
// Pulls supplement/peptide-related interventional trials updated in the
// last 7 days, dedupes by NCT id, inserts to ultrathink_research_feed.
//
// Free public API. No key required. No rate limit documented.
// Endpoint: https://clinicaltrials.gov/api/v2/studies
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const ctgBreaker = getCircuitBreaker('clinicaltrials-api');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CtgStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    descriptionModule?: { briefSummary?: string };
    statusModule?: { lastUpdateSubmitDate?: string; overallStatus?: string };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
    designModule?: { studyType?: string };
    armsInterventionsModule?: { interventions?: Array<{ name?: string; type?: string }> };
  };
}
interface CtgResp { studies?: CtgStudy[]; nextPageToken?: string }

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
}

const DEFAULT_QUERY = 'supplement OR peptide OR nutraceutical OR vitamin OR mineral';

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  let body: { query?: string; pageSize?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const query = body.query ?? DEFAULT_QUERY;
  const pageSize = Math.min(body.pageSize ?? 100, 200);

  let added = 0, skipped = 0, fetched = 0;

  try {
    // Fetch one page (200 max). Pagination would be added in Phase 2 for full backfill.
    const params = new URLSearchParams({
      'query.term': query,
      'filter.overallStatus': 'RECRUITING|ACTIVE_NOT_RECRUITING|COMPLETED',
      pageSize: String(pageSize),
      format: 'json',
      sort: 'LastUpdatePostDate:desc',
    });
    const r = await fetch(`https://clinicaltrials.gov/api/v2/studies?${params}`);
    if (!r.ok) throw new Error(`ctg HTTP ${r.status}`);
    const j = (await r.json()) as CtgResp;
    const studies = j.studies ?? [];
    fetched = studies.length;

    if (fetched === 0) {
      await db.rpc('ultrathink_record_sync', {
        p_run_id: runId, p_source: 'clinicaltrials_gov', p_action: 'empty',
        p_in: 0, p_added: 0, p_skipped: 0, p_error: 0,
        p_cost: 0, p_duration: Date.now() - t0,
        p_status: 'ok', p_err_msg: null, p_metadata: { query },
      });
      return json({ ok: true, run_id: runId, fetched: 0 });
    }

    // Dedupe
    const nctIds = studies
      .map(s => s.protocolSection?.identificationModule?.nctId)
      .filter((id): id is string => !!id);

    const { data: existing } = await db
      .from('ultrathink_research_feed')
      .select('external_id')
      .eq('source', 'clinicaltrials_gov')
      .in('external_id', nctIds);
    const known = new Set((existing ?? []).map(r => r.external_id));

    const rows = studies
      .filter(s => {
        const id = s.protocolSection?.identificationModule?.nctId;
        return id && !known.has(id);
      })
      .map(s => {
        const ps = s.protocolSection!;
        const id = ps.identificationModule!.nctId!;
        const title = ps.identificationModule?.briefTitle ?? `[NCT] ${id}`;
        const summary = ps.descriptionModule?.briefSummary ?? null;
        const sponsor = ps.sponsorCollaboratorsModule?.leadSponsor?.name ?? null;
        const lastUpdate = ps.statusModule?.lastUpdateSubmitDate ?? null;
        return {
          source: 'clinicaltrials_gov' as const,
          external_id: id,
          title,
          abstract: summary,
          authors: sponsor ? [sponsor] : [],
          published_at: lastUpdate,
          url: `https://clinicaltrials.gov/study/${id}`,
          raw_payload: s as unknown as Record<string, unknown>,
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
      p_run_id: runId, p_source: 'clinicaltrials_gov', p_action: 'ingest_success',
      p_in: fetched, p_added: added, p_skipped: skipped, p_error: 0,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'ok', p_err_msg: null, p_metadata: { query, pageSize },
    });

    return json({ ok: true, run_id: runId, fetched, added, skipped });
  } catch (e) {
    const msg = (e as Error).message;
    if (isCircuitBreakerError(e)) safeLog.warn('ultrathink.clinicaltrials-ingest', 'ctg circuit open', { runId, error: e });
    else if (isTimeoutError(e)) safeLog.warn('ultrathink.clinicaltrials-ingest', 'ctg timeout', { runId, error: e });
    else safeLog.error('ultrathink.clinicaltrials-ingest', 'ingest failed', { runId, error: e });
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'clinicaltrials_gov', p_action: 'ingest_error',
      p_in: fetched, p_added: added, p_skipped: skipped, p_error: 1,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'error', p_err_msg: msg, p_metadata: { query },
    });
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});
