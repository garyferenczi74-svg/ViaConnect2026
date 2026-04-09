// =============================================================================
// ultrathink-rule-evolver (Prompt #60 v2 — Layer 6: Dynamic Clinical Rules)
// =============================================================================
// Recomputes outcome_score on each ultrathink_clinical_rules row from
// ultrathink_outcome_tracker. Then:
//   - DEPRECATES rules with combined_score < 0.30 AND outcome_n >= 30
//     (i.e. enough data to be confident they don't work)
//   - Logs every change to ultrathink_sync_log + agent_events
//
// Pre-launch: outcome_tracker is empty, so no rule scores change. Post-launch
// the rules slowly evolve from "evidence-only" (initial seed) into
// "evidence + outcome" weighted by real-world Bio Score deltas.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DEPRECATION_THRESHOLD = 0.30;
const MIN_OUTCOME_N = 30;

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
function json(d: unknown, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } }); }

interface Rule { id: string; rule_id: string; product_name: string | null; evidence_score: number; outcome_score: number | null; outcome_n: number; is_active: boolean; }

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  await db.rpc('ultrathink_agent_heartbeat', {
    p_agent_name: 'ultrathink_rule_evolver', p_run_id: runId,
    p_event_type: 'start', p_payload: {}, p_severity: 'info',
  }).then(() => {}, () => {});

  let updated = 0, deprecated = 0;
  const deprecations: Array<{ rule_id: string; product: string | null; outcome_score: number | null; outcome_n: number }> = [];

  try {
    const { data: rules, error: rulesErr } = await db
      .from('ultrathink_clinical_rules')
      .select('id, rule_id, product_name, evidence_score, outcome_score, outcome_n, is_active')
      .eq('is_active', true);
    if (rulesErr) throw new Error(`rules fetch: ${rulesErr.message}`);

    if (!rules || rules.length === 0) {
      await db.rpc('ultrathink_record_sync', {
        p_run_id: runId, p_source: 'rule_evolver', p_action: 'no_active_rules',
        p_in: 0, p_added: 0, p_skipped: 0, p_error: 0,
        p_cost: 0, p_duration: Date.now() - t0,
        p_status: 'ok', p_err_msg: null, p_metadata: {},
      });
      return json({ ok: true, run_id: runId, updated: 0, deprecated: 0 });
    }

    for (const r of rules as Rule[]) {
      // Without a product_name we can't link to outcome_tracker
      if (!r.product_name) continue;

      // Aggregate outcome rows for this product across all conditions
      const { data: outcomes } = await db
        .from('ultrathink_outcome_tracker')
        .select('improved')
        .eq('product_name', r.product_name);

      const n = outcomes?.length ?? 0;
      if (n === 0) continue;  // pre-launch path: no outcomes, leave evidence_score alone

      const improved = outcomes!.filter(o => o.improved).length;
      const newOutcomeScore = improved / n;

      const { error: updErr } = await db
        .from('ultrathink_clinical_rules')
        .update({
          outcome_score: newOutcomeScore,
          outcome_n: n,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id);
      if (!updErr) updated++;

      // Compute new combined score (matches the GENERATED column formula)
      const combined = r.evidence_score * 0.4 + newOutcomeScore * 0.6;

      if (combined < DEPRECATION_THRESHOLD && n >= MIN_OUTCOME_N) {
        await db.from('ultrathink_clinical_rules').update({
          is_active: false,
          deprecated_at: new Date().toISOString(),
          deprecation_reason: `combined_score=${combined.toFixed(2)} < ${DEPRECATION_THRESHOLD} after ${n} outcomes (auto-deprecated by rule-evolver)`,
        }).eq('id', r.id);
        deprecated++;
        deprecations.push({ rule_id: r.rule_id, product: r.product_name, outcome_score: newOutcomeScore, outcome_n: n });
      }
    }

    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'rule_evolver', p_action: 'evolve_rules',
      p_in: rules.length, p_added: updated, p_skipped: 0, p_error: 0,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'ok', p_err_msg: null,
      p_metadata: { deprecated, deprecations: deprecations.slice(0, 20) },
    });
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'ultrathink_rule_evolver', p_run_id: runId,
      p_event_type: 'complete', p_payload: { updated, deprecated }, p_severity: 'info',
    }).then(() => {}, () => {});

    return json({ ok: true, run_id: runId, evaluated: rules.length, updated, deprecated, deprecations });
  } catch (e) {
    const msg = (e as Error).message;
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'rule_evolver', p_action: 'fatal',
      p_in: 0, p_added: updated, p_skipped: 0, p_error: 1,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'error', p_err_msg: msg, p_metadata: {},
    });
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'ultrathink_rule_evolver', p_run_id: runId,
      p_event_type: 'error', p_payload: { error: msg }, p_severity: 'error',
    }).then(() => {}, () => {});
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});
