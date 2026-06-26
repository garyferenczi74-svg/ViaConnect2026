'use client';

/**
 * src/hooks/journey/useActiveBodyGoal.ts
 *
 * Prompt 208j Task J-T2. Reads the authenticated user's single active
 * body_goals row and derives a human-readable goal label for display in the
 * ProfileCard goal chip and the J-T3 GoalCard.
 *
 * Contract:
 * - Uses getActiveGoal from src/lib/body-goals/goalsData.ts (withTimeout 8s).
 * - The top-level fetch is further guarded by withTimeout(4000ms) + try/catch
 *   fail-open so the chip always renders (falls back to "Set a goal").
 * - Scoped to auth.uid() via RLS; never widens policies.
 * - No any; no em-dashes; no emojis.
 *
 * Schema note: body_goals stores weight in lb columns (start_weight_lb,
 * goal_weight_lb). The 208j spec says "KG" but the actual migration
 * (20260607020000_prompt_179_body_goals.sql) uses lb. No kg conversion is
 * performed. Display values are already in lb.
 *
 * Goal label derivation: body_goals.driver is 'date' | 'rate' (pace driver),
 * not a text label. The human-readable label is derived from goal_weight_lb
 * vs start_weight_lb:
 *   loss    -> "Reach a lighter weight"
 *   gain    -> "Build toward a heavier weight"
 *   maintain-> "Maintain current weight"
 * When target_pace_preset is present it is appended for context.
 * J-T3 GoalCard may refine this label further with its own display logic.
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveGoal } from '@/lib/body-goals/goalsData';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { BodyGoalRow } from '@/lib/body-goals/types';

// ---------------------------------------------------------------------------
// Pure helper: map bio_optimization_tier + score to a narrative state word.
// Exported for unit testing (J-T2 TDD requirement).
//
// Contract:
// - null score OR tier in ('computing', 'baseline', null) -> "getting started"
//   (a user with no real score yet must not read as "steady")
// - Tier strings from profiles.bio_optimization_tier are matched
//   case-insensitively and fall back to score thresholds when unrecognised.
// ---------------------------------------------------------------------------

/**
 * Convert the canonical bio_optimization_tier + score to the narrative state
 * word shown in the hero heading. Pure, exported for TDD.
 *
 * Tier precedence:
 *   null score              -> "getting started"
 *   tier = null             -> score-based fallback
 *   tier = "computing"      -> "getting started"
 *   tier = "baseline"       -> "getting started"
 *   tier = "Developing"     -> score < 55: "recovering" else "steady"
 *   tier = "Moderate"       -> "steady"
 *   tier = "Strong"         -> "building"
 *   tier = "Optimal"        -> "optimizing"
 *   tier = "Elite"          -> "optimizing"
 *   unrecognised tier       -> score-based fallback
 *
 * Score-based fallback (mirrors stateWordForScore in NarrativeRead.tsx):
 *   score >= 85 -> "optimizing"
 *   score >= 70 -> "building"
 *   score >= 55 -> "steady"
 *   otherwise   -> "recovering"
 */
export function tierToStateWord(
  tier: string | null,
  score: number | null,
): string {
  // No real score yet -> getting started regardless of tier label.
  if (score === null || !isFinite(score)) return 'getting started';

  // Normalise tier for comparison.
  const t = tier?.toLowerCase() ?? null;

  if (t === null || t === 'computing' || t === 'baseline') {
    return 'getting started';
  }

  // Named tier mapping.
  if (t === 'developing') return score < 55 ? 'recovering' : 'steady';
  if (t === 'moderate') return 'steady';
  if (t === 'strong') return 'building';
  if (t === 'optimal' || t === 'elite') return 'optimizing';

  // Unrecognised tier -> score-based fallback (same thresholds as
  // stateWordForScore in NarrativeRead.tsx so callers that switched
  // to this helper produce equivalent output for known-good scores).
  if (score >= 85) return 'optimizing';
  if (score >= 70) return 'building';
  if (score >= 55) return 'steady';
  return 'recovering';
}

// ---------------------------------------------------------------------------
// Pure helper: derive a human-readable label from a BodyGoalRow.
// Exported for unit testing (J-T2 TDD requirement).
// ---------------------------------------------------------------------------

/**
 * Derive a concise display label for the profile card goal chip.
 *
 * Returns a non-empty string for all valid inputs. Never returns null.
 */
export function deriveGoalLabel(row: BodyGoalRow): string {
  const diff = row.goal_weight_lb - row.start_weight_lb;
  let base: string;
  if (diff < -0.5) {
    base = 'Reach a lighter weight';
  } else if (diff > 0.5) {
    base = 'Build toward a heavier weight';
  } else {
    base = 'Maintain current weight';
  }

  // Append pace preset for context when available.
  if (row.target_pace_preset) {
    const paceMap: Record<string, string> = {
      gentle: 'gently',
      steady: 'steadily',
      ambitious: 'ambitiously',
      custom_date: 'by a target date',
    };
    const paceWord = paceMap[row.target_pace_preset] ?? null;
    if (paceWord) {
      base = `${base} (${paceWord})`;
    }
  }

  return base;
}

// ---------------------------------------------------------------------------
// Public hook result type
// ---------------------------------------------------------------------------

export interface ActiveBodyGoalResult {
  /** The active body_goals row, or null when none or still loading. */
  goal: BodyGoalRow | null;
  /**
   * Human-readable label derived from the goal row. "Set a goal" when there
   * is no active goal or the read has not yet resolved.
   */
  goalLabel: string;
  /** True while the first fetch is in flight. */
  loading: boolean;
}

const NO_GOAL: ActiveBodyGoalResult = {
  goal: null,
  goalLabel: 'Set a goal',
  loading: false,
};

// ---------------------------------------------------------------------------
// useActiveBodyGoal
// ---------------------------------------------------------------------------

/**
 * Best-effort read of the user's active body_goals row.
 *
 * Fail-open: any error (network, RLS, timeout) resolves to
 * { goal: null, goalLabel: "Set a goal", loading: false }.
 *
 * @param userId The authenticated user id, or null before auth resolves.
 */
export function useActiveBodyGoal(userId: string | null): ActiveBodyGoalResult {
  const [result, setResult] = useState<ActiveBodyGoalResult>({
    goal: null,
    goalLabel: 'Set a goal',
    loading: userId !== null,
  });

  useEffect(() => {
    if (!userId) {
      setResult(NO_GOAL);
      return;
    }

    let active = true;
    setResult((prev) => ({ ...prev, loading: true }));

    (async () => {
      try {
        const supabase = createClient();
        const row = await withTimeout(
          getActiveGoal(userId, supabase),
          4000,
          'useActiveBodyGoal.getActiveGoal',
        );

        if (!active) return;

        if (!row) {
          setResult(NO_GOAL);
          return;
        }

        setResult({
          goal: row,
          goalLabel: deriveGoalLabel(row),
          loading: false,
        });
      } catch (err) {
        if (!active) return;
        safeLog.warn('useActiveBodyGoal', 'getActiveGoal failed, failing open', {
          error: err,
          userId,
        });
        setResult(NO_GOAL);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  return result;
}
