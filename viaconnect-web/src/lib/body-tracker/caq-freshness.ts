// =============================================================================
// CAQ data freshness: pure, I/O-free decision logic.
// (Prompt #169b, Task 17, spec section 10.)
//
// The Body Scan composition estimate is fed by the user's self reported weight
// and height (read by runScanAnalysis from profiles.weight_kg / profiles.height_cm).
// If those values are stale, the estimate is silently corrupted: a CUNBAE / BMI
// body fat input and the lean / fat mass split are weight driven. Section 10
// therefore inserts a brief "confirm your stats" step BEFORE capture when the
// last known stat is older than a threshold (or its age is unknown).
//
// FRESHNESS SIGNAL (decided against the REAL schema):
//   profiles.weight_kg / profiles.height_cm have NO per field updated-at column;
//   profiles.updated_at moves on ANY profile edit and is not stat specific, so it
//   is not a trustworthy "weight last changed" signal. The authoritative dated
//   self reported weight is the most recent body_tracker_weight row, whose date
//   is its linked body_tracker_entries.entry_date (runScanAnalysis already reads
//   body_tracker_weight). That entry date is the freshness signal for weight.
//   There is no separate dated height source, so height reuses the same most
//   recent stat entry date as a proxy; when neither exists (first ever scan), the
//   age is UNKNOWN and we treat it as stale (prompt), never silently fresh.
//
// This module holds the testable contract: the staleness decision, the source
// resolution (caq_phase_1 when unchanged vs pre_scan_update when the user
// changed the value), the caq_demographics_updates log payload, the per scan
// body_photo_sessions patch, and the profiles master patch (only when the user
// opts in). The hook (useCaqFreshness) and the screen
// (BodyScanCaqFreshnessCheck) are thin I/O wrappers over these.
// =============================================================================

import { LBS_PER_KG, IN_PER_CM } from './manual-input';

// ---------------------------------------------------------------------------
// Threshold
// ---------------------------------------------------------------------------

// A self reported stat older than this many days (or of unknown age) triggers
// the confirm step. Section 10: 60 days. Body weight/height drift slowly, so a
// two month window balances accuracy against friction.
export const STALENESS_THRESHOLD_DAYS = 60;

// Comparison tolerances for deciding "did the user actually change the value".
// Below these deltas the confirm is treated as "unchanged" (source caq_phase_1),
// so a rounding wobble in the unit round trip never spuriously logs an update.
export const WEIGHT_UNCHANGED_EPSILON_KG = 0.05;
export const HEIGHT_UNCHANGED_EPSILON_CM = 0.1;

// ---------------------------------------------------------------------------
// Gate render decision (loading window + post-confirm transition)
// ---------------------------------------------------------------------------

// What the BodyScanCaqFreshnessCheck gate should render, given the hook state.
//   'loading'  -> freshness state still resolving; render a small inline loader,
//                 NOT the children, so capture cannot begin on an unresolved stat.
//   'confirm'  -> resolved, stat is stale / unknown / missing: show the confirm
//                 step (it must be satisfied before capture).
//   'children' -> resolved and fresh (or already confirmed): render the gated
//                 capture entry.
export type FreshnessGateRender = 'loading' | 'confirm' | 'children';

/**
 * Decide what the freshness gate renders (section 10). Pure so the loading
 * window guard and the post confirm transition are unit testable.
 *
 * Precedence:
 *   isLoading      -> 'loading'   (guard the entry while resolving)
 *   needsConfirm   -> 'confirm'   (stale / unknown / missing: confirm first)
 *   otherwise      -> 'children'  (fresh: gate open)
 *
 * The post confirm transition is exactly: a successful confirm flips the hook's
 * decision to needsConfirm=false, which flips this from 'confirm' to 'children'
 * on the next render, with no remount.
 */
export function selectFreshnessGateRender(
  isLoading: boolean,
  needsConfirm: boolean,
): FreshnessGateRender {
  if (isLoading) return 'loading';
  if (needsConfirm) return 'confirm';
  return 'children';
}

// ---------------------------------------------------------------------------
// Source provenance
// ---------------------------------------------------------------------------

// The provenance written to body_photo_sessions.weight_kg_source /
// height_cm_source and to caq_demographics_updates.source. The two values this
// module produces:
//   caq_phase_1     the user CONFIRMED the existing value (no change): the per
//                   scan value is the existing CAQ / profile value.
//   pre_scan_update the user UPDATED the value at the confirm step.
// (The column CHECK also allows wearable_sync / manual, produced by other paths.)
export type StatSource = 'caq_phase_1' | 'pre_scan_update' | 'wearable_sync' | 'manual';

export type StatField = 'weight_kg' | 'height_cm';

// ---------------------------------------------------------------------------
// Staleness decision
// ---------------------------------------------------------------------------

