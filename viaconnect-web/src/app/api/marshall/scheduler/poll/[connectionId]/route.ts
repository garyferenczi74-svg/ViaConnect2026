// Prompt #125 P7: Poll tick endpoint.
//
// POST /api/marshall/scheduler/poll/{connectionId}
//
// Invoked by the cron scheduler (Vercel cron or pg_cron) for a
// specific connection. Auth is a shared secret header
// `x-scheduler-poll-secret` matched against SCHEDULER_POLL_SECRET
// env (simple bearer for server-to-server cron, no user session).
//
// Behavior:
//   1. Load the connection (active only).
//   2. Materialize the OAuth bundle from Vault.
//   3. Route to the platform-specific poll implementation. For Later
//      we list the scheduled queue and synthesize a SchedulerEvent
//      per post so the orchestrator is the single entry point for
//      both webhook and poll ingress.
//   4. Dispatch each synthesized event into scheduler_events with
//      idempotency (UNIQUE platform+external_event_id already prevents
//      duplicate scans on re-tick).
//   5. Update scheduler_poll_state via runPollTick's bookkeeping.

import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchLaterQueue } from '@/lib/marshall/scheduler/adapters/later';
import { supabaseTokenVault } from '@/lib/marshall/scheduler/tokenVault';
import { runPollTick } from '@/lib/marshall/scheduler/pollWorker';
import { schedulerLogger } from '@/lib/marshall/scheduler/logging';
import type { SchedulerConnection, SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const runtime = 'nodejs';

function authorize(req: NextRequest): boolean {
  const expected = process.env.SCHEDULER_POLL_SECRET;
  if (!expected) return false;
  const given = req.headers.get('x-scheduler-poll-secret') ?? '';
  if (given.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(given, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest, { params }: { params: { connectionId: string } }) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'poll_auth_required' }, { status: 401 });
  }
  const connectionId = (params.connectionId ?? '').trim();
  if (!connectionId) return NextResponse.json({ error: 'missing_connection_id' }, { status: 400 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  const { data: row, error: readErr } = await sb
    .from('scheduler_connections')
    .select('id, practitioner_id, platform, external_account_id, external_account_label, scopes_granted, token_vault_ref, active, connected_at, last_verified_at, last_event_at')
    .eq('id', connectionId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const connection: SchedulerConnection = {
    id: row.id,
    practitionerId: row.practitioner_id,
    platform: row.platform as SchedulerPlatform,
    externalAccountId: row.external_account_id,
    externalAccountLabel: row.external_account_label,
    scopesGranted: row.scopes_granted ?? [],
    tokenVaultRef: row.token_vault_ref,
    active: row.active,
    connectedAt: row.connected_at,
    lastVerifiedAt: row.last_verified_at,
    lastEventAt: row.last_event_at,
  };

  const vault = supabaseTokenVault(admin);

  const poll = async (conn: SchedulerConnection): Promise<{ ok: true } | { ok: false; error: string }> => {
    let accessToken: string;
    try {
      const bundle = await vault.read(conn.tokenVaultRef, `scheduler:${conn.platform}:poll`);
      accessToken = bundle.accessToken;
    } catch (err) {
      return { ok: false, error: `vault_read_failed:${(err as Error).message}` };
    }

    try {
      if (conn.platform === 'later') {
        const queue = await fetchLaterQueue(accessToken);
        // Synthesize a SchedulerEvent per queued post. The idempotency
        // key is (platform, external_event_id) and we derive event_id
        // as 'poll:<post_id>' so repeated ticks on the same post dedup
        // via the UNIQUE constraint.
        for (const post of queue) {
          const externalEventId = `poll:${post.id}`;
          const { error } = await sb
            .from('scheduler_events')
            .insert({
              platform: 'later',
              external_event_id: externalEventId,
              event_type: 'poll.tick',
              connection_id: conn.id,
              external_post_id: post.id,
              raw_payload: { synthesized_from_poll: true, post_id: post.id, scheduled_at: post.scheduled_at },
              processing_status: 'pending',
            });
          // 23505 conflict = already synthesized on a prior tick, fine.
          if (error && error.code !== '23505' && !/unique|duplicate/i.test(error.message ?? '')) {
            return { ok: false, error: `later_event_insert:${error.code ?? 'unknown'}` };
          }
        }
        return { ok: true };
      }
      // Other platforms go through webhook ingest, so a poll tick for
      // them is a no-op health check.
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  try {
    const outcome = await runPollTick({ supabase: admin, connection, poll });
    if (outcome.outcome === 'error') {
      schedulerLogger.warn('[poll] tick errored', { connectionId, error: outcome.errorMessage });
    }
    return NextResponse.json({
      ok: outcome.outcome !== 'error',
      outcome: outcome.outcome,
      nextPollAt: outcome.nextPollAt,
      errorMessage: outcome.errorMessage,
    });
  } catch (err) {
    return NextResponse.json({ error: 'poll_tick_failed', detail: (err as Error).message }, { status: 500 });
  }
}
