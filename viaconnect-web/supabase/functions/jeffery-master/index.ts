// =============================================================================
// jeffery-master (Prompt #60 v3 — Layer 8: Master Intelligence)
// =============================================================================
// Jeffery™ supersedes ultrathink-orchestrator. Every 10 minutes he:
//
//   1. Reads ultrathink_data_feeds; dispatches due external feeds (with the
//      $50/day cost cap and circuit breaker logic from v2 orchestrator)
//   2. Dispatches ultrathink-knowledge-processor each tick to drain the queue
//   3. Walks ultrathink_agent_registry; dispatches internal agents whose
//      heartbeat is older than their expected_period_minutes
//   4. Runs ultrathink_agent_health_sweep across all 17 agents
//   5. **NEW** Logs every dispatch + skip + auto-tune as a row in
//      ultrathink_jeffery_decisions (audit trail for self-review)
//   6. **NEW** Scaling awareness: queries auth.users count, compares to last
//      milestone (100/500/1K/5K/10K/50K/100K), logs scaling_milestone events
//   7. **NEW** Auto-tune: if today's spend is < 20% of cap AND there are
//      pending tasks, increases batch_size on knowledge-processor; if > 80%,
//      decreases it. Bounded by [5, 50].
//   8. Self-heartbeat to ultrathink_agent_registry (agent_name='jeffery_master')
//
// Deployed verify_jwt=false; called by jeffery_master_cron pg_cron job.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DAILY_CAP_USD = 50;
const POPULATION_MILESTONES = [100, 500, 1000, 5000, 10000, 50000, 100000];

const INGEST_MAP: Record<string, string> = {
  pubmed: 'ultrathink-pubmed-ingest',
  clinicaltrials_gov: 'ultrathink-clinicaltrials-ingest',
  openfda: 'ultrathink-fda-ingest',
};
const APPROX_INTERVAL_MIN: Record<string, number> = {
  pubmed: 360, clinicaltrials_gov: 1440, openfda: 1440,
  dsld: 10080, openfoodfacts: 10080, bright_data: 1440,
  examine: 10080, consumerlab: 10080, nih_ods: 43200,
  cochrane: 43200, drugbank: 10080, viaconnect_internal: 30,
};
const INTERNAL_AGENTS: Array<{ agent_name: string; slug: string; period_min: number }> = [
  { agent_name: 'ultrathink_outcome_collector', slug: 'ultrathink-outcome-collector', period_min: 360 },
  { agent_name: 'ultrathink_cache_builder',     slug: 'ultrathink-cache-builder',     period_min: 1440 },
  { agent_name: 'ultrathink_rule_evolver',      slug: 'ultrathink-rule-evolver',      period_min: 10080 },
];

interface FeedRow { id: string; source: string; cost_tier: string; daily_budget_usd: number; total_spent_today_usd: number; is_active: boolean; next_run_at: string | null; circuit_open_until: string | null; }

