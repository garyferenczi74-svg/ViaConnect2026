// =============================================================================
// Body Scan model versions + inclusivity waitlist: pure, I/O-free logic.
// (Prompt #169b, Task 19, spec section 7.3 / 7.4 inclusivity + section 16.5
// model-version stamping.)
//
// TWO concerns, both kept here as the testable contract so the components and
// hooks stay thin I/O wrappers:
//
//   1. MODEL VERSIONS (section 16.5)
//      The CURRENT version of every engine that produces a scan, plus the
//      helpers that (a) shape the body_photo_sessions.model_versions stamp on
//      persist and (b) decide whether an OLDER scan should show a "scanned with
//      vX" badge (its stamped version differs from the current version).
//
//      These engines have NO explicit version string in their own source
//      (landmarkDetector / compositionBlender / calibrationManager /
//      silhouetteProcessor are unversioned), so this module is the SINGLE place
//      the v1 identifiers are documented and defined. Do not invent per-engine
//      version strings anywhere else; bump them HERE when an engine changes.
//
//   2. INCLUSIVITY WAITLIST (section 7.3 / 7.4)
//      The payload shaping for the body_scan_inclusivity_waitlist write. The
//      table has UNIQUE(user_id) (migration 20260516000070), so the write is an
//      upsert/insert-on-conflict-do-nothing keyed on user_id: a second opt-in
//      must not error or clobber the first.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Current model versions (section 16.5)
// -----------------------------------------------------------------------------

// The engines that compose a Tier 1 scan, with the REAL pipeline they map to.
// Each value is a documented v1 identifier (the engines are unversioned in
// source). The composition identifier mirrors compositionBlender.ts, which
// blends the Navy formula, the CUN-BAE BMI estimate, and the Arnold visual
// range; landmark maps to landmarkDetector.ts (MediaPipe Pose, modelComplexity
// 1, the "lite/full" 33-landmark model); calibration maps to calibrationManager.ts
// (ISO 7810 ID-1 credit-card scale reference + tape-measure calibration);
// measurement maps to the silhouette contour measurement engine.
//
// NOTE: keys are STABLE (the badge compares per key); only bump the VALUE when
// the corresponding engine materially changes, so older scans correctly surface
// the "scanned with an earlier version" badge.
export const CURRENT_MODEL_VERSIONS = {
  landmark: 'mediapipe-pose-lite-v1',
  composition_engine: 'navy+cunbae+visual-v1',
  calibration: 'credit-card-iso7810+tape-v1',
  measurement: 'silhouette-contour-v1',
} as const;

export type ModelVersionKey = keyof typeof CURRENT_MODEL_VERSIONS;

// The shape stored in body_photo_sessions.model_versions (JSONB). A partial map
// of engine key -> version string. A scan stamped before an engine key existed
// simply omits that key.
export type ModelVersionStamp = Partial<Record<string, string>>;

// A short, human-facing version label for the badge: the composition engine is
// the headline engine for the scan, so "vX" is derived from it. We surface a
// compact "v1" style token rather than the full identifier so the badge stays
// small; the full stamp remains available on the row for support/debugging.
export const PRIMARY_MODEL_VERSION_KEY: ModelVersionKey = 'composition_engine';

/**
 * Build the model_versions stamp written on scan persist (section 16.5). Pure so
 * the persist path and the edge function can share one shape and it is unit
 * testable. Returns a fresh object (never the frozen constant) so callers can
 * spread additional provenance without mutating the source of truth.
 */
export function buildModelVersionStamp(): ModelVersionStamp {
  return { ...CURRENT_MODEL_VERSIONS };
}

/**
 * Extract a stable "version token" for the badge from a stamp. Uses the primary
 * (composition) engine when present, else the first available value, else null.
 * The token is the trailing "vN" of the identifier when one is present (so
 * "navy+cunbae+visual-v1" -> "v1"); otherwise the whole identifier is returned.
 */
export function modelVersionToken(stamp: ModelVersionStamp | null | undefined): string | null {
  if (!stamp || typeof stamp !== 'object') return null;
  const primary = stamp[PRIMARY_MODEL_VERSION_KEY];
  const raw = primary ?? firstDefined(stamp);
  if (!raw) return null;
  const m = /(?:^|[-+])(v\d+)$/i.exec(raw);
  return m ? m[1].toLowerCase() : raw;
}

/** The version token of the CURRENT engine set (e.g. "v1"). */
export function currentModelVersionToken(): string {
  // CURRENT_MODEL_VERSIONS always has the primary key, so this is non-null.
  return modelVersionToken(CURRENT_MODEL_VERSIONS) as string;
}

