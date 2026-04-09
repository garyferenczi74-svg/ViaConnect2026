// =============================================================================
// ultrathink-orchestrator (Prompt #60 — Layer 7, the brain)
// =============================================================================
// Master agent. Runs every 10 minutes via pg_cron. On each tick:
//   1. Reads ultrathink_data_feeds for sources whose next_run_at <= now()
//      AND total_spent_today_usd < daily_budget_usd
//      AND circuit_open_until is null or in the past
//   2. For each due feed with an implemented ingest function, fires a POST
//      to that function via the Supabase functions URL (no auth required —
//      all ultrathink-* functions are deployed verify_jwt=false)
//   3. After dispatching ingest, fires the knowledge-processor to drain the
//      research_feed queue
//   4. Updates next_run_at on each feed using cron-next math (best-effort,
//      simplified to fixed intervals based on the schedule)
//   5. Logs everything via ultrathink_record_sync
//
// Cost cap enforcement: before each Claude-tier dispatch, checks ultrathink_today_spend()
// and skips if total >= $50.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DAILY_CAP_USD = 50;

// Map source name → implemented ingest function slug
// Sources NOT in this map are registered but Phase-2-deferred; orchestrator
// updates next_run_at past them so they don't pile up.
const INGEST_MAP: Record<string, string> = {
  pubmed:               'ultrathink-pubmed-ingest',
  clinicaltrials_gov:   'ultrathink-clinicaltrials-ingest',
  openfda:              'ultrathink-fda-ingest',
};

// Approximate next-run interval per source (used when we can't easily
// compute the next cron tick). Better than nothing for Phase 1.
const APPROX_INTERVAL_MIN: Record<string, number> = {
  pubmed:               360,    // 6h
  clinicaltrials_gov:   1440,   // 1d
  openfda:              1440,   // 1d
  dsld:                 10080,  // 1w
  openfoodfacts:        10080,
  bright_data:          1440,
  examine:              10080,
  consumerlab:          10080,
  nih_ods:              43200,  // ~30d
  cochrane:             43200,
  drugbank:             10080,
  viaconnect_internal:  30,
};

interface FeedRow {
  id: string;
  source: string;
  display_name: string;
  schedule_cron: string;
  cost_tier: string;
  cost_per_run_usd: number;
  daily_budget_usd: number;
  total_spent_today_usd: number;
  is_active: boolean;
  next_run_at: string | null;
  circuit_open_until: string | null;
  consecutive_failures: number;
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
}

async function dispatchIngest(slug: string): Promise<{ status: number; body: string }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const text = await r.text();
  return { status: r.status, body: text.slice(0, 1000) };
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    // Cost cap check
    const { data: spendRaw } = await db.rpc('ultrathink_today_spend');
    const todaySpend = (spendRaw as unknown as number) ?? 0;
    const costCapped = todaySpend >= DAILY_CAP_USD;

    // Pull due feeds
    const nowIso = new Date().toISOString();
    const { data: feeds, error: feedsErr } = await db
      .from('ultrathink_data_feeds')
      .select('id, source, display_name, schedule_cron, cost_tier, cost_per_run_usd, daily_budget_usd, total_spent_today_usd, is_active, next_run_at, circuit_open_until, consecutive_failures')
      .eq('is_active', true)
      .order('next_run_at', { ascending: true, nullsFirst: true });
    if (feedsErr) throw new Error(`feed read: ${feedsErr.message}`);

    const due: FeedRow[] = [];
    const skippedCircuit: string[] = [];
    const skippedBudget: string[] = [];
    const skippedNotImpl: string[] = [];

    for (const f of (feeds ?? []) as FeedRow[]) {
      if (f.circuit_open_until && f.circuit_open_until > nowIso) {
        skippedCircuit.push(f.source);
        continue;
      }
      if (f.next_run_at && f.next_run_at > nowIso) continue; // not due yet
      if (f.cost_tier !== 'free' && (costCapped || f.total_spent_today_usd >= f.daily_budget_usd)) {
        skippedBudget.push(f.source);
        continue;
      }
      if (!INGEST_MAP[f.source]) {
        skippedNotImpl.push(f.source);
        // Push next_run_at so we don't keep selecting it
        const interval = APPROX_INTERVAL_MIN[f.source] ?? 1440;
        await db.from('ultrathink_data_feeds').update({
          next_run_at: new Date(Date.now() + interval * 60_000).toISOString(),
        }).eq('id', f.id);
        continue;
      }
      due.push(f);
    }

    const dispatched: Array<{ source: string; status: number }> = [];
    for (const f of due) {
      const slug = INGEST_MAP[f.source];
      try {
        const r = await dispatchIngest(slug);
        dispatched.push({ source: f.source, status: r.status });
      } catch (e) {
        dispatched.push({ source: f.source, status: 0 });
        console.warn(`dispatch ${slug}: ${(e as Error).message}`);
      }
      // Roll next_run_at forward
      const interval = APPROX_INTERVAL_MIN[f.source] ?? 1440;
      await db.from('ultrathink_data_feeds').update({
        next_run_at: new Date(Date.now() + interval * 60_000).toISOString(),
      }).eq('id', f.id);
    }

    // Always run knowledge-processor to drain the queue
    let processorResult: { status: number; body: string } | null = null;
    if (!costCapped) {
      try {
        processorResult = await dispatchIngest('ultrathink-knowledge-processor');
      } catch (e) {
        console.warn(`knowledge-processor: ${(e as Error).message}`);
      }
    }

    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId,
      p_source: 'orchestrator',
      p_action: 'tick',
      p_in: feeds?.length ?? 0,
      p_added: dispatched.length,
      p_skipped: skippedCircuit.length + skippedBudget.length + skippedNotImpl.length,
      p_error: 0,
      p_cost: 0,
      p_duration: Date.now() - t0,
      p_status: 'ok',
      p_err_msg: null,
      p_metadata: {
        today_spend: todaySpend,
        cost_capped: costCapped,
        dispatched,
        skipped_circuit: skippedCircuit,
        skipped_budget: skippedBudget,
        skipped_not_implemented: skippedNotImpl,
        knowledge_processor: processorResult,
      },
    });

    return json({
      ok: true,
      run_id: runId,
      duration_ms: Date.now() - t0,
      today_spend_usd: todaySpend,
      dispatched,
      skipped: {
        circuit: skippedCircuit,
        budget: skippedBudget,
        not_implemented: skippedNotImpl,
      },
      knowledge_processor: processorResult,
    });
  } catch (e) {
    const msg = (e as Error).message;
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'orchestrator', p_action: 'fatal',
      p_in: 0, p_added: 0, p_skipped: 0, p_error: 1,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'error', p_err_msg: msg, p_metadata: {},
    });
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});
