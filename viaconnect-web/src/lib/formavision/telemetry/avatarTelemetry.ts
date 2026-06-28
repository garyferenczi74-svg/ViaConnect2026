/**
 * src/lib/formavision/telemetry/avatarTelemetry.ts
 *
 * Prompt 210b P8-T1a: Pure telemetry helper for the FormaVision avatar surface.
 *
 * Exports:
 *   - AvatarTelemetryEvent  (union of 11 namespaced event strings)
 *   - AvatarQualitySignals  (optional quality fields for properties payloads)
 *   - buildAvatarEventPayload (pure, no side effects, deterministic)
 *   - getAvatarSessionId  (SSR-safe, sessionStorage-backed, never throws)
 *   - emitAvatarEvent  (fail-open, never throws, writes to analytics_events)
 *
 * Hard rules:
 *   - Fail-open: a telemetry failure MUST NOT propagate to the avatar or UI.
 *   - No new dependencies: uses only supabase/client + utils/safe-log.
 *   - No em-dashes anywhere in code or comments.
 *   - No wiring into page/component (that is P8-T1b).
 *
 * Session-id note: no existing getSessionId utility was found in the repo
 * (grep searched getSessionId, sessionId utility, getAvatarSessionId, vc_session,
 * vc_formavision in src/). This helper creates a stable-per-tab id via
 * sessionStorage key "vc_formavision_session", guarded for SSR.
 *
 * Standing rules: no em-dashes, no en-dashes, no emojis, no any cast.
 */

import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';
import type { Json } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Event name union (11 events, all namespaced under "formavision.")
// ---------------------------------------------------------------------------

export type AvatarTelemetryEvent =
  | 'formavision.avatar_viewed'
  | 'formavision.avatar_rotated'
  | 'formavision.region_selected'
  | 'formavision.tab_switched'
  | 'formavision.timeline_scrubbed'
  | 'formavision.journey_played'
  | 'formavision.genetics_overlay_viewed'
  | 'formavision.future_self_toggled'
  | 'formavision.protocol_opened'
  | 'formavision.milestone_celebrated'
  | 'formavision.fallback_tier_served';

// ---------------------------------------------------------------------------
// Quality-signal type (all fields optional; plain serializable)
// ---------------------------------------------------------------------------

export interface AvatarQualitySignals {
  timeToFirstInteractiveMs?: number;
  frameRateBucket?: '60' | '30-59' | 'under-30';
  tierServed?: 'cinematic' | 'lite' | '2d';
  errorCount?: number;
  stepDownCount?: number;
}

// ---------------------------------------------------------------------------
// Serializable properties type: Record<string, Json> is assignable to the
// analytics_events Insert type's `properties: Json | null` column without
// a cast. Use this everywhere a properties payload is accepted or returned.
// ---------------------------------------------------------------------------

export type AvatarEventProperties = Record<string, Json>;

// ---------------------------------------------------------------------------
// Context bag for buildAvatarEventPayload (optional per field)
// ---------------------------------------------------------------------------

export interface AvatarEventContext {
  page?: string;
  device?: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Default route for the composition surface
// ---------------------------------------------------------------------------

const DEFAULT_PAGE = '/body-tracker/composition';

// ---------------------------------------------------------------------------
// Payload shape returned by buildAvatarEventPayload
// (matches the analytics_events columns, minus user_id which emitAvatarEvent adds)
// ---------------------------------------------------------------------------

export interface AvatarEventPayload {
  event: AvatarTelemetryEvent;
  properties: AvatarEventProperties;
  page: string;
  device?: string;
  session_id?: string;
}

// ---------------------------------------------------------------------------
// buildAvatarEventPayload - pure function, no side effects, deterministic
// ---------------------------------------------------------------------------

/**
 * Builds the exact insert payload for analytics_events (minus user_id).
 * Pure: no Date.now(), no supabase, no side effects. Safe to call in tests
 * without mocking.
 *
 * @param event - One of the 11 AvatarTelemetryEvent values.
 * @param properties - Optional serializable properties object (default {}).
 * @param context - Optional page/device/sessionId overrides.
 */
export function buildAvatarEventPayload(
  event: AvatarTelemetryEvent,
  properties: AvatarEventProperties = {},
  context: AvatarEventContext = {},
): AvatarEventPayload {
  const payload: AvatarEventPayload = {
    event,
    properties,
    page: context.page ?? DEFAULT_PAGE,
  };

  if (context.device !== undefined) {
    payload.device = context.device;
  }

  if (context.sessionId !== undefined) {
    payload.session_id = context.sessionId;
  }

  return payload;
}

// ---------------------------------------------------------------------------
// getAvatarSessionId - SSR-safe, sessionStorage-backed, never throws
// ---------------------------------------------------------------------------

const SESSION_KEY = 'vc_formavision_session';

/**
 * Returns a stable-per-tab session id, or undefined when running server-side
 * (typeof window === 'undefined') or when sessionStorage is unavailable.
 *
 * Implementation: reads/writes the sessionStorage key "vc_formavision_session".
 * If absent, generates a UUID via crypto.randomUUID() with a Math.random fallback.
 *
 * No existing getSessionId utility was found in the repo; this is the first
 * formavision-session id helper.
 *
 * Never throws; guarded for SSR.
 */
export function getAvatarSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const id =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `fv-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// emitAvatarEvent - fail-open, never throws, writes to analytics_events
// ---------------------------------------------------------------------------

/**
 * Emits one avatar telemetry event to the analytics_events table.
 *
 * - If userId is falsy, returns immediately (no insert).
 * - On supabase insert failure, logs a warn via safeLog and returns; never rejects.
 * - Return type is Promise<void>; the caller should not need to await it for
 *   correctness - fire-and-forget usage is intentional.
 *
 * @param userId - Authenticated user id from Supabase auth. Pass empty string or
 *   undefined to skip (e.g., before auth resolves).
 * @param event - The AvatarTelemetryEvent to record.
 * @param properties - Optional serializable payload fields.
 * @param context - Optional page/device/sessionId overrides.
 */
export async function emitAvatarEvent(
  userId: string | null | undefined,
  event: AvatarTelemetryEvent,
  properties: AvatarEventProperties = {},
  context: AvatarEventContext = {},
): Promise<void> {
  if (!userId) return;

  const payload = {
    ...buildAvatarEventPayload(event, properties, context),
    user_id: userId,
  };

  try {
    await createClient().from('analytics_events').insert(payload);
  } catch (e) {
    safeLog.warn('formavision.telemetry', 'avatar event emit failed', {
      event,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
