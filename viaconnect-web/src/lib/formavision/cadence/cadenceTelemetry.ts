// Prompt 211a Workstream 4 (Part 2) - Cadence UI telemetry (coarse, PII-clean).
//
// Three coarse events into analytics_events, mirroring avatarTelemetry.ts:
//   * formavision.reminder_opt_in       { optedIn, timeOfDay }
//   * formavision.streak_length         { streakLength, milestone }
//   * formavision.fingerprint_consistency_score  { score, isOutlier }
//
// Hard rules (same as avatarTelemetry): fail-open (a telemetry failure must
// never reach the UI), no new dependencies (supabase/client + safe-log only),
// no dashes, no emojis, zero any. Payloads are COARSE and PII-clean: a bucketed
// score, a small integer streak, booleans. No health numbers, no user copy, no
// dates. The pure buildCadenceEventPayload has no side effects and is unit
// testable without mocking.

import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';
import type { Json } from '@/lib/supabase/types';

/** The three coarse cadence events, namespaced under "formavision.". */
export type CadenceTelemetryEvent =
  | 'formavision.reminder_opt_in'
  | 'formavision.streak_length'
  | 'formavision.fingerprint_consistency_score';

/** Runtime exhaustiveness backstop. Length must equal the union size (3). */
export const ALL_CADENCE_EVENTS: CadenceTelemetryEvent[] = [
  'formavision.reminder_opt_in',
  'formavision.streak_length',
  'formavision.fingerprint_consistency_score',
];

if (ALL_CADENCE_EVENTS.length !== 3) {
  throw new Error(
    `CadenceTelemetryEvent exhaustiveness error: expected 3 events, got ${ALL_CADENCE_EVENTS.length}.`,
  );
}

/** Serializable properties. Assignable to analytics_events.properties (Json). */
export type CadenceEventProperties = Record<string, Json>;

const DEFAULT_PAGE = '/body-tracker/composition';

export interface CadenceEventPayload {
  event: CadenceTelemetryEvent;
  properties: CadenceEventProperties;
  page: string;
}

/**
 * Buckets a consistency score in [0,1] into a coarse band so telemetry never
 * carries a precise per-user signal. null (UNKNOWN history) becomes 'unknown'.
 */
export function bucketConsistencyScore(score: number | null): string {
  if (score === null) return 'unknown';
  if (score < 0.34) return 'low';
  if (score < 0.67) return 'medium';
  return 'high';
}

/**
 * Pure builder for the analytics_events insert payload (minus user_id). No
 * Date.now(), no supabase, no side effects. Safe in tests without mocking.
 */
export function buildCadenceEventPayload(
  event: CadenceTelemetryEvent,
  properties: CadenceEventProperties = {},
): CadenceEventPayload {
  return { event, properties, page: DEFAULT_PAGE };
}

/**
 * Emits one cadence telemetry event to analytics_events. Fail-open:
 *   * falsy userId => no insert (auth not resolved yet).
 *   * insert failure => safeLog.warn and return; never throws or rejects.
 * Fire-and-forget; the caller need not await for correctness.
 */
export async function emitCadenceEvent(
  userId: string | null | undefined,
  event: CadenceTelemetryEvent,
  properties: CadenceEventProperties = {},
): Promise<void> {
  if (!userId) return;
  try {
    const payload = buildCadenceEventPayload(event, properties);
    const supabase = createClient();
    const { error } = await supabase.from('analytics_events').insert({
      user_id: userId,
      event: payload.event,
      properties: payload.properties,
      page: payload.page,
    });
    if (error) {
      safeLog.warn('cadenceTelemetry', 'analytics insert failed, failing open', {
        event,
        error: error.message,
      });
    }
  } catch (err) {
    safeLog.warn('cadenceTelemetry', 'emit failed, failing open', {
      event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
