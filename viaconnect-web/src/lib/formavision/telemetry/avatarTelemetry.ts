/**
 * src/lib/formavision/telemetry/avatarTelemetry.ts
 *
 * Prompt 210b P8-T1a + P8-T2a: Pure telemetry helper for the FormaVision avatar surface.
 *
 * Exports:
 *   - AvatarTelemetryEvent  (union of 12 namespaced event strings)
 *   - ALL_AVATAR_EVENTS     (runtime exhaustiveness backstop array; length must == 12)
 *   - AvatarQualitySignals  (optional quality fields for properties payloads)
 *   - buildAvatarEventPayload (pure, no side effects, deterministic)
 *   - getAvatarSessionId  (SSR-safe, sessionStorage-backed, never throws)
 *   - emitAvatarEvent  (fail-open, never throws, writes to analytics_events)
 *   - computeDaysDelta (pure math: whole days between two ms-epoch values)
 *   - recordAvatarView (read-increment-write for repeat-view + return-to-watch signals)
 *   - ViewRetentionInfo (shape returned by recordAvatarView)
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
// Event name union (12 events, all namespaced under "formavision.")
// P8-T2a adds the 12th event: 'formavision.avatar_session_ended' (dwell tracking).
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
  | 'formavision.fallback_tier_served'
  | 'formavision.avatar_session_ended';

// ---------------------------------------------------------------------------
// Runtime exhaustiveness backstop: ALL_AVATAR_EVENTS must contain every member
// of AvatarTelemetryEvent. TypeScript enforces no invalid strings in the array;
// the length check catches events added to the union but omitted from the array.
// When adding a new event: add it to the union, add it here, and bump the
// expected count from 12 to the new total.
// ---------------------------------------------------------------------------

export const ALL_AVATAR_EVENTS: AvatarTelemetryEvent[] = [
  'formavision.avatar_viewed',
  'formavision.avatar_rotated',
  'formavision.region_selected',
  'formavision.tab_switched',
  'formavision.timeline_scrubbed',
  'formavision.journey_played',
  'formavision.genetics_overlay_viewed',
  'formavision.future_self_toggled',
  'formavision.protocol_opened',
  'formavision.milestone_celebrated',
  'formavision.fallback_tier_served',
  'formavision.avatar_session_ended',
];

if (ALL_AVATAR_EVENTS.length !== 12) {
  throw new Error(
    `AvatarTelemetryEvent exhaustiveness error: expected 12 events, got ${ALL_AVATAR_EVENTS.length}.`,
  );
}

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
// buildAvatarQualitySnapshot - pure assembler for the quality signals payload
//
// Called in BodyCompositionAvatar before emitting fallback_tier_served. Always
// includes tierServed, stepDownCount, and errorCount. Includes
// timeToFirstInteractiveMs only when a measured value is provided.
// frameRateBucket is NEVER included: the demand-loop frame-budget sampler
// (createFrameBudgetSampler) exposes only sample() -> boolean (budget-miss)
// and consecutiveOverBudget() -> number. Neither provides a genuine rolling fps
// average. Un-measured values must never be fabricated.
// ---------------------------------------------------------------------------

export function buildAvatarQualitySnapshot(
  tierServed: 'cinematic' | 'lite' | '2d',
  stepDownCount: number,
  errorCount: number,
  firstInteractiveMsOrNull: number | null,
): AvatarQualitySignals {
  const signals: AvatarQualitySignals = {
    tierServed,
    stepDownCount,
    errorCount,
  };
  if (firstInteractiveMsOrNull !== null) {
    signals.timeToFirstInteractiveMs = firstInteractiveMsOrNull;
  }
  // frameRateBucket: OMITTED. See function-level comment above.
  return signals;
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
// Persistence helpers for repeat-view + return-to-watch retention signals
//
// P8-T2a: recordAvatarView() is called exactly once per emitted avatar_viewed,
// ATOMICALLY with that emit and only after the userId resolves (the caller gates
// it behind a userId check + a single-fire ref). It reads the prior view count
// and last-view timestamp from localStorage, increments and persists them, then
// returns the coarse retention signals spread into the avatar_viewed properties.
// Gating the storage write to the actual emit keeps the first repeatViewCount at
// 1: an unauthenticated session that never emits must never advance the count.
//
// localStorage keys (per-browser, no PII, coarse numbers only):
//   vc_formavision_view_count  - cumulative integer view count
//   vc_formavision_last_view   - ms-epoch wall-clock of the previous view
//
// computeDaysDelta is pure (injected values, no side effects) so it is
// unit-testable without mocking Date.now().
// ---------------------------------------------------------------------------

const VIEW_COUNT_KEY = 'vc_formavision_view_count';
const LAST_VIEW_KEY = 'vc_formavision_last_view';

function lsRead(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function lsWrite(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

function safeParseInt(raw: string | null): number {
  if (raw === null) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Pure: computes the number of whole days between two ms-epoch wall-clock values.
 * Returns 0 on first-ever view (lastViewMs === 0) and on same-day views.
 * Guards against clock drift (nowMs < lastViewMs) by returning 0.
 *
 * @param nowMs - current wall-clock epoch ms (inject for testing)
 * @param lastViewMs - stored epoch ms of the previous view (0 = no prior)
 */
export function computeDaysDelta(nowMs: number, lastViewMs: number): number {
  if (lastViewMs <= 0) return 0;
  const diffMs = nowMs - lastViewMs;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Shape returned by recordAvatarView. Spread into 'formavision.avatar_viewed' properties.
 * Both values are coarse non-negative integers; no PII.
 */
export interface ViewRetentionInfo {
  /** How many times this browser has viewed the avatar surface (post-increment; 1 on first view). */
  repeatViewCount: number;
  /** Whole days since the previous view. 0 on first view and same-day views. */
  daysSinceLastView: number;
}

/**
 * Records one view of the avatar surface: reads, increments, and writes the
 * localStorage view count and last-view timestamp, then returns the retention
 * signals to spread into the avatar_viewed event properties.
 *
 * SSR-safe: returns { repeatViewCount: 1, daysSinceLastView: 0 } when window is
 * unavailable. Never throws.
 *
 * @param nowMs - wall-clock epoch ms (default Date.now(); inject in tests)
 */
export function recordAvatarView(nowMs: number = Date.now()): ViewRetentionInfo {
  const prevCount = safeParseInt(lsRead(VIEW_COUNT_KEY));
  const prevTimestampMs = safeParseInt(lsRead(LAST_VIEW_KEY));
  const daysSinceLastView = computeDaysDelta(nowMs, prevTimestampMs);
  const repeatViewCount = prevCount + 1;
  lsWrite(VIEW_COUNT_KEY, String(repeatViewCount));
  lsWrite(LAST_VIEW_KEY, String(nowMs));
  return { repeatViewCount, daysSinceLastView };
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
