/**
 * src/lib/formavision/noise/noiseTelemetry.ts
 *
 * Prompt 211b Workstream 2 -- within-noise impression telemetry.
 *
 * Tracks how often users see within-noise messaging. This is the explicit
 * retention hypothesis: users who understand that a within-noise result is
 * not failure are more likely to keep scanning.
 *
 * Honesty / privacy rules (non-negotiable):
 *   - NO PHI. No body fat values, no measurement values, no scan dates.
 *   - NO identifiable data. Only counts and coarse flags.
 *   - Counts / flags only: withinNoiseCount, meaningfulCount, totalClassified,
 *     and whether the user saw within-noise messaging in this session (boolean).
 *   - Fail-open: a telemetry failure must never propagate to the UI.
 *   - Same analytics_events sink as avatarTelemetry / reportTelemetry.
 *
 * One event:
 *   formavision.within_noise_shown  -- a within-noise badge was shown for at
 *     least one metric. Properties: withinNoiseCount, meaningfulCount.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any.
 */

import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';
import type { Json } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type NoiseTelemetryEvent = 'formavision.within_noise_shown';

// Coarse, PII-clean counts only. No measurement values, no body fat readings.
export interface NoiseEventProperties {
  /** Number of WITHIN_NOISE classified deltas shown to the user. */
  withinNoiseCount?: number;
  /** Number of MEANINGFUL classified deltas shown to the user. */
  meaningfulCount?: number;
  /** Total classified (withinNoise + meaningful). */
  totalClassified?: number;
}

// ---------------------------------------------------------------------------
// Payload builder (pure, no IO)
// ---------------------------------------------------------------------------

const DEFAULT_PAGE = '/body-tracker/composition';

/**
 * Builds the analytics_events insert payload. Pure: no Date.now, no IO.
 * Properties are a plain Record<string, Json> to match the analytics_events
 * schema without a cast.
 */
export function buildNoiseEventPayload(
  event: NoiseTelemetryEvent,
  properties: NoiseEventProperties = {},
): { event: NoiseTelemetryEvent; properties: Record<string, Json>; page: string } {
  const clean: Record<string, Json> = {};
  if (typeof properties.withinNoiseCount === 'number') {
    clean.withinNoiseCount = properties.withinNoiseCount;
  }
  if (typeof properties.meaningfulCount === 'number') {
    clean.meaningfulCount = properties.meaningfulCount;
  }
  if (typeof properties.totalClassified === 'number') {
    clean.totalClassified = properties.totalClassified;
  }
  return { event, properties: clean, page: DEFAULT_PAGE };
}

// ---------------------------------------------------------------------------
// Emitter (fail-open, fire-and-forget)
// ---------------------------------------------------------------------------

/**
 * Emits one noise telemetry event to analytics_events.
 *
 * Fail-open: returns immediately when userId is falsy, and never rejects on a
 * Supabase failure (logs a warn via safeLog instead). Fire-and-forget.
 */
export async function emitNoiseEvent(
  userId: string | null | undefined,
  event: NoiseTelemetryEvent,
  properties: NoiseEventProperties = {},
): Promise<void> {
  if (!userId) return;
  const payload = { ...buildNoiseEventPayload(event, properties), user_id: userId };
  try {
    await createClient().from('analytics_events').insert(payload);
  } catch (e) {
    safeLog.warn('formavision.noise-telemetry', 'noise event emit failed', {
      event,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
