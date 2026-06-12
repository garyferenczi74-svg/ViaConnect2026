// Prompt 192 Task 3: pure helpers for the insights API routes.
//
// Extracted from the route handlers so the manual refresh rate limit
// window math, the PATCH field whitelist, and the GET query param clamps
// are unit testable without HTTP plumbing. Nothing here touches supabase
// or the clock; callers inject every instant.

// ---------------------------------------------------------------------------
// Enum values mirroring the nutrition_insights CHECK constraints
// (20260612090000_prompt_192_nutrition_insights.sql).
// ---------------------------------------------------------------------------

export const INSIGHT_TYPE_VALUES = [
  'macro_gap',
  'micronutrient_gap',
  'meal_timing_pattern',
  'hydration_correlation',
  'supplement_meal_alignment',
  'quality_trend',
  'consistency_streak',
  'score_mover',
] as const;

export const HORIZON_VALUES = ['meal', 'daily', 'weekly'] as const;

export const STATUS_VALUES = ['active', 'read', 'dismissed', 'saved', 'expired'] as const;

// Statuses a PATCH may set. 'active' is allowed solely to support
// dismiss-undo; 'expired' is runner owned and never client settable.
export const PATCHABLE_STATUS_VALUES = ['read', 'dismissed', 'saved', 'active'] as const;

export type PatchableStatus = (typeof PATCHABLE_STATUS_VALUES)[number];

/** Narrow a raw query param to one of the allowed literals, else null. */
export function oneOf<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | null {
  if (raw === null) return null;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

// ---------------------------------------------------------------------------
// GET paging params.
// ---------------------------------------------------------------------------

export const GET_DEFAULT_LIMIT = 20;
export const GET_MAX_LIMIT = 50;

/** limit: default 20, clamped to [1, 50]. Garbage falls back to default. */
export function clampLimitParam(raw: string | null): number {
  if (raw === null || raw.trim() === '') return GET_DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return GET_DEFAULT_LIMIT;
  return Math.min(GET_MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

/** offset/cursor: default 0, never negative. Garbage falls back to 0. */
export function parseOffsetParam(raw: string | null): number {
  if (raw === null || raw.trim() === '') return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

// ---------------------------------------------------------------------------
// Manual refresh rate limit (POST /api/nutrition/insights/refresh).
// One manual run per user per 10 minutes, measured against the newest
// nutrition_insight_runs row with trigger 'manual'.
// ---------------------------------------------------------------------------

export const MANUAL_REFRESH_WINDOW_MS = 10 * 60 * 1000;

export type ManualRefreshGate =
  | { limited: false }
  | { limited: true; retryAfterSeconds: number };

export function manualRefreshGate(
  newestManualStartedAt: string | null,
  nowIso: string,
): ManualRefreshGate {
  if (!newestManualStartedAt) return { limited: false };
  const started = Date.parse(newestManualStartedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(started) || !Number.isFinite(now)) return { limited: false };
  const elapsedMs = now - started;
  if (elapsedMs >= MANUAL_REFRESH_WINDOW_MS) return { limited: false };
  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil((MANUAL_REFRESH_WINDOW_MS - elapsedMs) / 1000)),
  };
}

// ---------------------------------------------------------------------------
// PATCH body whitelist (PATCH /api/nutrition/insights/[id]).
// Exactly two fields are accepted: status and feedback. Anything else is
// rejected outright; a whitelisted field with a bad shape is also
// rejected. An empty patch is rejected.
// ---------------------------------------------------------------------------

export interface InsightPatch {
  status?: PatchableStatus;
  feedback?: { helpful: boolean };
}

export type ParsedInsightPatch =
  | { ok: true; patch: InsightPatch }
  | { ok: false; reason: string };

export function parseInsightPatchBody(raw: unknown): ParsedInsightPatch {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'body_not_object' };
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key !== 'status' && key !== 'feedback') {
      return { ok: false, reason: `unknown_field:${key}` };
    }
  }

  const patch: InsightPatch = {};

  if ('status' in obj) {
    const status = obj.status;
    if (
      typeof status !== 'string' ||
      !(PATCHABLE_STATUS_VALUES as readonly string[]).includes(status)
    ) {
      return { ok: false, reason: 'invalid_status' };
    }
    patch.status = status as PatchableStatus;
  }

  if ('feedback' in obj) {
    const feedback = obj.feedback;
    if (feedback === null || typeof feedback !== 'object' || Array.isArray(feedback)) {
      return { ok: false, reason: 'invalid_feedback' };
    }
    const keys = Object.keys(feedback as Record<string, unknown>);
    const helpful = (feedback as Record<string, unknown>).helpful;
    if (keys.length !== 1 || keys[0] !== 'helpful' || typeof helpful !== 'boolean') {
      return { ok: false, reason: 'invalid_feedback' };
    }
    patch.feedback = { helpful };
  }

  if (patch.status === undefined && patch.feedback === undefined) {
    return { ok: false, reason: 'empty_patch' };
  }
  return { ok: true, patch };
}
