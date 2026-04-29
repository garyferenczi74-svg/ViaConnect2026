// =============================================================================
// cert-reminder-tick Edge Function
// =============================================================================
// Daily sweep over practitioner_certifications to:
//   1. Auto-expire any 'certified' row whose expires_at is in the past.
//   2. Enqueue a reminder email for each row sitting at 90/60/30/14/7/1
//      days before expiry. Reminders are idempotent: each (cert_id, offset)
//      tuple is dispatched at most once.
//
// Email transport: Supabase only. Reminders share the
// practitioner_email_queue from Phase 1; the mailer Edge Function picks
// them up on its own cron tick.
//
// Heartbeats to ultrathink_agent_registry on every successful run so
// Jeffery can monitor liveness.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const REMINDER_OFFSETS = [90, 60, 30, 14, 7, 1] as const;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  });
}

async function heartbeat(
  db: SupabaseClient,
  runId: string,
  ok: boolean,
  payload: Record<string, unknown>,
) {
  try {
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'cert-reminder-tick',
      p_run_id: runId,
      p_event_type: ok ? 'heartbeat' : 'error',
      p_payload: payload,
      p_severity: ok ? 'info' : 'warning',
    });
  } catch (e) {
    console.warn('[cert-reminder-tick] heartbeat failed', (e as Error).message);
  }
}

interface CertRow {
  id: string;
  practitioner_id: string;
  certification_level_id: string;
  status: string;
  expires_at: string | null;
}

async function expireLapsed(db: SupabaseClient): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from('practitioner_certifications')
    .select('id')
    .eq('status', 'certified')
    .lt('expires_at', nowIso);
  const lapsed = (data ?? []) as Array<{ id: string }>;
  if (lapsed.length === 0) return 0;
  const ids = lapsed.map((r) => r.id);
  await db
    .from('practitioner_certifications')
    .update({ status: 'expired' })
    .in('id', ids);
  return lapsed.length;
}

async function sweepReminders(db: SupabaseClient): Promise<number> {
  const now = Date.now();
  const farthestEdge = new Date(now + (REMINDER_OFFSETS[0] + 1) * ONE_DAY_MS).toISOString();
  const nearestEdge  = new Date(now).toISOString();

  const { data } = await db
    .from('practitioner_certifications')
    .select('id, practitioner_id, certification_level_id, status, expires_at')
    .eq('status', 'certified')
    .gte('expires_at', nearestEdge)
    .lte('expires_at', farthestEdge);

  const rows = (data ?? []) as CertRow[];
  let queued = 0;

  for (const r of rows) {
    if (!r.expires_at) continue;
    const days = Math.round((new Date(r.expires_at).getTime() - now) / ONE_DAY_MS);
    if (!REMINDER_OFFSETS.includes(days as typeof REMINDER_OFFSETS[number])) continue;

    const reminderKey = `cert:${r.id}:${days}`;

    // agent_messages doubles as our idempotency log: a single row per
    // (cert_id, offset) so we never double-dispatch.
    const { data: existing } = await db
      .from('agent_messages')
      .select('id')
      .eq('from_agent', 'jeffery')
      .eq('message_type', 'cert_recert_reminder')
      .contains('payload', { reminder_key: reminderKey })
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    await db.from('agent_messages').insert({
      from_agent: 'jeffery',
      to_agent: 'jeffery',
      message_type: 'cert_recert_reminder',
      user_id: null,
      payload: {
        reminder_key: reminderKey,
        certification_id: r.id,
        practitioner_id: r.practitioner_id,
        certification_level_id: r.certification_level_id,
        days_until_expiry: days,
        expires_at: r.expires_at,
      },
      status: 'pending',
    });
    queued++;
  }

  return queued;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const expired = await expireLapsed(db);
    const queued = await sweepReminders(db);
    await heartbeat(db, runId, true, {
      expired,
      queued,
      durationMs: Date.now() - startedAt,
    });
    return json({ status: 'ok', runId, expired, queued });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (isTimeoutError(e)) safeLog.warn('cert-reminder-tick', 'sweep timeout', { runId, error: e });
    else safeLog.error('cert-reminder-tick', 'sweep failed', { runId, error: e });
    await heartbeat(db, runId, false, { error: msg });
    return json({ status: 'failed', error: msg }, 500);
  }
});