// The known stat snapshot the decision reads. ageDays is the age, in whole days,
// of the most recent dated stat entry (see FRESHNESS SIGNAL above), or null when
// the age is UNKNOWN (no dated stat entry exists, e.g. first ever scan). lastKnown
// values are the current profile values in canonical units (kg / cm) and may be
// null when the profile has never recorded them.
export interface StatFreshnessInput {
  weightKg: number | null;
  heightCm: number | null;
  // Age, in whole days, of the freshness signal (most recent dated stat entry).
  // null = unknown age (treated as stale).
  ageDays: number | null;
}

export interface StatFreshnessDecision {
  // True when a confirm step must be shown before capture.
  needsConfirm: boolean;
  // Why the confirm is (or is not) required, for analytics + the screen copy.
  //   'fresh'        within threshold, skip the confirm
  //   'stale'        older than threshold, confirm
  //   'unknown_age'  no dated stat entry, confirm
  //   'missing_stat' profile has no weight/height at all, confirm (and the user
  //                  must supply a value, not just acknowledge)
  reason: 'fresh' | 'stale' | 'unknown_age' | 'missing_stat';
}

/**
 * Decide whether the pre capture confirm step is required (section 10).
 *
 * Rules (in order):
 *   weight or height missing entirely  -> needsConfirm, reason 'missing_stat'
 *   age unknown (no dated stat entry)  -> needsConfirm, reason 'unknown_age'
 *   age > STALENESS_THRESHOLD_DAYS     -> needsConfirm, reason 'stale'
 *   otherwise (age <= threshold)       -> skip,         reason 'fresh'
 *
 * `thresholdDays` defaults to STALENESS_THRESHOLD_DAYS but is a parameter so the
 * boundary is trivially testable. A negative ageDays (clock skew) is clamped to
 * 0 so a future dated entry is never treated as stale.
 *
 * Pure: takes the already fetched snapshot (the hook does the RLS scoped reads).
 */
export function decideStatFreshness(
  input: StatFreshnessInput,
  thresholdDays: number = STALENESS_THRESHOLD_DAYS,
): StatFreshnessDecision {
  // A missing core stat is the strongest signal: the scan cannot run on a null
  // weight/height (runScanAnalysis throws), so always confirm and require a value.
  if (input.weightKg == null || input.heightCm == null) {
    return { needsConfirm: true, reason: 'missing_stat' };
  }

  // Unknown age: no dated stat entry to anchor freshness. Treat as stale so a
  // first ever scan does not silently trust an undated profile value.
  if (input.ageDays == null || !Number.isFinite(input.ageDays)) {
    return { needsConfirm: true, reason: 'unknown_age' };
  }

  const age = input.ageDays < 0 ? 0 : input.ageDays;
  if (age > thresholdDays) {
    return { needsConfirm: true, reason: 'stale' };
  }

  return { needsConfirm: false, reason: 'fresh' };
}

/**
 * Whole days between an ISO date (or timestamptz) and a reference instant.
 * Returns null when the date is missing or unparseable, which the decision
 * treats as UNKNOWN age (stale). Negative results (future date) are returned as
 * is; the decision clamps them.
 *
 * The freshness signal is body_tracker_entries.entry_date (a DATE), so the
 * day granularity here matches the data; a timestamptz is also accepted.
 */
