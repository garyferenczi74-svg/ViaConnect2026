'use client';

/**
 * src/hooks/journey/useTodayStats.ts
 *
 * Prompt 208j Task J-T3. Reads today's activity stats for the stat bars in
 * YourJourneyCoaching (Steps, Exercise, Sleep).
 *
 * Priority:
 *   daily_scores.steps_count (types.ts line 8278) -> no fallback
 *   daily_scores.exercise_minutes (types.ts line 8270) -> fallback:
 *     daily_checkins.cardio_duration_min + resistance_duration_min
 *     (migration 20260412000010_daily_checkins_sliders.sql)
 *   daily_scores.sleep_hours (types.ts line 8276) -> fallback:
 *     daily_checkins.sleep_hours
 *     (migration 20260412000010_daily_checkins_sliders.sql)
 *
 * Resilience: withTimeout(4000) + try/catch fail-open + safeLog on all reads.
 * Auth scoped: all queries filtered by user_id = userId via RLS.
 *
 * Rules: no em-dashes, no emojis, no `any`.
 */

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { detectTimezone, localDateString } from '@/lib/timezone';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Pure helpers (exported for TDD)
// ---------------------------------------------------------------------------

/**
 * Compute steps progress as a percentage of target.
 * Returns 0 when steps is null. Clamps to 0..100.
 */
export function stepsPct(steps: number | null, target: number): number {
  if (steps === null || !isFinite(steps) || target <= 0) return 0;
  return Math.min(100, Math.round((steps / target) * 100));
}

/**
 * Compute exercise progress as a percentage of target.
 * Returns 0 when minutes is null. Clamps to 0..100.
 */
export function exercisePct(minutes: number | null, target: number): number {
  if (minutes === null || !isFinite(minutes) || target <= 0) return 0;
  return Math.min(100, Math.round((minutes / target) * 100));
}

/**
 * Compute sleep progress as a percentage of target.
 * Returns 0 when hours is null. Clamps to 0..100.
 */
export function sleepPct(hours: number | null, target: number): number {
  if (hours === null || !isFinite(hours) || target <= 0) return 0;
  return Math.min(100, Math.round((hours / target) * 100));
}

// ---------------------------------------------------------------------------
// Row types (avoids `any`)
// ---------------------------------------------------------------------------

interface DailyScoresRow {
  steps_count: number | null;
  exercise_minutes: number | null;
  sleep_hours: number | null;
}

interface CheckinRow {
  cardio_duration_min: number | null;
  resistance_duration_min: number | null;
  sleep_hours: number | null;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface TodayStatsResult {
  stepsCount: number | null;
  exerciseMinutes: number | null;
  sleepHours: number | null;
  loading: boolean;
}

const INITIAL: TodayStatsResult = {
  stepsCount: null,
  exerciseMinutes: null,
  sleepHours: null,
  loading: true,
};

// ---------------------------------------------------------------------------
// useTodayStats
// ---------------------------------------------------------------------------

/**
 * Reads today's steps, exercise, and sleep stats.
 *
 * Primary source: daily_scores (types.ts lines 8270, 8276, 8278).
 * Exercise + sleep fallback: daily_checkins (migration 20260412000010).
 * Steps: no fallback (daily_checkins.steps_count does not exist).
 *
 * Fail-open: any error resolves with null values and loading: false.
 *
 * @param userId The authenticated user id, or null before auth resolves.
 */
export function useTodayStats(userId: string | null): TodayStatsResult {
  const [result, setResult] = useState<TodayStatsResult>(INITIAL);
  const [refreshTick, setRefreshTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFocus = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setRefreshTick((t) => t + 1);
      }, 500);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setResult({ stepsCount: null, exerciseMinutes: null, sleepHours: null, loading: false });
      return;
    }

    let active = true;

    (async () => {
      const today = localDateString(detectTimezone());
      let stepsCount: number | null = null;
      let exerciseMinutes: number | null = null;
      let sleepHours: number | null = null;

      // Read daily_scores for today.
      try {
        const supabase = createClient();
        type DsResult = { data: DailyScoresRow | null; error: unknown };
        const { data } = await withTimeout(
          supabase
            .from('daily_scores')
            .select('steps_count, exercise_minutes, sleep_hours')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle() as unknown as Promise<DsResult>,
          4000,
          'useTodayStats.daily_scores',
        );
        if (data) {
          const toNum = (v: number | null): number | null =>
            typeof v === 'number' && isFinite(v) ? v : null;
          stepsCount = toNum(data.steps_count);
          exerciseMinutes = toNum(data.exercise_minutes);
          sleepHours = toNum(data.sleep_hours);
        }
      } catch (err) {
        safeLog.warn('useTodayStats', 'daily_scores read failed, failing open', { error: err });
      }

      // Fallback to daily_checkins for exercise and sleep when daily_scores had nulls.
      if (exerciseMinutes === null || sleepHours === null) {
        try {
          const supabase = createClient();
          type CiResult = { data: CheckinRow | null; error: unknown };
          const { data: ci } = await withTimeout(
            supabase
              .from('daily_checkins')
              .select('cardio_duration_min, resistance_duration_min, sleep_hours')
              .eq('user_id', userId)
              .eq('check_in_date', today)
              .maybeSingle() as unknown as Promise<CiResult>,
            4000,
            'useTodayStats.daily_checkins',
          );
          if (ci) {
            const toNum = (v: number | null): number | null =>
              typeof v === 'number' && isFinite(v) ? v : null;
            if (exerciseMinutes === null) {
              const cardio = toNum(ci.cardio_duration_min) ?? 0;
              const resistance = toNum(ci.resistance_duration_min) ?? 0;
              const total = cardio + resistance;
              exerciseMinutes = total > 0 ? total : null;
            }
            if (sleepHours === null) {
              sleepHours = toNum(ci.sleep_hours);
            }
          }
        } catch (err) {
          safeLog.warn('useTodayStats', 'daily_checkins fallback read failed, failing open', { error: err });
        }
      }

      if (!active) return;
      setResult({ stepsCount, exerciseMinutes, sleepHours, loading: false });
    })();

    return () => { active = false; };
  }, [userId, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}
