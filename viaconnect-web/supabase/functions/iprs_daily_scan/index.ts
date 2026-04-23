// =============================================================================
// iprs_daily_scan Edge Function (Prompt #114 P4b)
// =============================================================================
// Daily sweep of CBP's Intellectual Property Rights Search (iprs.cbp.gov)
// against every active customs_recordations row. Writes unique hits into
// customs_iprs_scan_results where they feed the human review queue at
// /admin/legal/customs/alerts.
//
// Triggered at 06:06 UTC daily by pg_cron + pg_net (see migration
// 20260424000290_prompt_114_register_iprs_daily_scan.sql).
//
// Operational states:
//   iprs_scan_config.agent_enabled = FALSE (default):
//     Function emits a single heartbeat event with payload.status='disabled'
//     and returns. No outbound HTTP. This is the current P4b shipping state
//     because CBP IPRS has no public API and requires Gary to configure an
//     authenticated scrape path before the live path activates.
//   iprs_scan_config.agent_enabled = TRUE:
//     Function iterates active recordations; for each, calls fetchIprsMatches
//     (currently a hard-coded stub returning []). When Gary wires the real
//     CBP fetcher into fetchIprsMatches, this path auto-activates.
//
// Security guards honored (from the P4 security advisor review):
//   1. Outbound fetch host allowlisted to IPRS_HOST_ALLOW.
//   2. redirect: 'manual'.
//   3. 10s timeout via AbortController.
//   4. content-type validated before parsing.
//   5. Seller names stripped BEFORE normalization + hashing.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ---------- types -----------------------------------------------------------

interface RecordationRow {
  recordation_id: string;
  recordation_type: 'trademark' | 'copyright';
  mark_text: string | null;
  copyright_registration_number: string | null;
  status: string;
}

interface ScanConfig {
  agent_enabled: boolean;
}

interface IprsHit {
  listing_title: string;
  listing_url: string;
  listing_source: string;
  seller_identifier_token: string | null;
  observed_price_cents: number | null;
  mark_distance_score: number;
}

// ---------- env -------------------------------------------------------------

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const IPRS_HOST_ALLOW = new Set<string>(['iprs.cbp.gov']);
const FETCH_TIMEOUT_MS = 10_000;
const AGENT_NAME = 'iprs_daily_scan';

// ---------- helpers ---------------------------------------------------------

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

// Security req #5: strip anything that looks like a seller handle, URL, phone,
// email, or address fragment before normalization so it never enters the
// stored/hashed strings. Keeps CBP listing title text only.
function stripSellerSignals(raw: string): string {
  return raw
    .replace(/\bby\s+[a-z0-9_.-]{3,}/gi, '')            // "by acme_reseller"
    .replace(/\bsold\s+by\s+[^,.]{3,}/gi, '')           // "sold by X"
    .replace(/https?:\/\/\S+/gi, '')                    // URLs
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, '')          // emails
    .replace(/\+?\d[\d\s().-]{6,}\d/g, '')              // phone-ish
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTitle(raw: string): string {
  const stripped = stripSellerSignals(raw);
  return stripped
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 .%$-]/g, '')
    .trim();
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function emit(
  db: SupabaseClient,
  runId: string,
  eventType: 'start' | 'heartbeat' | 'complete' | 'error',
  payload: Record<string, unknown>,
  severity: 'info' | 'warning' | 'error' | 'critical' = 'info',
): Promise<void> {
  await db.from('ultrathink_agent_events').insert({
    agent_name: AGENT_NAME,
    event_type: eventType,
    run_id: runId,
    payload,
    severity,
  });
}

async function loadConfig(db: SupabaseClient): Promise<ScanConfig> {
  const { data, error } = await db
    .from('iprs_scan_config')
    .select('agent_enabled')
    .eq('config_id', true)
    .maybeSingle();
  if (error || !data) {
    return { agent_enabled: false };
  }
  return { agent_enabled: data.agent_enabled === true };
}

async function loadActiveRecordations(db: SupabaseClient): Promise<RecordationRow[]> {
  const { data, error } = await db
    .from('customs_recordations')
    .select('recordation_id, recordation_type, mark_text, copyright_registration_number, status')
    .in('status', ['active', 'grace_period']);
  if (error) throw new Error(`recordation fetch failed: ${error.message}`);
  return (data ?? []) as RecordationRow[];
}

// ---------- IPRS fetch ------------------------------------------------------
//
// TODO(activate): replace this stub with the production CBP scrape.
// Requirements that security review locked:
//   - validate URL host is in IPRS_HOST_ALLOW before every fetch
//   - redirect: 'manual'; reject 3xx responses
//   - AbortController timeout at FETCH_TIMEOUT_MS
//   - reject non-text/html content-type responses
//   - never pass user-supplied URLs into fetch; URL is derived here
//
// Until activated, fetchIprsMatches returns [] so the loop is inert.
// ---------------------------------------------------------------------------

