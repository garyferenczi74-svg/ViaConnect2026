/**
 * src/lib/formavision/clip/clipTelemetry.ts
 *
 * Prompt 211a Workstream 1: telemetry for the shareable transformation clip surface.
 *
 * Mirrors the avatarTelemetry / reportTelemetry emit pattern EXACTLY (same
 * analytics_events sink, same fail-open discipline): a telemetry failure MUST NOT
 * propagate to the UI, and every payload carries coarse, PII-clean fields only.
 *
 * Two events (per the brief):
 *   - clip_created : emitted when a clip (WebM) or a static-card fallback is produced.
 *   - clip_shared  : emitted when the user shares or downloads the artifact.
 *
 * Coarse fields (per the brief): range_length (how many scans the clip spans),
 * stats_shown_or_hidden (did the user show the stats overlay or hide it), plus
 * surface, channel, mode, and ok. NO name, email, signed URL, storage path, date,
 * or measurement value is ever recorded.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any.
 */

import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';
import type { Json } from '@/lib/supabase/types';

export type ClipTelemetryEvent =
  | 'formavision.clip_created'
  | 'formavision.clip_shared';

export const ALL_CLIP_EVENTS: ClipTelemetryEvent[] = [
  'formavision.clip_created',
  'formavision.clip_shared',
];

// How the clip left the device. 'native_share' is reserved for a future
// @capacitor/share integration (ABSENT per baseline; package.json locked); today
// desktop / native both fall back to 'download'.
export type ClipShareChannel = 'native_share' | 'download';

// Which artifact was produced: a real WebM clip, or the honest static-card still.
export type ClipMode = 'webm' | 'static_card';

// Whether the user chose to show the stats overlay on the clip, or hide it (the
// brief's "choose which stats appear or none"). Coarse: shown or hidden only.
export type StatsVisibility = 'shown' | 'hidden';

export interface ClipEventProperties {
  /** Coarse route id the clip was created from. */
  surface?: string;
  /** How the artifact left the app (share vs download). */
  channel?: ClipShareChannel;
  /** Which artifact was produced (WebM clip or static card). */
  mode?: ClipMode;
  /** How many scans the clip spans (coarse count, never dates). */
  range_length?: number;
  /** Whether the stats overlay was shown or hidden. */
  stats_shown_or_hidden?: StatsVisibility;
  /** Whether the underlying action succeeded. */
  ok?: boolean;
}

const DEFAULT_SURFACE = '/body-tracker/composition';

/**
 * Builds the analytics_events insert payload (minus user_id). PURE: no Date.now, no
 * supabase, no side effects. Only whitelisted coarse fields are copied, so a caller
 * cannot accidentally leak PII through this payload. Returns a plain
 * Record<string, Json> assignable to the properties column without a cast.
 */
export function buildClipEventPayload(
  event: ClipTelemetryEvent,
  properties: ClipEventProperties = {},
): { event: ClipTelemetryEvent; properties: Record<string, Json>; page: string } {
  const clean: Record<string, Json> = {};
  if (properties.surface !== undefined) clean.surface = properties.surface;
  if (properties.channel !== undefined) clean.channel = properties.channel;
  if (properties.mode !== undefined) clean.mode = properties.mode;
  if (properties.range_length !== undefined) clean.range_length = properties.range_length;
  if (properties.stats_shown_or_hidden !== undefined) {
    clean.stats_shown_or_hidden = properties.stats_shown_or_hidden;
  }
  if (properties.ok !== undefined) clean.ok = properties.ok;
  return {
    event,
    properties: clean,
    page: properties.surface ?? DEFAULT_SURFACE,
  };
}

/**
 * Emits one clip telemetry event to analytics_events. Fail-open: returns immediately
 * when userId is falsy, and never rejects on a supabase failure (logs a warn via
 * safeLog instead). Fire-and-forget usage is intentional.
 */
export async function emitClipEvent(
  userId: string | null | undefined,
  event: ClipTelemetryEvent,
  properties: ClipEventProperties = {},
): Promise<void> {
  if (!userId) return;
  const payload = { ...buildClipEventPayload(event, properties), user_id: userId };
  try {
    await createClient().from('analytics_events').insert(payload);
  } catch (e) {
    safeLog.warn('formavision.clip-telemetry', 'clip event emit failed', {
      event,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
