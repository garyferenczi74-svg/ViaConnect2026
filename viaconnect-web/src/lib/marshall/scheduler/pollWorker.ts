// Prompt #125 P2: Periodic poll worker.
//
// For platforms with weak or no webhook support (Later, Planoly) and as
// a fallback for all platforms, a cron-driven poller reads
// scheduler_poll_state, dispatches to each due connection's adapter to
// fetch the current scheduled queue, and synthesizes SchedulerEvent
// records that flow through the same orchestrator path as webhook
// events.
//
// Cadence: every 5 minutes per connection. Backoff on consecutive
// errors: 5m -> 10m -> 20m -> 40m capped at 1h. A successful poll
// resets the error counter.

import type { SupabaseClient } from '@supabase/supabase-js';
import { schedulerLogger } from './logging';
import type { SchedulerConnection } from './types';

const BASE_CADENCE_MS = 5 * 60 * 1000;
const MAX_CADENCE_MS = 60 * 60 * 1000;

export interface PollDueRow {
  id: string;
  connection_id: string;
  last_poll_at: string | null;
  last_poll_success_at: string | null;
  consecutive_errors: number;
  next_poll_at: string;
}

export interface PollTickResult {
  outcome: 'success' | 'error' | 'skipped_disconnected';
  nextPollAt: string;
  errorMessage?: string;
}

export interface PollTickInput {
  supabase: SupabaseClient;
  connection: SchedulerConnection;
  poll: (connection: SchedulerConnection) => Promise<{ ok: true } | { ok: false; error: string }>;
  now?: Date;
}

export async function runPollTick(input: PollTickInput): Promise<PollTickResult> {
  const now = input.now ?? new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = input.supabase as any;

  if (!input.connection.active) {
    const nextPollAt = new Date(now.getTime() + BASE_CADENCE_MS).toISOString();
    await sb
      .from('scheduler_poll_state')
      .upsert(
        {
          connection_id: input.connection.id,
          last_poll_at: now.toISOString(),
          next_poll_at: nextPollAt,
        },
        { onConflict: 'connection_id' },
      );
    return { outcome: 'skipped_disconnected', nextPollAt };
  }

  const result = await input.poll(input.connection);

  const { data: existing } = await sb
    .from('scheduler_poll_state')
    .select('consecutive_errors')
    .eq('connection_id', input.connection.id)
    .maybeSingle();
  const prevErrors = (existing as { consecutive_errors?: number } | null)?.consecutive_errors ?? 0;

  if (result.ok) {
    const nextPollAt = new Date(now.getTime() + BASE_CADENCE_MS).toISOString();
    await sb
      .from('scheduler_poll_state')
      .upsert(
        {
          connection_id: input.connection.id,
          last_poll_at: now.toISOString(),
          last_poll_success_at: now.toISOString(),
          consecutive_errors: 0,
          last_error_message: null,
          next_poll_at: nextPollAt,
        },
        { onConflict: 'connection_id' },
      );
    return { outcome: 'success', nextPollAt };
  }

  const nextErrors = prevErrors + 1;
  const backoffMs = Math.min(BASE_CADENCE_MS * 2 ** Math.max(0, nextErrors - 1), MAX_CADENCE_MS);
  const nextPollAt = new Date(now.getTime() + backoffMs).toISOString();
  await sb
    .from('scheduler_poll_state')
    .upsert(
      {
        connection_id: input.connection.id,
        last_poll_at: now.toISOString(),
        consecutive_errors: nextErrors,
        last_error_message: result.error,
        next_poll_at: nextPollAt,
      },
      { onConflict: 'connection_id' },
    );
  schedulerLogger.warn('[poll] tick error', {
    platform: input.connection.platform,
    connectionId: input.connection.id,
    consecutiveErrors: nextErrors,
    backoffMs,
  });
  return { outcome: 'error', nextPollAt, errorMessage: result.error };
}

/**
 * Compute the backoff-capped next_poll_at for a given error streak. Pure
 * helper so the cron scheduler can plan batches.
 */
export function computeBackoff(consecutiveErrors: number, now: Date = new Date()): string {
  const safeStreak = Math.max(0, consecutiveErrors);
  const backoffMs = Math.min(BASE_CADENCE_MS * 2 ** Math.max(0, safeStreak - 1), MAX_CADENCE_MS);
  const ms = safeStreak === 0 ? BASE_CADENCE_MS : backoffMs;
  return new Date(now.getTime() + ms).toISOString();
}
