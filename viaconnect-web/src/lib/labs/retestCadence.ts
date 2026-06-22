/**
 * lib/labs/retestCadence.ts
 *
 * Re-test cadence engine for Prompt 208b (2026-06-22).
 *
 * Schedules a sensible re-test window per biomarker physiological response
 * time, captures the baseline, and later compares the re-test value against
 * the baseline to determine improvement or worsening direction.
 *
 * Design rules:
 * - All pure functions are deterministic; no Date.now() inside - nowMs is
 *   always injected by the caller.
 * - scheduleRetest and getDueRetests are fail-open and never throw.
 * - No new dependencies; no synthesis/interlock changes.
 * - No em/en-dashes; no emojis.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Re-test window constants (weeks)
//
// These reflect established physiological response times: how long an
// intervention needs before a re-test is clinically meaningful.
// ---------------------------------------------------------------------------

export const RETEST_WINDOWS_WEEKS: Record<string, number> = {
  vitamin_d: 12,
  ferritin: 12,
  homocysteine: 8,
  hscrp: 8,
  vitamin_b12: 12,
  ldl: 12,
  hba1c: 12,
  folate: 8,
  magnesium: 8,
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Case-insensitive lookup of the re-test window for a given biomarker.
 * Returns 12 (weeks) when the biomarker is unknown.
 */
export function retestWindowWeeks(biomarker: string): number {
  const key = (biomarker ?? '').toLowerCase();
  return RETEST_WINDOWS_WEEKS[key] ?? 12;
}

/**
 * Human-readable label for a given window duration in weeks.
 * e.g. retestWindowLabel(12) -> "12 weeks"
 */
export function retestWindowLabel(weeks: number): string {
  return `${weeks} weeks`;
}

// ---------------------------------------------------------------------------
// compareRetest
// ---------------------------------------------------------------------------

export type RetestDirection = 'improving' | 'worsening' | 'unchanged';

/**
 * Compares a re-test value against the baseline to determine the direction
 * of change, accounting for the risk polarity of the biomarker.
 *
 * @param baseline       - The baseline measurement value.
 * @param current        - The re-test measurement value.
 * @param riskDirection  - 'high' if a HIGH value is the risk (e.g. homocysteine,
 *                         hscrp, ldl); 'low' if a LOW value is the risk (e.g.
 *                         vitamin_d deficiency, vitamin_b12, ferritin).
 * @param epsilon        - Absolute tolerance; |delta| <= epsilon is 'unchanged'.
 *                         Defaults to 0 (exact equality only).
 */
export function compareRetest(
  baseline: number,
  current: number,
  riskDirection: 'low' | 'high',
  epsilon = 0,
): { delta: number; direction: RetestDirection } {
  const delta = current - baseline;

  if (Math.abs(delta) <= epsilon) {
    return { delta, direction: 'unchanged' };
  }

  let direction: RetestDirection;

  if (riskDirection === 'high') {
    // High values are bad; a decrease (negative delta) is improving.
    direction = delta < 0 ? 'improving' : 'worsening';
  } else {
    // Low values are bad; an increase (positive delta) is improving.
    direction = delta > 0 ? 'improving' : 'worsening';
  }

  return { delta, direction };
}

// ---------------------------------------------------------------------------
// scheduleRetest
// ---------------------------------------------------------------------------

/**
 * Persists a retest_schedule row for the given user and biomarker.
 *
 * The recommended_retest_at is computed from the injected nowMs so that
 * this function is deterministic and testable without mocking Date.now().
 *
 * Fail-open: logs and returns false on any error; never throws.
 */
export async function scheduleRetest(
  userId: string,
  input: {
    biomarker: string;
    interventionRef?: string;
    baselineValue?: number | null;
    nowMs: number;
  },
): Promise<boolean> {
  try {
    const weeks = retestWindowWeeks(input.biomarker);
    const windowMs = weeks * 7 * 24 * 3600 * 1000;
    const recommendedRetestAt = new Date(input.nowMs + windowMs).toISOString();

    const row = {
      user_id: userId,
      biomarker: input.biomarker,
      intervention_ref: input.interventionRef ?? null,
      recommended_retest_window: retestWindowLabel(weeks),
      recommended_retest_at: recommendedRetestAt,
      baseline_value: input.baselineValue ?? null,
      status: 'scheduled' as const,
    };

    const db = createAdminClient();
    const { error } = await db.from('retest_schedule').insert(row);

    if (error) {
      safeLog.warn('retestCadence.scheduleRetest', 'insert error', {
        userId,
        biomarker: input.biomarker,
        error,
      });
      return false;
    }

    return true;
  } catch (err) {
    safeLog.error('retestCadence.scheduleRetest', 'unexpected error', {
      userId,
      biomarker: input.biomarker,
      error: err,
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// getDueRetests
// ---------------------------------------------------------------------------

export interface DueRetest {
  biomarker: string;
  recommended_retest_at: string | null;
  baseline_value: number | null;
}

/**
 * Returns all 'scheduled' retest_schedule rows for the user whose
 * recommended_retest_at is at or before the injected nowMs instant.
 *
 * Fail-open: logs and returns [] on any error; never throws.
 */
export async function getDueRetests(userId: string, nowMs: number): Promise<DueRetest[]> {
  try {
    const nowIso = new Date(nowMs).toISOString();

    const db = createAdminClient();
    const { data, error } = await db
      .from('retest_schedule')
      .select('biomarker, recommended_retest_at, baseline_value')
      .eq('user_id', userId)
      .in('status', ['scheduled'])
      .lte('recommended_retest_at', nowIso);

    if (error) {
      safeLog.warn('retestCadence.getDueRetests', 'query error', {
        userId,
        error,
      });
      return [];
    }

    return (data ?? []) as DueRetest[];
  } catch (err) {
    safeLog.error('retestCadence.getDueRetests', 'unexpected error', {
      userId,
      error: err,
    });
    return [];
  }
}