function firstDefined(stamp: ModelVersionStamp): string | undefined {
  for (const v of Object.values(stamp)) {
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

// -----------------------------------------------------------------------------
// Badge decision (section 16.5)
// -----------------------------------------------------------------------------

export interface ModelVersionBadgeDecision {
  // Whether to render the badge at all. The badge appears ONLY on a scan whose
  // stamped version DIFFERS from the current version (i.e. an older scan); a scan
  // on the current version shows nothing (no badge clutter on fresh scans).
  show: boolean;
  // The scan's own version token (what the badge says it was "scanned with").
  // null when the scan has no stamp (legacy/empty model_versions) AND we are not
  // showing the badge.
  scanToken: string | null;
  // The current version token, for callers that want to show "now on vY".
  currentToken: string;
}

/**
 * Decide whether a given scan should show the model-version badge (section 16.5).
 *
 * Rules:
 *   - A scan stamped with the CURRENT version -> NO badge (show: false). Fresh
 *     scans are the common case and must not be cluttered.
 *   - A scan stamped with a DIFFERENT (older) version -> badge, labelled with the
 *     scan's own token.
 *   - A scan with NO stamp at all (empty '{}' default, e.g. a legacy scan from
 *     before this feature, or a scan whose stamp failed to write) is treated as
 *     an older scan and DOES show the badge, labelled "v0" so the gap is honest
 *     rather than silently implying it used the current engine.
 *
 * Pure: takes the already-read stamp; the component does the RLS-scoped read.
 */
export function decideModelVersionBadge(
  stamp: ModelVersionStamp | null | undefined,
): ModelVersionBadgeDecision {
  const currentToken = currentModelVersionToken();
  const scanToken = modelVersionToken(stamp);

  // No stamp at all: legacy / pre-feature scan. Show the badge with a sentinel
  // so it is clearly an earlier (unversioned) scan, not the current engine.
  if (scanToken === null) {
    return { show: true, scanToken: LEGACY_MODEL_VERSION_TOKEN, currentToken };
  }

  // Stamped: show the badge only when it differs from the current token.
  return { show: scanToken !== currentToken, scanToken, currentToken };
}

// The token shown for a scan that carries no model_versions stamp at all (the
// '{}' default): an honest "earlier than versioning" sentinel.
export const LEGACY_MODEL_VERSION_TOKEN = 'v0';

// -----------------------------------------------------------------------------
// 2. Inclusivity waitlist payload (section 7.3 / 7.4)
// -----------------------------------------------------------------------------

// The capability a user can ask us to support. These mirror the Phase 2 roadmap
// (docs/roadmap/body-scan-inclusivity-roadmap.md): seated, single-arm, and
// single-leg capture, plus a general "other" for anything not yet enumerated.
// Stored in body_scan_inclusivity_waitlist.requested_capability (free TEXT, so
// the column is not constrained, but the app offers this stable set).
export type RequestedCapability =
  | 'seated'
  | 'single_arm'
  | 'single_leg'
  | 'other';

export interface WaitlistOptInArgs {
  // The capability the user is asking for. Optional: §7.4 allows a bare "notify
  // me" with no specific capability (the table column is nullable).
  requestedCapability?: RequestedCapability | null;
  // Free-text note (optional). Trimmed; empty -> null.
  notes?: string | null;
  // Whether the user wants an email when expanded scanning ships. Defaults to
  // true (matches the column default and the opt-in intent of the action).
  notifyEmail?: boolean;
}

export interface WaitlistInsertPayload {
  user_id: string;
  requested_capability: string | null;
  notes: string | null;
  notify_email: boolean;
}

/**
 * Shape the body_scan_inclusivity_waitlist insert payload (section 7.4). Pure so
 * the exact row written by the upsert is unit testable. created_at is a column
 * default and is not included.
 *
 * The table has UNIQUE(user_id): this payload is written via upsert with
 * onConflict 'user_id', ignoreDuplicates true (insert-on-conflict-do-nothing), so
 * a user who opts in twice keeps their FIRST request and the second is a no-op
 * rather than an error. See buildWaitlistUpsertOptions.
 */
export function buildWaitlistInsertPayload(
  userId: string,
  args: WaitlistOptInArgs = {},
): WaitlistInsertPayload {
  const trimmedNotes = typeof args.notes === 'string' ? args.notes.trim() : '';
  return {
    user_id: userId,
    requested_capability: args.requestedCapability ?? null,
    notes: trimmedNotes.length > 0 ? trimmedNotes : null,
    // notify_email defaults to true (column default + opt-in intent). Only an
    // explicit false turns it off.
    notify_email: args.notifyEmail === false ? false : true,
  };
}

export interface WaitlistUpsertOptions {
  onConflict: 'user_id';
  ignoreDuplicates: true;
}

/**
 * The supabase upsert options for the waitlist write: conflict on the unique
 * user_id, IGNORE duplicates (do nothing on conflict) so a repeat opt-in neither
 * errors nor overwrites the first request. Centralized + typed so the hook and
 * the test agree on the exact semantics.
 */
export function buildWaitlistUpsertOptions(): WaitlistUpsertOptions {
  return { onConflict: 'user_id', ignoreDuplicates: true };
}
