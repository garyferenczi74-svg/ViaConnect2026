// Bio Optimization Score compute queue helpers.
//
// Reads / writes bos_compute_queue (created in
// supabase/migrations/20260512020236_bos_compute_v2.sql §10 + §8b RPC).
//
// Functions:
//   enqueueBOSCompute               -> insert one row
//   claimBOSComputeBatch            -> atomic batch claim via RPC (§8b)
//   releaseClaimedEvents            -> release sentinel-claimed rows
//   fetchUnprocessedEventsGrouped   -> legacy drain helper (pre-Phase F)
//   markEventsProcessed             -> finish a successful batch
//   markEventsErrored               -> release on error + bump retry_count

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BOSTriggerSource, QueuedEvent } from './types';

export interface EnqueueParams {
  userId: string;
  source: BOSTriggerSource;
  event_id?: string;
  payload?: Record<string, unknown>;
  bypass_cooldown?: boolean;
  supabase: SupabaseClient;
}

export async function enqueueBOSCompute(params: EnqueueParams): Promise<{ queued_id: string }> {
  const { data, error } = await params.supabase
    .from('bos_compute_queue')
    .insert({
      user_id: params.userId,
      source: params.source,
      event_id: params.event_id ?? null,
      payload: params.payload ?? {},
      bypass_cooldown: params.bypass_cooldown ?? false,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to enqueue BOS compute: ${error.message ?? String(error)}`);
  }

  return { queued_id: (data as { id: string }).id };
}

/**
 * Atomically claims a batch of unprocessed queue rows via the §8b RPC
 * claim_bos_compute_batch. Claimed rows are sentinel-marked
 * (processed_at = '9999-01-01 00:00:00+00') so concurrent workers cannot
 * double-claim. The caller must overwrite processed_at with now() on
 * success (markEventsProcessed) or NULL on failure (markEventsErrored
 * or releaseClaimedEvents).
 */
export async function claimBOSComputeBatch(
  supabase: SupabaseClient,
  limit: number,
): Promise<QueuedEvent[]> {
  const { data, error } = await supabase.rpc('claim_bos_compute_batch', {
    p_limit: limit,
  });
  if (error) {
    throw new Error(`claimBOSComputeBatch failed: ${error.message ?? String(error)}`);
  }
  return (data ?? []) as QueuedEvent[];
}

/**
 * Releases sentinel-claimed rows back to the unprocessed pool by
 * resetting processed_at to NULL. Used when the worker over-claimed
 * beyond its per-drain cap; the released rows return to the queue for
 * the next cron tick.
 */
export async function releaseClaimedEvents(
  ids: string[],
  supabase: SupabaseClient,
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('bos_compute_queue')
    .update({ processed_at: null })
    .in('id', ids);
  if (error) {
    throw new Error(`releaseClaimedEvents failed: ${error.message ?? String(error)}`);
  }
}

export async function fetchUnprocessedEventsGroupedByUser(
  supabase: SupabaseClient,
  limit: number,
): Promise<Map<string, QueuedEvent[]>> {
  // #161a Item 6: cap is applied on the Supabase chain via .limit so
  // the database returns at most `limit` rows. The prior implementation
  // pulled the full unprocessed set then sliced in JS, which was both a
  // memory hazard for large backlogs and inconsistent with the FIFO
  // intent on a per drain basis.
  const { data, error } = await supabase
    .from('bos_compute_queue')
    .select('*')
    .is('processed_at', null)
    .order('enqueued_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch unprocessed BOS events: ${error.message ?? String(error)}`);
  }

  const rows = (data ?? []) as QueuedEvent[];
  const grouped = new Map<string, QueuedEvent[]>();
  for (const row of rows) {
    const existing = grouped.get(row.user_id) ?? [];
    existing.push(row);
    grouped.set(row.user_id, existing);
  }
  return grouped;
}

export async function markEventsProcessed(
  ids: string[],
  supabase: SupabaseClient,
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('bos_compute_queue')
    .update({ processed_at: new Date().toISOString() })
    .in('id', ids);
  if (error) {
    throw new Error(`Failed to mark BOS events processed: ${error.message ?? String(error)}`);
  }
}

export async function markEventsErrored(
  ids: string[],
  error_message: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (ids.length === 0) return;
  // Phase F-patch: rows reaching this helper were sentinel-claimed by
  // claim_bos_compute_batch (processed_at = '9999-01-01...'). On error
  // we MUST release them (processed_at = NULL) so the next cron tick
  // retries them, subject to the retry_count < 5 ceiling enforced by
  // the §8b RPC. We also bump retry_count via a per-row read because
  // the supabase-js v2 client has no first-class column-arithmetic
  // primitive; the prior implementation hard-set retry_count = 1, which
  // erased history and let infinitely-failing rows escape the ceiling.
  const { data: existing, error: readErr } = await supabase
    .from('bos_compute_queue')
    .select('id, retry_count')
    .in('id', ids);
  if (readErr) {
    throw new Error(`Failed to read BOS events for errored bump: ${readErr.message ?? String(readErr)}`);
  }

  for (const row of (existing ?? []) as Array<{ id: string; retry_count: number | null }>) {
    const nextRetry = (row.retry_count ?? 0) + 1;
    const { error: updErr } = await supabase
      .from('bos_compute_queue')
      .update({
        processed_at: null,
        processing_error: error_message,
        retry_count: nextRetry,
      })
      .eq('id', row.id);
    if (updErr) {
      throw new Error(`Failed to mark BOS event ${row.id} errored: ${updErr.message ?? String(updErr)}`);
    }
  }
}
