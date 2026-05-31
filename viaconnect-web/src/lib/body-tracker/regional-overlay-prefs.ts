// =============================================================================
// Regional overlay preferences: pure serialization + a thin localStorage store.
// ViaConnect Prompt #169e(a), Sections 6.1 / 5.1 / 7.
// =============================================================================
//
// PERSISTENCE RECONCILIATION (Section 7). The spec says "use the existing user
// preferences table" with NO migration. The real per-user preference store in
// this codebase is COLUMNS on the `profiles` table (e.g. numbers_optional,
// cycle_phase_annotation_opt_in). Adding two new visualization preferences there
// would require a schema migration, which is explicitly forbidden for this work.
//
// There is no flexible/jsonb preferences row or generic settings table to reuse
// (a repo search found only typed profiles columns + the dedicated
// body_tracker_user_state row, neither of which can take new keys without a
// migration). Therefore these TWO purely-visual, non-clinical preferences (the
// overlay on/off toggle and the distribution-pattern choice) are persisted
// CLIENT-SIDE in localStorage, keyed by user id, so no migration is needed. They
// are cosmetic view state, not health data; losing them on a new device simply
// reverts to the safe defaults (overlay off until toggled; pattern derived from
// sex). This decision is reported in the deliverable.
//
// This module is the PURE, testable serialization contract; the React hook
// (useRegionalOverlay) is the thin I/O wrapper over window.localStorage.
// =============================================================================

import type { DistributionPattern } from './regional-distribution-ratios';

/** The two persisted visualization preferences. */
export interface RegionalOverlayPrefs {
  /** Overlay on/off (Section 6.1). Default false (off until the user enables it). */
  enabled: boolean;
  /**
   * The explicit distribution-pattern choice (Section 5.1), or null to derive
   * the pattern from the user's biological sex. Null is the default.
   */
  chosenPattern: DistributionPattern | null;
  /**
   * Whether the user has explicitly opted INTO the overlay despite a protective
   * suppression (pregnancy window or current disordered-eating history). Default
   * false. Held alongside the visualization prefs because it, too, is a
   * client-side view preference and not health data.
   */
  optedInDespiteSuppression: boolean;
}

export const DEFAULT_REGIONAL_OVERLAY_PREFS: RegionalOverlayPrefs = {
  enabled: false,
  chosenPattern: null,
  optedInDespiteSuppression: false,
};

/** localStorage key for a given user. Namespaced so it cannot collide. */
export function regionalOverlayPrefsKey(userId: string): string {
  return `viaconnect.bodyTracker.regionalOverlay.${userId}`;
}

function isPattern(v: unknown): v is DistributionPattern {
  return v === 'male' || v === 'female' || v === 'averaged';
}

/**
 * Parse a stored JSON string into prefs, tolerating any malformed / partial /
 * legacy shape by falling back to the defaults per field. Total + pure; never
 * throws. Unknown pattern values collapse to null (derive-from-sex).
 */
export function parseRegionalOverlayPrefs(raw: string | null | undefined): RegionalOverlayPrefs {
  if (!raw) return { ...DEFAULT_REGIONAL_OVERLAY_PREFS };
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_REGIONAL_OVERLAY_PREFS };
  }
  if (!obj || typeof obj !== 'object') return { ...DEFAULT_REGIONAL_OVERLAY_PREFS };
  const o = obj as Record<string, unknown>;
  return {
    enabled: typeof o.enabled === 'boolean' ? o.enabled : DEFAULT_REGIONAL_OVERLAY_PREFS.enabled,
    chosenPattern: isPattern(o.chosenPattern) ? o.chosenPattern : null,
    optedInDespiteSuppression:
      typeof o.optedInDespiteSuppression === 'boolean'
        ? o.optedInDespiteSuppression
        : DEFAULT_REGIONAL_OVERLAY_PREFS.optedInDespiteSuppression,
  };
}

/** Serialize prefs to a JSON string for storage. */
export function serializeRegionalOverlayPrefs(prefs: RegionalOverlayPrefs): string {
  return JSON.stringify(prefs);
}

/**
 * Read prefs for a user from a Storage-like object (window.localStorage in the
 * app, an in-memory stub in tests). Defensive: a throwing/absent storage yields
 * the defaults.
 */
export function readRegionalOverlayPrefs(
  storage: Pick<Storage, 'getItem'> | null | undefined,
  userId: string,
): RegionalOverlayPrefs {
  if (!storage) return { ...DEFAULT_REGIONAL_OVERLAY_PREFS };
  try {
    return parseRegionalOverlayPrefs(storage.getItem(regionalOverlayPrefsKey(userId)));
  } catch {
    return { ...DEFAULT_REGIONAL_OVERLAY_PREFS };
  }
}

/** Persist prefs for a user to a Storage-like object. Defensive (never throws). */
export function writeRegionalOverlayPrefs(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  userId: string,
  prefs: RegionalOverlayPrefs,
): void {
  if (!storage) return;
  try {
    storage.setItem(regionalOverlayPrefsKey(userId), serializeRegionalOverlayPrefs(prefs));
  } catch {
    // Best-effort: a full / disabled storage simply means the pref is not
    // persisted across reloads; the in-session value still applies.
  }
}
