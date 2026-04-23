// =============================================================================
// arnold-tick Edge Function
// =============================================================================
// Periodic supervisor sweep for the Arnold ecosystem. Triggered by pg_cron
// every 30 minutes. Responsibilities:
//   1. Heartbeat to ultrathink_agent_registry so Jeffery can see Arnold alive.
//   2. Find users whose body_tracker_entries changed since last sweep but whose
//      body_tracker_scores are stale; queue an agent_messages row so the
//      recommender (or Hannah, on next chat) can pick them up.
//   3. Find body_photo_sessions stuck in arnold_status='analyzing' for > 30 min
//      and mark them failed so they do not stay pending forever.
//
// Idempotent. Safe to run on overlap.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

async function heartbeat(db: SupabaseClient, runId: string, ok: boolean, payload: Record<string, unknown>) {
  try {
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'arnold',
      p_run_id: runId,
      p_event_type: ok ? 'heartbeat' : 'error',
      p_payload: payload,
      p_severity: ok ? 'info' : 'warning',
    });
  } catch (e) {
    console.warn('[arnold-tick] heartbeat failed', (e as Error).message);
  }
}

// Emit a message into Jeffery's Command Center feed via the SECURITY DEFINER
// RPC, so Arnold's work surfaces in /admin/jeffery alongside every other agent.
async function emitJeffery(db: SupabaseClient, input: {
  category: string;
  severity: 'info' | 'advisory' | 'review_required' | 'critical';
  title: string;
  summary: string;
  detail: Record<string, unknown>;
  proposedAction?: Record<string, unknown>;
}) {
  try {
    await db.rpc('jeffery_emit_message', {
      p_category: input.category,
      p_severity: input.severity,
      p_title: input.title,
      p_summary: input.summary,
      p_detail: input.detail,
      p_source_agent: 'arnold',
      p_source_context: null,
      p_proposed_action: input.proposedAction ?? null,
    });
  } catch (e) {
    console.warn('[arnold-tick] jeffery emit failed', (e as Error).message);
  }
}

async function sweepStaleScores(db: SupabaseClient): Promise<number> {
  // Users with entries newer than their latest score row need a recompute.
  const { data: entriesRecent } = await db
    .from('body_tracker_entries')
    .select('user_id, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq('is_active', true)
    .limit(500);

  const userIds = Array.from(new Set((entriesRecent ?? []).map((r: any) => r.user_id as string)));
  let queued = 0;
  for (const uid of userIds) {
    await db.from('agent_messages').insert({
      from_agent: 'arnold',
      to_agent: 'jeffery',
      message_type: 'recompute_requested',
      user_id: uid,
      payload: { reason: 'entries_changed_within_24h' },
      status: 'pending',
    });
    queued++;
  }
  return queued;
}

async function failStuckSessions(db: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await db
    .from('body_photo_sessions')
    .select('id, user_id, created_at')
    .eq('arnold_status', 'analyzing')
    .lt('created_at', cutoff);

  const stuck = (data ?? []) as Array<{ id: string; user_id: string; created_at: string }>;
  for (const s of stuck) {
    await db
      .from('body_photo_sessions')
      .update({
        arnold_status: 'failed',
        arnold_error: 'Stuck in analyzing for >30m; marked failed by arnold-tick.',
      })
      .eq('id', s.id);

    await db.from('agent_messages').insert({
      from_agent: 'arnold',
      to_agent: 'jeffery',
      message_type: 'vision_session_stuck',
      user_id: s.user_id,
      payload: { sessionId: s.id, createdAt: s.created_at },
      status: 'pending',
    });
  }
  return stuck.length;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const queued = await sweepStaleScores(db);
    const stuckFailed = await failStuckSessions(db);

    await heartbeat(db, runId, true, {
      queuedRecomputes: queued,
      stuckSessionsFailed: stuckFailed,
      durationMs: Date.now() - startedAt,
    });

    // Surface sweep activity in Jeffery's Live Feed. Stuck sessions are
    // treated as review_required (potential scan pipeline issue); a clean
    // sweep with queued recomputes is info; an idle sweep is skipped.
    if (stuckFailed > 0) {
      await emitJeffery(db, {
        category: 'error_escalation',
        severity: 'critical',
        title: `Arnold failed ${stuckFailed} stuck vision session${stuckFailed === 1 ? '' : 's'}`,
        summary: `${stuckFailed} body_photo_session row${stuckFailed === 1 ? '' : 's'} stayed in analyzing state over 30m; marked failed.`,
        detail: { runId, stuckSessionsFailed: stuckFailed, queuedRecomputes: queued },
      });
    } else if (queued > 0) {
      await emitJeffery(db, {
        category: 'data_ingestion',
        severity: 'info',
        title: `Arnold queued ${queued} score recompute${queued === 1 ? '' : 's'}`,
        summary: `Detected ${queued} user${queued === 1 ? '' : 's'} with fresh body_tracker entries; queued for score recompute.`,
        detail: { runId, queuedRecomputes: queued, durationMs: Date.now() - startedAt },
      });
    }

    return json({
      status: 'ok',
      runId,
      queuedRecomputes: queued,
      stuckSessionsFailed: stuckFailed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await heartbeat(db, runId, false, { error: msg });
    await emitJeffery(db, {
      category: 'error_escalation',
      severity: 'critical',
      title: 'Arnold tick failed',
      summary: msg,
      detail: { runId, error: msg },
    });
    return json({ status: 'failed', error: msg }, 500);
  }
});