export function ageInDays(
  isoDate: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!isoDate || typeof isoDate !== 'string') return null;
  const thenMs = Date.parse(isoDate);
  if (Number.isNaN(thenMs)) return null;
  return Math.floor((nowMs - thenMs) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Source resolution (unchanged vs updated)
// ---------------------------------------------------------------------------

/**
 * Decide the provenance for a confirmed stat (section 10).
 *
 * Returns 'caq_phase_1' when the confirmed value equals the existing value
 * (within the field epsilon) i.e. the user CONFIRMED it unchanged, and
 * 'pre_scan_update' when the user CHANGED it. When the existing value is null
 * (no prior stat) any supplied value is necessarily a 'pre_scan_update'.
 *
 * Pure helper; the epsilon defaults to the field tolerance but is a parameter
 * for testing.
 */
export function resolveStatSource(
  existingValue: number | null,
  confirmedValue: number,
  epsilon: number,
): Extract<StatSource, 'caq_phase_1' | 'pre_scan_update'> {
  if (existingValue == null) return 'pre_scan_update';
  return Math.abs(confirmedValue - existingValue) <= epsilon
    ? 'caq_phase_1'
    : 'pre_scan_update';
}

/** Whether a confirmed value is a real change from the existing value. */
export function isStatChanged(
  existingValue: number | null,
  confirmedValue: number,
  epsilon: number,
): boolean {
  return resolveStatSource(existingValue, confirmedValue, epsilon) === 'pre_scan_update';
}

// ---------------------------------------------------------------------------
// Unit display <-> canonical (kg/cm) conversion
// ---------------------------------------------------------------------------

export type UnitSystem = 'imperial' | 'metric';

// Round helpers matching the manual-input form's 2 decimal storage convention.
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Convert a canonical weight (kg) into the value shown in the user's unit
 * system (kg for metric, lbs for imperial). Returns null for a null input.
 */
export function weightKgToDisplay(kg: number | null, unit: UnitSystem): number | null {
  if (kg == null) return null;
  return unit === 'metric' ? round2(kg) : round2(kg * LBS_PER_KG);
}

/** Convert a user entered display weight back to canonical kg. */
export function displayWeightToKg(value: number, unit: UnitSystem): number {
  return unit === 'metric' ? round2(value) : round2(value / LBS_PER_KG);
}

/**
 * Convert a canonical height (cm) into the user's unit system value. For metric
 * this is cm; for imperial this is TOTAL inches (the screen renders feet + inches
 * from total inches, and reads them back to total inches before this round trip).
 */
export function heightCmToDisplay(cm: number | null, unit: UnitSystem): number | null {
  if (cm == null) return null;
  return unit === 'metric' ? round2(cm) : round2(cm * IN_PER_CM);
}

/** Convert a user entered display height back to canonical cm. */
export function displayHeightToCm(value: number, unit: UnitSystem): number {
  return unit === 'metric' ? round2(value) : round2(value / IN_PER_CM);
}

// ---------------------------------------------------------------------------
// caq_demographics_updates log payload
// ---------------------------------------------------------------------------

export interface DemographicsUpdateInput {
  field: StatField;
  oldValue: number | null;   // canonical units (kg / cm)
  newValue: number;          // canonical units (kg / cm)
  source: Extract<StatSource, 'caq_phase_1' | 'pre_scan_update'>;
  // Whether this change was ALSO written back to the CAQ / profile master. Only
  // true when the user opted in to update their profile.
  updatedCaqMaster: boolean;
}

export interface DemographicsUpdatePayload {
  field: StatField;
  old_value: number | null;
  new_value: number;
  source: string;
  updated_caq_master: boolean;
}

/**
 * Build a caq_demographics_updates insert payload (section 10 audit trail).
 * user_id + created_at are set by RLS / default at insert time and are not
 * included. Values are stored in canonical units (kg / cm) to match the column
 * NUMERIC(7,2) semantics used elsewhere in #169b.
 */
export function buildDemographicsUpdatePayload(
  input: DemographicsUpdateInput,
): DemographicsUpdatePayload {
  return {
    field: input.field,
    old_value: input.oldValue,
    new_value: round2(input.newValue),
    source: input.source,
    updated_caq_master: input.updatedCaqMaster === true,
  };
}

// ---------------------------------------------------------------------------
// Per scan body_photo_sessions patch
// ---------------------------------------------------------------------------

export interface ConfirmedStats {
  weightKg: number;
  heightCm: number;
  weightSource: Extract<StatSource, 'caq_phase_1' | 'pre_scan_update'>;
  heightSource: Extract<StatSource, 'caq_phase_1' | 'pre_scan_update'>;
}

export interface SessionStatPatch {
  weight_kg_at_scan: number;
  weight_kg_source: string;
  height_cm_at_scan: number;
  height_cm_source: string;
}

/**
 * Build the per scan body_photo_sessions patch that pins the CONFIRMED stat onto
 * the session row (so the composition inputs use the confirmed value, never a
 * later stale profile read). Values stored in canonical units (kg / cm), matching
 * the weight_kg_at_scan / height_cm_at_scan NUMERIC(6,2) columns.
 */
export function buildSessionStatPatch(stats: ConfirmedStats): SessionStatPatch {
  return {
    weight_kg_at_scan: round2(stats.weightKg),
    weight_kg_source: stats.weightSource,
    height_cm_at_scan: round2(stats.heightCm),
    height_cm_source: stats.heightSource,
  };
}

// ---------------------------------------------------------------------------
// profiles master patch (opt in only)
// ---------------------------------------------------------------------------

/**
 * Build the profiles master patch for the "also update my profile" opt in. Only
 * the fields the user actually CHANGED are included (an unchanged confirm must
 * not rewrite the master), and ONLY when updateMaster is true. Returns null when
 * nothing should be written, so the caller skips the profiles UPDATE entirely
 * (leaving the CAQ / profile master undisturbed for a per scan only confirm).
 */
export function buildProfileMasterPatch(args: {
  updateMaster: boolean;
  weightChanged: boolean;
  heightChanged: boolean;
  weightKg: number;
  heightCm: number;
}): { weight_kg?: number; height_cm?: number } | null {
  if (!args.updateMaster) return null;
  const patch: { weight_kg?: number; height_cm?: number } = {};
  if (args.weightChanged) patch.weight_kg = round2(args.weightKg);
  if (args.heightChanged) patch.height_cm = round2(args.heightCm);
  return Object.keys(patch).length > 0 ? patch : null;
}