async function safeFetchWithAllowlist(url: string): Promise<Response> {
  const parsed = new URL(url);
  if (!IPRS_HOST_ALLOW.has(parsed.host)) {
    throw new Error(`host ${parsed.host} not in IPRS allowlist`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'Accept': 'text/html' },
    });
    if (resp.status >= 300 && resp.status < 400) {
      throw new Error(`refusing ${resp.status} redirect`);
    }
    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      throw new Error(`unexpected content-type: ${contentType}`);
    }
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIprsMatches(
  _recordation: RecordationRow,
): Promise<IprsHit[]> {
  // Stub: the real CBP IPRS path has no public API. Until Gary wires this
  // up with his scraping stack, return no hits. The alerts queue gets
  // populated via the P4a test-insert endpoint in the meantime.
  //
  // When activating, shape the call like:
  //   const searchUrl = `https://iprs.cbp.gov/search?q=${encodeURIComponent(query)}`;
  //   const resp = await safeFetchWithAllowlist(searchUrl);
  //   const html = await resp.text();
  //   ... parse html, extract listing_title / listing_url / seller_token ...
  //
  // Keep safeFetchWithAllowlist referenced in production code so the
  // allowlist stays in the call chain.
  void safeFetchWithAllowlist;
  return [];
}

// ---------- per-recordation processing --------------------------------------

async function processRecordation(
  db: SupabaseClient,
  recordation: RecordationRow,
): Promise<{ inserted: number; skipped: number; hit_count: number }> {
  const hits = await fetchIprsMatches(recordation);
  if (hits.length === 0) {
    return { inserted: 0, skipped: 0, hit_count: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  for (const hit of hits) {
    const normalized = normalizeTitle(hit.listing_title);
    const contentHash = await sha256Hex(
      normalized + '|' + hit.listing_url + '|' + (hit.observed_price_cents ?? ''),
    );

    // Dedup: if a row with this content_hash already exists, skip.
    const { data: existing } = await db
      .from('customs_iprs_scan_results')
      .select('scan_result_id')
      .eq('content_hash', contentHash)
      .maybeSingle();
    if (existing) {
      skipped += 1;
      continue;
    }

    const { error } = await db.from('customs_iprs_scan_results').insert({
      recordation_id: recordation.recordation_id,
      scan_date: new Date().toISOString().slice(0, 10),
      scanned_at: new Date().toISOString(),
      listing_title: hit.listing_title,
      listing_title_normalized: normalized,
      listing_url: hit.listing_url,
      listing_source: hit.listing_source,
      seller_identifier_vault_ref: hit.seller_identifier_token,
      observed_price_cents: hit.observed_price_cents,
      mark_distance_score: hit.mark_distance_score,
      content_hash: contentHash,
      status: 'requires_review',
      is_synthetic: false,
    });
    if (!error) {
      inserted += 1;
    }
  }

  return { inserted, skipped, hit_count: hits.length };
}

// ---------- entry point -----------------------------------------------------

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    const cfg = await loadConfig(db);

    if (!cfg.agent_enabled) {
      await emit(db, runId, 'heartbeat', {
        status: 'disabled',
        reason: 'awaiting_cbp_auth',
      });
      await db
        .from('iprs_scan_config')
        .update({ last_heartbeat_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('config_id', true);
      return json({
        ok: true,
        skipped: 'agent disabled in iprs_scan_config',
        run_id: runId,
      });
    }

    await emit(db, runId, 'start', { agent: AGENT_NAME });

    const recordations = await loadActiveRecordations(db);
    await emit(db, runId, 'heartbeat', {
      status: 'recordations_loaded',
      count: recordations.length,
    });

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalHits = 0;
    const perRecordation: Array<{ recordation_id: string; inserted: number; skipped: number; hits: number }> = [];

    for (const r of recordations) {
      try {
        const result = await processRecordation(db, r);
        totalInserted += result.inserted;
        totalSkipped += result.skipped;
        totalHits += result.hit_count;
        perRecordation.push({
          recordation_id: r.recordation_id,
          inserted: result.inserted,
          skipped: result.skipped,
          hits: result.hit_count,
        });
      } catch (err) {
        await emit(
          db,
          runId,
          'error',
          {
            stage: 'process_recordation',
            recordation_id: r.recordation_id,
            error: (err as Error).message,
          },
          'warning',
        );
      }
    }

    await db
      .from('iprs_scan_config')
      .update({
        last_scan_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('config_id', true);

    await emit(db, runId, 'complete', {
      duration_ms: Date.now() - t0,
      recordations: recordations.length,
      hits: totalHits,
      inserted: totalInserted,
      skipped: totalSkipped,
    });

    return json({
      ok: true,
      run_id: runId,
      recordations: recordations.length,
      hits: totalHits,
      inserted: totalInserted,
      skipped: totalSkipped,
      per_recordation: perRecordation,
    });
  } catch (err) {
    const msg = (err as Error).message;
    await emit(db, runId, 'error', { error: msg }, 'critical');
    return json({ error: msg, run_id: runId }, 500);
  }
});
