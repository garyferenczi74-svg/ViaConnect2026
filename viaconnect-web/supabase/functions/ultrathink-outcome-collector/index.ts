// =============================================================================
// ultrathink-outcome-collector (Prompt #60 v2 — Layer 4: Cross-Population Learning)
// =============================================================================
// Walks ultrathink_recommendations issued >= 30 days ago whose 30/60-day
// outcome hasn't been recorded yet, snapshots Bio Score deltas (anonymized)
// into ultrathink_outcome_tracker.
//
// PRIVACY: ZERO PII written to outcome_tracker. age → bracket, sex → bracket,
// recommendation identified by HASH only. user_id is consumed at read time
// from ultrathink_recommendations + bio_optimization_history but never stored.
//
// Pre-launch: returns 0 rows. The pipeline is correct; the data is missing.
// Post-launch (June 2026+): this becomes the spine of the learning loop.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
function json(d: unknown, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } }); }

function ageBracket(age: number | null): string {
  if (age == null) return 'unknown';
  if (age < 30) return '18-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  return '70+';
}
function sexBracket(s: string | null | undefined): string {
  const v = (s ?? '').toLowerCase();
  if (v.startsWith('m')) return 'm';
  if (v.startsWith('f')) return 'f';
  if (v === 'x' || v === 'nb' || v === 'nonbinary') return 'x';
  return 'unknown';
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface RecommendationRow {
  id: string;
  user_id: string;
  product_name: string;
  condition_pattern: string | null;
  created_at: string;
}

interface ProfileRow { age: number | null; sex: string | null; bio_optimization_score: number | null; }
interface BioRow { score: number; date: string; }

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  await db.rpc('ultrathink_agent_heartbeat', {
    p_agent_name: 'ultrathink_outcome_collector',
    p_run_id: runId, p_event_type: 'start',
    p_payload: { ts: new Date().toISOString() }, p_severity: 'info',
  }).then(() => {}, () => {});

  let processed = 0, snapshotted = 0, skipped = 0, errors = 0;

  try {
    // Pull recommendations >= 30 days old (so the 30-day window has passed)
    const cutoff30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: recs, error: recsErr } = await db
      .from('ultrathink_recommendations')
      .select('id, user_id, product_name, condition_pattern, created_at')
      .lt('created_at', cutoff30)
      .limit(200);
    if (recsErr) throw new Error(`recs fetch: ${recsErr.message}`);

    if (!recs || recs.length === 0) {
      await db.rpc('ultrathink_record_sync', {
        p_run_id: runId, p_source: 'outcome_collector', p_action: 'no_eligible_recs',
        p_in: 0, p_added: 0, p_skipped: 0, p_error: 0,
        p_cost: 0, p_duration: Date.now() - t0,
        p_status: 'ok', p_err_msg: null,
        p_metadata: { note: 'no recommendations >= 30 days old (expected pre-launch)' },
      });
      await db.rpc('ultrathink_agent_heartbeat', {
        p_agent_name: 'ultrathink_outcome_collector', p_run_id: runId,
        p_event_type: 'complete', p_payload: { snapshotted: 0 }, p_severity: 'info',
      }).then(() => {}, () => {});
      return json({ ok: true, run_id: runId, snapshotted: 0, note: 'pre-launch' });
    }

    for (const rec of recs as RecommendationRow[]) {
      try {
        // Snapshot already exists?
        const recHash = await sha256Hex(`${rec.product_name}|${rec.condition_pattern ?? ''}|${rec.user_id}|${rec.id}`);
        const { data: priorSnap } = await db
          .from('ultrathink_outcome_tracker')
          .select('id')
          .eq('recommendation_hash', recHash)
          .maybeSingle();
        if (priorSnap) { skipped++; continue; }

        // Bio score AT recommendation time (closest snapshot before created_at)
        const { data: prof } = await db
          .from('profiles')
          .select('age, sex')
          .eq('id', rec.user_id)
          .maybeSingle();

        const { data: bioBefore } = await db
          .from('bio_optimization_history')
          .select('score')
          .eq('user_id', rec.user_id)
          .lte('date', rec.created_at)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!bioBefore) { skipped++; continue; }

        // 30 and 60-day deltas
        const t30 = new Date(new Date(rec.created_at).getTime() + 30 * 86400_000).toISOString();
        const t60 = new Date(new Date(rec.created_at).getTime() + 60 * 86400_000).toISOString();
        const { data: bio30 } = await db.from('bio_optimization_history').select('score, date').eq('user_id', rec.user_id).gte('date', t30).order('date', { ascending: true }).limit(1).maybeSingle();
        const { data: bio60 } = await db.from('bio_optimization_history').select('score, date').eq('user_id', rec.user_id).gte('date', t60).order('date', { ascending: true }).limit(1).maybeSingle();

        const ageBr = ageBracket((prof as ProfileRow | null)?.age ?? null);
        const sexBr = sexBracket((prof as ProfileRow | null)?.sex ?? null);

        // PRIVACY enforcement: do NOT include user_id in any insert
        const { error: insertErr } = await db.from('ultrathink_outcome_tracker').insert({
          recommendation_hash: recHash,
          product_name: rec.product_name,
          condition_pattern: rec.condition_pattern ?? 'unknown',
          age_bracket: ageBr,
          sex_bracket: sexBr,
          bio_score_before: (bioBefore as BioRow).score,
          bio_score_after_30d: (bio30 as BioRow | null)?.score ?? null,
          bio_score_after_60d: (bio60 as BioRow | null)?.score ?? null,
          recommendation_at: rec.created_at,
        });
        if (insertErr) { errors++; console.warn(`snapshot ${rec.id}: ${insertErr.message}`); continue; }
        snapshotted++;
      } catch (e) {
        errors++;
        console.warn(`rec ${rec.id}: ${(e as Error).message}`);
      }
      processed++;
    }

    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'outcome_collector', p_action: 'collect_batch',
      p_in: recs.length, p_added: snapshotted, p_skipped: skipped, p_error: errors,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: errors > 0 ? 'partial' : 'ok', p_err_msg: null,
      p_metadata: { processed },
    });
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'ultrathink_outcome_collector', p_run_id: runId,
      p_event_type: 'complete', p_payload: { snapshotted, processed }, p_severity: 'info',
    }).then(() => {}, () => {});

    return json({ ok: true, run_id: runId, processed, snapshotted, skipped, errors });
  } catch (e) {
    const msg = (e as Error).message;
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'outcome_collector', p_action: 'fatal',
      p_in: 0, p_added: snapshotted, p_skipped: skipped, p_error: errors + 1,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'error', p_err_msg: msg, p_metadata: {},
    });
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'ultrathink_outcome_collector', p_run_id: runId,
      p_event_type: 'error', p_payload: { error: msg }, p_severity: 'error',
    }).then(() => {}, () => {});
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});
