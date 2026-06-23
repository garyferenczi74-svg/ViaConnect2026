/**
 * src/lib/journey/deriveJourneyState.ts
 *
 * PURE derived-journey-state brain (Prompt 208c, Phase 1, Task P1-T1).
 *
 * Single source of truth consumed by the journey spine and Dashboard read.
 * NO DB, NO React, NO Supabase import - strictly deterministic, side-effect-free.
 *
 * Fail-open contract: missing or unknown signals resolve to the conservative
 * 'Baseline' phase with honest "getting started" copy. Never throws.
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JourneyPhase = 'Baseline' | 'Protocol' | 'Tracking' | 'Re-test' | 'Adjust';

export interface JourneySignals {
  /** True when the user has completed their Comprehensive Assessment Questionnaire. */
  caqComplete: boolean;
  /** True when at least one active protocol exists for the user. */
  hasProtocol: boolean;
  /** Number of days in the recent window where the user logged tracking data. */
  recentTrackingDays: number;
  /** True when a scheduled re-test window has elapsed and a re-test is due. */
  retestDue: boolean;
  /** True when a re-test has been completed and a protocol update is awaiting review. */
  adjustPending: boolean;
  /** Total number of completed re-test cycles for this user. */
  retestsCompleted: number;
  /** Goal keys or labels from the user's CAQ (e.g. 'build_lean_mass', 'Improve Energy'). */
  goals: string[];
}

export interface JourneyState {
  phase: JourneyPhase;
  /** Current cycle number: max(1, retestsCompleted + 1). */
  cycle: number;
  /** Short imperative copy for the primary next action. */
  nextAction: string;
  /** Goal-derived destination phrase for motivational copy. */
  goalPhrase: string;
}

// ---------------------------------------------------------------------------
// Goal phrase map
//
// Keys are normalized (lowercase, underscores for spaces).
// Values are short destination phrases for motivational copy.
// ---------------------------------------------------------------------------

export const GOAL_PHRASES: Record<string, string> = {
  build_lean_mass: 'building lean mass',
  improve_energy: 'improving your energy',
  manage_weight: 'managing your weight',
  support_longevity: 'supporting longevity',
  longevity: 'supporting longevity',
  sharpen_focus: 'sharpening your focus',
  focus: 'sharpening your focus',
  optimize_wellness: 'optimizing your wellness',
};

// ---------------------------------------------------------------------------
// Normalize a goal key or label to a canonical lookup key.
//
// Lowercase, trim, replace runs of spaces/hyphens/dashes with underscores.
// ---------------------------------------------------------------------------

function normalizeGoalKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

// ---------------------------------------------------------------------------
// goalPhraseFor
// ---------------------------------------------------------------------------

/**
 * Returns a short, human-readable phrase describing the user's primary goal.
 * Looks up the first goal via GOAL_PHRASES (case- and space-insensitive).
 * If the goal is present but not mapped, returns a gently-generalized phrase.
 * If goals is empty, returns the conservative fallback.
 * PURE: never throws.
 */
export function goalPhraseFor(goals: string[]): string {
  if (!Array.isArray(goals) || goals.length === 0) {
    return 'supporting your wellness';
  }

  const first = goals[0];
  if (typeof first !== 'string' || first.trim().length === 0) {
    return 'supporting your wellness';
  }

  const key = normalizeGoalKey(first);
  const mapped = GOAL_PHRASES[key];
  if (mapped !== undefined) {
    return mapped;
  }

  // Goal exists but is not in the map: use a gently-generalized phrase.
  return 'reaching your wellness goals';
}

// ---------------------------------------------------------------------------
// deriveJourneyState
// ---------------------------------------------------------------------------

/**
 * Deterministically derives the user's current journey phase, cycle, next
 * action, and goal phrase from a plain signals object.
 *
 * Phase priority (highest to lowest):
 *   1. Baseline -- caqComplete false OR hasProtocol false
 *   2. Adjust   -- adjustPending true
 *   3. Re-test  -- retestDue true
 *   4. Tracking -- recentTrackingDays > 0
 *   5. Protocol -- protocol present but no tracking yet
 *
 * PURE, DETERMINISTIC. Never throws. Fail-open: any missing/unknown signal
 * resolves conservatively to 'Baseline'.
 */
export function deriveJourneyState(signals: JourneySignals): JourneyState {
  const {
    caqComplete,
    hasProtocol,
    recentTrackingDays,
    retestDue,
    adjustPending,
    retestsCompleted,
    goals,
  } = signals;

  // ---- Phase priority order ----

  let phase: JourneyPhase;
  let nextAction: string;

  if (!caqComplete || !hasProtocol) {
    phase = 'Baseline';
    nextAction = caqComplete
      ? 'Upload your genetics to deepen your protocol'
      : 'Complete your wellness assessment';
  } else if (adjustPending) {
    phase = 'Adjust';
    nextAction = 'Review your updated protocol';
  } else if (retestDue) {
    phase = 'Re-test';
    nextAction = 'Schedule your re-test';
  } else if (recentTrackingDays > 0) {
    phase = 'Tracking';
    nextAction = 'Log today to keep your momentum';
  } else {
    phase = 'Protocol';
    nextAction = 'Activate your foundation stack';
  }

  // ---- Cycle: max(1, retestsCompleted + 1) ----
  const safeRetests = typeof retestsCompleted === 'number' && isFinite(retestsCompleted)
    ? retestsCompleted
    : 0;
  const cycle = Math.max(1, safeRetests + 1);

  // ---- Goal phrase ----
  const goalPhrase = goalPhraseFor(Array.isArray(goals) ? goals : []);

  return { phase, cycle, nextAction, goalPhrase };
}