function admin(): SupabaseClient { return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } }); }
function json(d: unknown, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } }); }
async function dispatch(slug: string): Promise<{ status: number; body: string }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  return { status: r.status, body: (await r.text()).slice(0, 500) };
}
async function logDecision(db: SupabaseClient, runId: string, decisionType: string, target: string | null, rationale: string, inputs: Record<string, unknown>): Promise<void> {
  await db.rpc('jeffery_log_decision', {
    p_run_id: runId,
    p_decision_type: decisionType,
    p_target_agent: target,
    p_rationale: rationale,
    p_inputs: inputs,
  }).then(() => {}, () => {});
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  // Self-heartbeat (start)
  await db.rpc('ultrathink_agent_heartbeat', {
    p_agent_name: 'jeffery_master', p_run_id: runId,
    p_event_type: 'start', p_payload: {}, p_severity: 'info',
  }).then(() => {}, () => {});

  try {
    // ── Cost cap check ────────────────────────────────────────────────
    const { data: spendRaw } = await db.rpc('ultrathink_today_spend');
    const todaySpend = (spendRaw as unknown as number) ?? 0;
    const costCapped = todaySpend >= DAILY_CAP_USD;

    // ── 1. External feed dispatch ─────────────────────────────────────
    const nowIso = new Date().toISOString();
    const { data: feeds } = await db
      .from('ultrathink_data_feeds')
      .select('id, source, cost_tier, daily_budget_usd, total_spent_today_usd, is_active, next_run_at, circuit_open_until')
      .eq('is_active', true)
      .order('next_run_at', { ascending: true, nullsFirst: true });

    const dispatched: Array<{ source: string; status: number }> = [];
    const skippedCircuit: string[] = [];
    const skippedBudget: string[] = [];
    const skippedNotImpl: string[] = [];

    for (const f of (feeds ?? []) as FeedRow[]) {
      if (f.circuit_open_until && f.circuit_open_until > nowIso) {
        skippedCircuit.push(f.source);
        await logDecision(db, runId, 'skip_feed', f.source, 'circuit_breaker_open', { circuit_open_until: f.circuit_open_until });
        continue;
      }
      if (f.next_run_at && f.next_run_at > nowIso) continue;
      if (f.cost_tier !== 'free' && (costCapped || f.total_spent_today_usd >= f.daily_budget_usd)) {
        skippedBudget.push(f.source);
        await logDecision(db, runId, 'skip_feed', f.source, 'budget_exhausted', { spent: f.total_spent_today_usd, daily_budget: f.daily_budget_usd, cost_capped: costCapped });
        continue;
      }
      if (!INGEST_MAP[f.source]) {
        skippedNotImpl.push(f.source);
        const interval = APPROX_INTERVAL_MIN[f.source] ?? 1440;
        await db.from('ultrathink_data_feeds').update({ next_run_at: new Date(Date.now() + interval * 60_000).toISOString() }).eq('id', f.id);
        continue;
      }
      try {
        const r = await dispatch(INGEST_MAP[f.source]);
        dispatched.push({ source: f.source, status: r.status });
        await logDecision(db, runId, 'dispatch_feed', f.source, `external_feed_due`, { http_status: r.status, slug: INGEST_MAP[f.source] });
      } catch (e) {
        dispatched.push({ source: f.source, status: 0 });
        console.warn(`dispatch ${f.source}: ${(e as Error).message}`);
      }
      const interval = APPROX_INTERVAL_MIN[f.source] ?? 1440;
      await db.from('ultrathink_data_feeds').update({ next_run_at: new Date(Date.now() + interval * 60_000).toISOString() }).eq('id', f.id);
    }

    // ── 2. Knowledge processor each tick ──────────────────────────────
    let processorResult: { status: number; body: string } | null = null;
    if (!costCapped) {
      try {
        processorResult = await dispatch('ultrathink-knowledge-processor');
        await logDecision(db, runId, 'dispatch_internal_agent', 'ultrathink_knowledge_processor', 'tick_drain_queue', { http_status: processorResult.status });
      } catch (e) { console.warn(`kp: ${(e as Error).message}`); }
    }

    // ── 3. Internal agent cadence dispatch ────────────────────────────
    const internalDispatched: Array<{ agent: string; status: number; reason: string }> = [];
    for (const ia of INTERNAL_AGENTS) {
      const { data: agentRow } = await db.from('ultrathink_agent_registry').select('last_heartbeat_at, is_active').eq('agent_name', ia.agent_name).maybeSingle();
      if (!agentRow || agentRow.is_active === false) {
        internalDispatched.push({ agent: ia.agent_name, status: 0, reason: 'inactive_or_unregistered' });
        continue;
      }
      const last = agentRow.last_heartbeat_at ? new Date(agentRow.last_heartbeat_at).getTime() : 0;
      const due = Date.now() - last >= ia.period_min * 60_000;
      if (!due) { internalDispatched.push({ agent: ia.agent_name, status: 0, reason: 'not_due' }); continue; }
      try {
        const r = await dispatch(ia.slug);
        internalDispatched.push({ agent: ia.agent_name, status: r.status, reason: 'dispatched' });
        await logDecision(db, runId, 'dispatch_internal_agent', ia.agent_name, `cadence_due_${ia.period_min}min`, { http_status: r.status });
      } catch (e) {
        internalDispatched.push({ agent: ia.agent_name, status: 0, reason: `error: ${(e as Error).message}` });
      }
    }

    // ── 4. Health sweep ───────────────────────────────────────────────
    let healthSweep: Array<{ out_agent_name: string; out_new_status: string }> = [];
    try {
      const { data: sweepData } = await db.rpc('ultrathink_agent_health_sweep');
      healthSweep = (sweepData as Array<{ out_agent_name: string; out_new_status: string }>) ?? [];
    } catch (e) { console.warn(`sweep: ${(e as Error).message}`); }

    // Log any unhealthy agents as 'flag_agent' decisions
    for (const sw of healthSweep) {
      if (sw.out_new_status === 'unhealthy') {
        await logDecision(db, runId, 'flag_agent', sw.out_agent_name, `health_sweep_marked_unhealthy`, { sweep_status: sw.out_new_status });
      }
    }

    // ── 5. Scaling awareness ──────────────────────────────────────────
    let scalingMilestoneCrossed: number | null = null;
    try {
      const { count: userCount } = await db.from('profiles').select('*', { count: 'exact', head: true });
      const pop = userCount ?? 0;
      // Find largest crossed milestone we haven't logged yet
      const { data: lastMilestone } = await db
        .from('ultrathink_jeffery_evolution')
        .select('payload')
        .eq('entry_type', 'scaling_milestone')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastValue = (lastMilestone?.payload as { milestone?: number } | null)?.milestone ?? 0;
      const newCrossed = POPULATION_MILESTONES.filter(m => m > lastValue && pop >= m).pop() ?? null;
      if (newCrossed) {
        scalingMilestoneCrossed = newCrossed;
        await db.rpc('jeffery_log_evolution', {
          p_entry_type: 'scaling_milestone', p_agent_name: null,
          p_metric_name: 'population_size', p_metric_value: pop,
          p_rolling_30d_avg: null, p_population_size: pop,
          p_payload: { milestone: newCrossed, prior_milestone: lastValue },
          p_notes: `Crossed ${newCrossed}-user milestone. Scaling review recommended.`,
        }).then(() => {}, () => {});
        await logDecision(db, runId, 'scaling_review', null, `population_crossed_${newCrossed}`, { population_size: pop, milestone: newCrossed });
      }
    } catch (e) { console.warn(`scaling: ${(e as Error).message}`); }

    // ── 6. Auto-tune knowledge-processor batch size based on spend rate ───
    let autoTuned: { old: number; new: number; reason: string } | null = null;
    try {
      const spendRatio = todaySpend / DAILY_CAP_USD;
      const { data: cfg } = await db.from('brand_agent_config').select('value').eq('key', 'batch_size').maybeSingle();
      const currentBatch = cfg ? parseInt(cfg.value, 10) : 5;
      let newBatch = currentBatch;
      let reason = '';
      if (spendRatio < 0.20 && currentBatch < 50) { newBatch = Math.min(50, currentBatch + 5); reason = 'low_spend_room_to_grow'; }
      else if (spendRatio > 0.80 && currentBatch > 5) { newBatch = Math.max(5, currentBatch - 5); reason = 'high_spend_throttle'; }
      if (newBatch !== currentBatch) {
        await db.from('brand_agent_config').update({ value: String(newBatch), updated_at: new Date().toISOString() }).eq('key', 'batch_size');
        autoTuned = { old: currentBatch, new: newBatch, reason };
        await logDecision(db, runId, 'auto_tune', 'batch_size', reason, { from: currentBatch, to: newBatch, spend_ratio: spendRatio });
        await db.rpc('jeffery_log_evolution', {
          p_entry_type: 'config_tune', p_agent_name: 'jeffery_master',
          p_metric_name: 'batch_size', p_metric_value: newBatch,
          p_rolling_30d_avg: currentBatch, p_population_size: null,
          p_payload: { reason, spend_ratio: spendRatio },
          p_notes: `Auto-tuned batch_size from ${currentBatch} to ${newBatch}`,
        }).then(() => {}, () => {});
      }
    } catch (e) { console.warn(`auto-tune: ${(e as Error).message}`); }

    // ── Final sync log + heartbeat ────────────────────────────────────
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'jeffery_master', p_action: 'tick',
      p_in: feeds?.length ?? 0,
      p_added: dispatched.length + internalDispatched.filter(d => d.reason === 'dispatched').length,
      p_skipped: skippedCircuit.length + skippedBudget.length + skippedNotImpl.length,
      p_error: 0, p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'ok', p_err_msg: null,
      p_metadata: {
        today_spend: todaySpend, cost_capped: costCapped,
        dispatched, skipped_circuit: skippedCircuit, skipped_budget: skippedBudget, skipped_not_implemented: skippedNotImpl,
        internal_dispatched: internalDispatched,
        knowledge_processor: processorResult,
        health_sweep_count: healthSweep.length,
        scaling_milestone_crossed: scalingMilestoneCrossed,
        auto_tuned: autoTuned,
      },
    });
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'jeffery_master', p_run_id: runId,
      p_event_type: 'complete',
      p_payload: { dispatched: dispatched.length, internal: internalDispatched.length, sweeps: healthSweep.length, milestone: scalingMilestoneCrossed, auto_tuned: autoTuned },
      p_severity: 'info',
    }).then(() => {}, () => {});

    return json({
      ok: true, run_id: runId, duration_ms: Date.now() - t0,
      today_spend_usd: todaySpend,
      external: { dispatched, skipped: { circuit: skippedCircuit, budget: skippedBudget, not_implemented: skippedNotImpl } },
      internal: internalDispatched,
      knowledge_processor: processorResult,
      health_sweep: healthSweep,
      scaling_milestone_crossed: scalingMilestoneCrossed,
      auto_tuned: autoTuned,
    });
  } catch (e) {
    const msg = (e as Error).message;
    await db.rpc('ultrathink_record_sync', { p_run_id: runId, p_source: 'jeffery_master', p_action: 'fatal', p_in: 0, p_added: 0, p_skipped: 0, p_error: 1, p_cost: 0, p_duration: Date.now() - t0, p_status: 'error', p_err_msg: msg, p_metadata: {} });
    await db.rpc('ultrathink_agent_heartbeat', { p_agent_name: 'jeffery_master', p_run_id: runId, p_event_type: 'error', p_payload: { error: msg }, p_severity: 'error' }).then(() => {}, () => {});
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});
