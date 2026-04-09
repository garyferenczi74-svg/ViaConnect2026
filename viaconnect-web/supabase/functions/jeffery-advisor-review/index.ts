// =============================================================================
// jeffery-advisor-review (Prompt #60b — Section 3C)
// =============================================================================
// Extension of jeffery-self-evolution. Walks the past 7 days of advisor
// activity per role (consumer / practitioner / naturopath), computes quality
// metrics, compares to a 30-day rolling baseline, writes one
// ultrathink_advisor_evolution_reports row per role per week.
//
// If user satisfaction drops > 15% week-over-week, Jeffery inserts a
// behavioral nudge into ultrathink_jeffery_advisor_config that the next
// advisor request will inherit.
//
// Triggered by jeffery_advisor_review_cron (Sundays 2:30 AM UTC, 30 min after
// the main self-evolution sweep so the agent_snapshot rows already exist).
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SATISFACTION_DROP_THRESHOLD = 0.15;
const ESCALATION_RATE_THRESHOLD = 0.25;

const ROLES: Array<'consumer' | 'practitioner' | 'naturopath'> = ['consumer', 'practitioner', 'naturopath'];

interface ConvRow {
  message_role: string;
  response_length: number | null;
  escalated: boolean;
  guardrail_triggered: boolean;
  category: string | null;
  created_at: string;
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
}

async function metricsFor(db: SupabaseClient, role: string, sinceIso: string) {
  const { data: convs } = await db
    .from('ultrathink_advisor_conversations')
    .select('message_role, response_length, escalated, guardrail_triggered, category, created_at')
    .eq('advisor_role', role)
    .gte('created_at', sinceIso);

  const rows = (convs ?? []) as ConvRow[];
  const assistantRows = rows.filter(r => r.message_role === 'assistant');
  const userTurns = rows.filter(r => r.message_role === 'user').length;

  // Pull ratings linked to these conversations
  const { data: ratings } = await db
    .from('ultrathink_advisor_ratings')
    .select('rating, created_at')
    .gte('created_at', sinceIso);

  const ratingValues = (ratings ?? []).map(r => Number(r.rating)).filter(n => !Number.isNaN(n));
  const avgRating = ratingValues.length > 0 ? ratingValues.reduce((s, r) => s + r, 0) / ratingValues.length : null;
  const satisfactionRate = ratingValues.length > 0 ? ratingValues.filter(r => r >= 4).length / ratingValues.length : null;

  return {
    total_user_queries: userTurns,
    total_assistant_turns: assistantRows.length,
    avg_response_length: assistantRows.length > 0 ? assistantRows.reduce((s, r) => s + (r.response_length ?? 0), 0) / assistantRows.length : 0,
    escalation_rate: assistantRows.length > 0 ? assistantRows.filter(r => r.escalated).length / assistantRows.length : 0,
    guardrail_triggers: assistantRows.filter(r => r.guardrail_triggered).length,
    rating_count: ratingValues.length,
    avg_rating: avgRating,
    satisfaction_rate: satisfactionRate,
    top_categories: Array.from(new Set(assistantRows.map(r => r.category).filter((c): c is string => !!c))).slice(0, 10),
  };
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  await db.rpc('ultrathink_agent_heartbeat', {
    p_agent_name: 'jeffery_advisor_review', p_run_id: runId,
    p_event_type: 'start', p_payload: {}, p_severity: 'info',
  }).then(() => {}, () => {});

  const reports: Array<Record<string, unknown>> = [];
  const nudgesInserted: Array<{ role: string; reason: string }> = [];

  try {
    const week_ago = new Date(Date.now() - 7 * 86400_000).toISOString();
    const month_ago = new Date(Date.now() - 30 * 86400_000).toISOString();
    const week_starting = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

    for (const role of ROLES) {
      const week = await metricsFor(db, role, week_ago);
      const month = await metricsFor(db, role, month_ago);

      // Detect degradation
      const satisfactionDrop = (month.satisfaction_rate != null && week.satisfaction_rate != null)
        ? (month.satisfaction_rate - week.satisfaction_rate)
        : 0;
      const degradationDetected = satisfactionDrop > SATISFACTION_DROP_THRESHOLD || week.escalation_rate > ESCALATION_RATE_THRESHOLD;

      const actionsTaken: Array<{ action: string; rationale: string }> = [];

      if (degradationDetected) {
        // Insert a behavioral nudge that the next request inherits
        if (satisfactionDrop > SATISFACTION_DROP_THRESHOLD) {
          const instruction = `Increase warmth and empathy. Acknowledge the user's feelings before answering. User satisfaction dropped ${(satisfactionDrop * 100).toFixed(1)}% week-over-week.`;
          const { error: nudgeErr } = await db.from('ultrathink_jeffery_advisor_config').insert({
            role,
            instructions: instruction,
            reason: 'satisfaction_degradation',
            auto_applied: true,
            is_active: true,
          });
          if (!nudgeErr) {
            actionsTaken.push({ action: 'inserted_empathy_nudge', rationale: `satisfaction down ${(satisfactionDrop * 100).toFixed(1)}%` });
            nudgesInserted.push({ role, reason: 'satisfaction_degradation' });
          }
        }
        if (week.escalation_rate > ESCALATION_RATE_THRESHOLD) {
          actionsTaken.push({ action: 'flagged_high_escalation_rate', rationale: `${(week.escalation_rate * 100).toFixed(1)}% of responses escalated` });
        }
      }

      // Upsert weekly evolution report (one per role per week)
      const { error: reportErr } = await db
        .from('ultrathink_advisor_evolution_reports')
        .upsert({
          role,
          week_of: week_starting,
          metrics: { week, month, satisfaction_drop: satisfactionDrop },
          degradation_detected: degradationDetected,
          actions_taken: actionsTaken,
        }, { onConflict: 'role,week_of' });
      if (!reportErr) {
        reports.push({ role, week_starting, degradationDetected, actions: actionsTaken.length, week_queries: week.total_user_queries });
      }
    }

    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'jeffery_advisor_review', p_action: 'weekly_review',
      p_in: ROLES.length, p_added: reports.length, p_skipped: 0, p_error: 0,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'ok', p_err_msg: null,
      p_metadata: { reports, nudges_inserted: nudgesInserted },
    });
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'jeffery_advisor_review', p_run_id: runId,
      p_event_type: 'complete',
      p_payload: { reports: reports.length, nudges: nudgesInserted.length },
      p_severity: 'info',
    }).then(() => {}, () => {});

    return json({ ok: true, run_id: runId, duration_ms: Date.now() - t0, reports, nudges_inserted: nudgesInserted });
  } catch (e) {
    const msg = (e as Error).message;
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'jeffery_advisor_review', p_action: 'fatal',
      p_in: 0, p_added: reports.length, p_skipped: 0, p_error: 1,
      p_cost: 0, p_duration: Date.now() - t0,
      p_status: 'error', p_err_msg: msg, p_metadata: {},
    });
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'jeffery_advisor_review', p_run_id: runId,
      p_event_type: 'error', p_payload: { error: msg }, p_severity: 'error',
    }).then(() => {}, () => {});
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});
