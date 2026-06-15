// BOS compute worker. Drains bos_compute_queue every 5 minutes.
//
// Phase D of bundled Prompts #159 + #161, patched in Phase F-patch:
//   1. Verifies Bearer CRON_SECRET via timing-safe comparison.
//   2. Atomically claims up to CLAIM_LIMIT events via the §8b RPC
//      claim_bos_compute_batch (sentinel-marks them in one shot so
//      concurrent invocations cannot double-claim).
//   3. Groups claimed events by user_id, processes at most
//      MAX_USERS_PER_DRAIN users per invocation, and releases any
//      over-claimed user batches back to the queue for the next cron.
//   4. Per processed user:
//      a. If any event carries bypass_cooldown=true, skip the cooldown.
//      b. Otherwise, check isInCooldown; if true, release the claimed
//         events so the next drain can retry them.
//      c. Pick the most-recent event (by enqueued_at) as the compute
//         trigger; pass its source + event_id + payload to computeBOS.
//      d. Mark every event in the batch as processed on success, or
//         errored on any failure. On error, markEventsErrored releases
//         processed_at = NULL and bumps retry_count for the next cron.
//   5. Returns a JSON summary { processed_users, results }.
//
// The worker is intentionally non-edge so the compute module's
// Anthropic SDK runs in a Node.js context.

import { timingSafeEqual } from 'node:crypto';
import {
  claimBOSComputeBatch,
  releaseClaimedEvents,
  markEventsProcessed,
  markEventsErrored,
} from '@/lib/scoring/queue';
import { isInCooldown } from '@/lib/scoring/cooldown';
import { computeBOS } from '@/lib/scoring/bio-optimization-score';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BOSTriggerEvent, QueuedEvent, WorkerUserResult } from '@/lib/scoring/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Prompt 196d (2026-06-15): this worker computes BOS serially per user, each
// call invoking the Anthropic API (several seconds). The Vercel default
// function duration (15s) is far too short to drain a multi-user batch, so a
// run can be killed mid-compute and never persist a score. Give it room.
export const maxDuration = 300;

// Cap on rows claimed in one RPC call. Sized to cover the typical 5
// events-per-user assumption across MAX_USERS_PER_DRAIN users with
// headroom; the §8b RPC enforces an absolute ceiling of 1000.
const CLAIM_LIMIT = 250;

// Cap on users processed per cron tick. Bounds Hannah API spend and
// keeps total drain time inside the Vercel function ceiling.
const MAX_USERS_PER_DRAIN = 50;

const BEARER_PREFIX = 'Bearer ';

function isAuthorized(headerValue: string | null): boolean {
  const expected = `${BEARER_PREFIX}${process.env.CRON_SECRET ?? ''}`;
  const actual = headerValue ?? '';
  if (expected.length <= BEARER_PREFIX.length) {
    // CRON_SECRET unset or empty -> reject every request, including the
    // attacker who sends "Authorization: Bearer ".
    return false;
  }
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(actual, 'utf8'),
    Buffer.from(expected, 'utf8'),
  );
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Atomic batch claim via §8b RPC. Sentinel-marks every returned row
  //    so concurrent worker invocations cannot double-claim.
  const claimed = await claimBOSComputeBatch(supabase, CLAIM_LIMIT);

  // 2. Group claimed events by user_id.
  const grouped = new Map<string, QueuedEvent[]>();
  for (const event of claimed) {
    const bucket = grouped.get(event.user_id);
    if (bucket) {
      bucket.push(event);
    } else {
      grouped.set(event.user_id, [event]);
    }
  }

  // 3. Apply the per-drain user cap. Over-claimed user batches go back
  //    to the queue via releaseClaimedEvents so the next cron retries.
  const userIds = Array.from(grouped.keys());
  const usersToProcess = userIds.slice(0, MAX_USERS_PER_DRAIN);
  const usersToRelease = userIds.slice(MAX_USERS_PER_DRAIN);

  if (usersToRelease.length > 0) {
    const releaseIds: string[] = [];
    for (const uid of usersToRelease) {
      const batch = grouped.get(uid);
      if (batch) {
        for (const evt of batch) releaseIds.push(evt.id);
      }
    }
    if (releaseIds.length > 0) {
      await releaseClaimedEvents(releaseIds, supabase);
    }
  }

  const results: WorkerUserResult[] = [];

  for (const userId of usersToProcess) {
    const events = grouped.get(userId)!;
    const bypass = events.some((e) => e.bypass_cooldown);

    if (!bypass) {
      const cooldown = await isInCooldown(userId, supabase);
      if (cooldown.in_cooldown) {
        // Release the claimed batch back to the queue so the next cron
        // tick re-evaluates the cooldown.
        await releaseClaimedEvents(events.map((e) => e.id), supabase);
        results.push({
          userId,
          status: 'skipped_cooldown',
          minutes_remaining: cooldown.minutes_remaining,
        });
        continue;
      }
    }

    const latestEvent = pickLatestEvent(events);
    const trigger: BOSTriggerEvent = {
      userId,
      source: latestEvent.source,
      eventId: latestEvent.event_id ?? undefined,
      payload: latestEvent.payload,
      bypassCooldown: bypass,
    };

    try {
      await computeBOS(userId, trigger);
      await markEventsProcessed(events.map((e) => e.id), supabase);
      results.push({ userId, status: 'computed', event_count: events.length });
    } catch (err) {
      // Prompt 196d (2026-06-15): capture err.cause too. The Anthropic SDK
      // throws APIConnectionError with the generic message "Connection error."
      // and the actual reason (ENOTFOUND, ECONNREFUSED, a bad base URL,
      // timeout) only on .cause; without it the stored processing_error is
      // undiagnosable.
      let message = err instanceof Error ? err.message : 'unknown';
      const cause = (err as { cause?: unknown })?.cause;
      if (cause) {
        const code = (cause as { code?: string; message?: string })?.code
          ?? (cause as { message?: string })?.message
          ?? String(cause);
        message = `${message} [cause: ${code}]`;
      }
      // markEventsErrored releases processed_at = NULL and bumps
      // retry_count; the §8b RPC's retry_count < 5 ceiling prevents
      // infinite loops.
      await markEventsErrored(events.map((e) => e.id), message, supabase);
      results.push({ userId, status: 'error', error: message });
    }
  }

  return Response.json({ processed_users: results.length, results });
}

function pickLatestEvent(events: QueuedEvent[]): QueuedEvent {
  return events.slice().sort(
    (a, b) => new Date(b.enqueued_at).getTime() - new Date(a.enqueued_at).getTime(),
  )[0];
}
