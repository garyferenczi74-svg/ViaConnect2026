/**
 * src/lib/formavision/milestone/milestoneMoment.ts
 *
 * Prompt 210b P6-T4: Pure logic for MilestoneMoment (consumer-only, celebrate-only).
 *
 * A milestone is ACHIEVED when its completed_date is set (server-recorded).
 * This module selects the first unseen completed body-composition milestone
 * and manages the sessionStorage seen-guard.
 *
 * Body-composition milestone_types: body_fat_goal, muscle_gain_goal, weight_goal.
 * Other types (consistency, custom) are excluded.
 *
 * Seen-guard: sessionStorage key vc_milestone_moment_seen stores a JSON array
 * of milestone IDs seen this session. One-shot per milestone per session.
 *
 * HONESTY CONTRACT:
 *   - A milestone is ACHIEVED only when completed_date is a non-empty string.
 *   - Never compute crossing or direction client-side.
 *   - selectMilestoneForMoment returns null when none qualify: none completed,
 *     all already seen, or the list is empty. Renders nothing in that case.
 *
 * ECONOMY CONTRACT (Gary decision 2026-06-27, binding):
 *   - Read-only. No creditEarning, no helix_score_events write,
 *     no helix_increment_balance call from this surface.
 *   - CARRY-FORWARD NOTE: server-side milestone-crossing -> Helix crediting is
 *     NOT wired here (avatar = visualization layer). If not wired elsewhere,
 *     that is a separate server task.
 *
 * Standing rules: no em-dashes, no en-dashes, no emojis, no any.
 * Pure, deterministic, never throws.
 */

// ---------------------------------------------------------------------------
// Body-composition milestone types (per brief).
// Excludes consistency and custom.
// ---------------------------------------------------------------------------

export const BODY_COMP_MILESTONE_TYPES: ReadonlySet<string> = new Set([
  'body_fat_goal',
  'muscle_gain_goal',
  'weight_goal',
]);

// ---------------------------------------------------------------------------
// Minimal milestone shape for the selection function.
// Only fields needed: id, milestone_type, completed_date, title.
// Avoids requiring the full Milestone interface with its many required fields.
// ---------------------------------------------------------------------------

export interface MilestoneForMoment {
  /** Milestone UUID from body_tracker_milestones. */
  id: string;
  /** milestone_type from DB (string; compared against BODY_COMP_MILESTONE_TYPES). */
  milestone_type: string;
  /** Server-recorded achievement date. null means not yet achieved. */
  completed_date: string | null;
  /** Real title from the server. Never fabricated. */
  title: string;
}

// ---------------------------------------------------------------------------
// Seen-guard (sessionStorage). Mirrors the useDailyScores.ts cache idiom.
// ---------------------------------------------------------------------------

export const SEEN_KEY = 'vc_milestone_moment_seen';

/**
 * Returns the set of milestone IDs seen this session from sessionStorage.
 * Fail-open: returns an empty Set on any error or when running server-side
 * (typeof window === 'undefined'). Pure read; does not mutate sessionStorage.
 */
export function getSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

/**
 * Marks a milestone as seen this session by appending its ID to the
 * sessionStorage seen set. Fail-open: any error is silently swallowed.
 */
export function markMilestoneSeen(id: string): void {
  try {
    const seen = getSeenIds();
    seen.add(id);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // Fail-open: swallow write errors (private browsing, storage full, SSR).
  }
}

// ---------------------------------------------------------------------------
// Milestone selection (pure, exported for TDD).
// ---------------------------------------------------------------------------

/**
 * Returns the first body-composition milestone that:
 *   1. Has milestone_type in BODY_COMP_MILESTONE_TYPES (body_fat_goal,
 *      muscle_gain_goal, weight_goal).
 *   2. Has completed_date set (non-null, non-empty; server-recorded achievement).
 *   3. Is not in seenIds (not yet shown this session).
 *
 * Returns null when no milestone qualifies. Never throws. Deterministic.
 *
 * Does NOT compute crossing or direction client-side; relies solely on
 * server-recorded completed_date. Does NOT look at is_active or current_value.
 */
export function selectMilestoneForMoment(
  milestones: ReadonlyArray<MilestoneForMoment>,
  seenIds: ReadonlySet<string>,
): MilestoneForMoment | null {
  for (const m of milestones) {
    if (!BODY_COMP_MILESTONE_TYPES.has(m.milestone_type)) continue;
    if (!m.completed_date) continue;
    if (seenIds.has(m.id)) continue;
    return m;
  }
  return null;
}
