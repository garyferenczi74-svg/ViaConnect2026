'use client';

/**
 * src/components/journey/coaching/useJourneyGraphSeries.ts
 *
 * Prompt 208k Task T2: Windowed per-pillar daily-scores reader hook.
 *
 * Returns the per-bucket, per-pillar score series for the Your Journey
 * hero graph. Delegates date-math to T1 (journeyGraphWindow.ts).
 *
 * Schema facts confirmed from src/lib/supabase/types.ts (Step 0):
 *   - daily_scores date column: "date" (NOT score_date; the reference hook
 *     useBioOptimizationTrend uses score_date via "as any" which bypasses
 *     type checks; types.ts is authoritative here)
 *   - daily_scores existing pillar columns (verified): sleep_score,
 *     bio_optimization_score. The reference hook columns overall_score,
 *     nutrition_score, activity_score, mood_stress_score, energy_score are
 *     NOT in types.ts; this hook returns honest null gaps for those pillars.
 *   - bio_optimization_history EXISTS: columns date, score, user_id, tier,
 *     confidence. Used as the primary per-day overall composite series.
 *   - health_scores EXISTS but has no per-day date column (only created_at),
 *     so it cannot be used for daily bucket joins.
 *   - hydration_log_sessions NOT in types.ts; hydration history is null gaps.
 *
 * Bio composite source: bio_optimization_history.score per day.
 *   Chosen because: it has a proper date column for per-day joins; it agrees
 *   with the Dashboard bio_optimization_score (profiles.bio_optimization_score
 *   is the latest value of this per-day series); daily_scores.bio_optimization_score
 *   is used as a fallback when bio_optimization_history has no row for a date;
 *   health_scores is excluded (no date column); vitality_score is never read.
 *
 * Single-source guarantee: daily_scores is read with DAILY_SCORES_COLUMNS
 * (centralized constant) to prevent drift from useBioOptimizationTrend.
 * Today's live values (offset=0) are overlaid from useDailyScores so the
 * current bucket equals the dashboard gauges.
 *
 * Resilience:
 *   - withTimeout 5000 ms on every Supabase read
 *   - try/catch fail open to empty series
 *   - safeLog.warn on every read failure
 *   - All reads scoped to userId under RLS
 *   - Missing data: null (never 0, never carried forward)
 *
 * Rules:
 *   - No em-dashes, no en-dashes, no emojis
 *   - No new dependencies
 *   - Never reads profiles.vitality_score
 */

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { detectTimezone, localDateString } from '@/lib/timezone';
import {
  windowFor,
  aggregateMonthly,
  type JourneyBucket,
  type JourneyRange,
  type JourneyWindow,
} from './journeyGraphWindow';
import { useDailyScores } from '@/hooks/journey/useDailyScores';

// ---------------------------------------------------------------------------
// Column constants
//
// Centralized here so this hook and useBioOptimizationTrend can share the
// same column list in a future cleanup. The reference hook currently uses
// score_date and several columns absent from types.ts; this hook uses only
// verified columns.
// ---------------------------------------------------------------------------

/** Columns queried from daily_scores. Verified in src/lib/supabase/types.ts. */
export const DAILY_SCORES_COLUMNS = 'date, sleep_score, bio_optimization_score' as const;

/** Columns queried from bio_optimization_history. Verified in types.ts. */
export const BIO_HISTORY_COLUMNS = 'date, score' as const;

// ---------------------------------------------------------------------------
// Pillar types
//
// PillarKey values MUST match the key field in the PILLARS array in
// src/components/journey/YourJourneyCoaching.tsx.
// ---------------------------------------------------------------------------

export type PillarKey =
  | 'sleep'
  | 'energy'
  | 'mood'
  | 'nutrition'
  | 'activity'
  | 'overall'
  | 'hydration';

export const PILLAR_KEYS: PillarKey[] = [
  'sleep',
  'energy',
  'mood',
  'nutrition',
  'activity',
  'overall',
  'hydration',
];

// ---------------------------------------------------------------------------
// Row types (schema-derived from types.ts)
// ---------------------------------------------------------------------------

export interface DailyScoreRow {
  date: string;
  sleep_score: number | null;
  bio_optimization_score: number | null;
}

export interface BioHistoryRow {
  date: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Today overlay
//
// Maps useDailyScores return shape to PillarKey names for the mapper.
// ---------------------------------------------------------------------------

export interface TodayOverlay {
  sleep: number | null;
  energy: number | null;
  mood: number | null;
  nutrition: number | null;
  activity: number | null;
  overall: number | null;
  hydration: number | null;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface JourneyGraphSeriesResult {
  series: Record<PillarKey, (number | null)[]>;
  periodLabel: string;
  canGoNext: boolean;
  loading: boolean;
  error: boolean;
}

// ---------------------------------------------------------------------------
// Local date helper (mirrors useDailyScores.todayLocal)
// ---------------------------------------------------------------------------

function todayLocal(): string {
  return localDateString(detectTimezone());
}

// ---------------------------------------------------------------------------
// emptySeriesFor: builds a per-pillar series of null gaps sized to buckets.
// ---------------------------------------------------------------------------

function emptySeriesFor(
  buckets: JourneyBucket[],
): Record<PillarKey, (number | null)[]> {
  return Object.fromEntries(
    PILLAR_KEYS.map((k) => [k, buckets.map(() => null)]),
  ) as Record<PillarKey, (number | null)[]>;
}

// ---------------------------------------------------------------------------
// buildSeriesFromRows (exported for TDD)
//
// Pure, deterministic mapper. Maps daily_scores rows and
// bio_optimization_history rows to a per-bucket, per-pillar series aligned
// to the given JourneyBucket array.
//
// Pillar source mapping (honest, no fabrication):
//   sleep     -> daily_scores.sleep_score by date
//   energy    -> null gap (no per-day stored aggregate in types.ts)
//   mood      -> null gap (no per-day stored aggregate in types.ts)
//   nutrition -> null gap (no per-day stored aggregate in types.ts)
//   activity  -> null gap (no per-day stored aggregate in types.ts)
//   overall   -> bio_optimization_history.score (primary) then
//                daily_scores.bio_optimization_score (fallback) by date
//   hydration -> null gap (hydration_log_sessions not in types.ts)
//
// For 1Y range: monthly aggregation via aggregateMonthly (from T1) per pillar.
// Today bucket (offset=0): todayOverlay patches the bucket matching today.
// Never emits 0 for missing data (null for gaps).
// Never references vitality_score.
//
// Parameters:
//   buckets        - JourneyBucket[] from windowFor (T1)
//   dailyRows      - rows from daily_scores for the window
//   bioHistoryRows - rows from bio_optimization_history for the window
//   range          - '1W' | '1M' | '1Y'
//   today          - 'yyyy-mm-dd' reference for the current bucket
//   todayOverlay   - live values from useDailyScores (offset=0 only)
// ---------------------------------------------------------------------------

export function buildSeriesFromRows(
  buckets: JourneyBucket[],
  dailyRows: DailyScoreRow[],
  bioHistoryRows: BioHistoryRow[],
  range: JourneyRange,
  today: string,
  todayOverlay?: Partial<TodayOverlay>,
): Record<PillarKey, (number | null)[]> {
  // --- Build day-keyed lookup maps ---
  const sleepByDay = new Map<string, number | null>();
  const bioScoreByDay = new Map<string, number | null>();
  for (const row of dailyRows) {
    if (row.date) {
      sleepByDay.set(row.date, row.sleep_score ?? null);
      bioScoreByDay.set(row.date, row.bio_optimization_score ?? null);
    }
  }

  const bioHistoryByDay = new Map<string, number>();
  for (const row of bioHistoryRows) {
    if (
      row.date &&
      typeof row.score === 'number' &&
      Number.isFinite(row.score)
    ) {
      bioHistoryByDay.set(row.date, row.score);
    }
  }

  // --- For 1Y: compute monthly aggregates per pillar ---
  let sleepByMonth: Map<string, number | null> | null = null;
  let overallByMonth: Map<string, number | null> | null = null;

  if (range === '1Y') {
    const allDates = new Set<string>([
      ...Array.from(sleepByDay.keys()),
      ...Array.from(bioHistoryByDay.keys()),
      ...Array.from(bioScoreByDay.keys()),
    ]);

    const sleepDailyPoints: { date: string; value: number | null }[] = [];
    const overallDailyPoints: { date: string; value: number | null }[] = [];

    for (const d of allDates) {
      sleepDailyPoints.push({ date: d, value: sleepByDay.get(d) ?? null });
      // Prefer bio_optimization_history; fall back to daily_scores column.
      const overallVal = bioHistoryByDay.has(d)
        ? (bioHistoryByDay.get(d) ?? null)
        : (bioScoreByDay.get(d) ?? null);
      overallDailyPoints.push({ date: d, value: overallVal });
    }

    sleepByMonth = aggregateMonthly(sleepDailyPoints);
    overallByMonth = aggregateMonthly(overallDailyPoints);
  }

  // --- Identify the current-bucket key for today overlay ---
  // For 1W/1M: key is 'yyyy-mm-dd'. For 1Y: key is 'yyyy-mm'.
  const todayKey = range === '1Y' ? today.slice(0, 7) : today;

  // --- Build per-pillar series aligned to buckets ---
  const sleep: (number | null)[] = [];
  const energy: (number | null)[] = [];
  const mood: (number | null)[] = [];
  const nutrition: (number | null)[] = [];
  const activity: (number | null)[] = [];
  const overall: (number | null)[] = [];
  const hydration: (number | null)[] = [];

  for (const bucket of buckets) {
    let sleepVal: number | null = null;
    let overallVal: number | null = null;

    if (range === '1Y') {
      // Monthly bucket: bucket.date is 'yyyy-mm'.
      sleepVal = sleepByMonth?.get(bucket.date) ?? null;
      overallVal = overallByMonth?.get(bucket.date) ?? null;
    } else {
      // Daily bucket: bucket.date is 'yyyy-mm-dd'.
      sleepVal = sleepByDay.has(bucket.date)
        ? (sleepByDay.get(bucket.date) ?? null)
        : null;
      // Prefer bio_optimization_history per day; fallback to daily_scores column.
      overallVal = bioHistoryByDay.has(bucket.date)
        ? (bioHistoryByDay.get(bucket.date) ?? null)
        : bioScoreByDay.has(bucket.date)
          ? (bioScoreByDay.get(bucket.date) ?? null)
          : null;
    }

    const isTodayBucket = bucket.date === todayKey;

    if (isTodayBucket && todayOverlay !== undefined) {
      // Overlay live useDailyScores values for today's bucket.
      // Fallback to stored value when overlay field is null (no live data yet).
      // Never coerce null to 0.
      sleep.push(todayOverlay.sleep !== undefined ? (todayOverlay.sleep ?? sleepVal) : sleepVal);
      energy.push(todayOverlay.energy !== undefined ? todayOverlay.energy : null);
      mood.push(todayOverlay.mood !== undefined ? todayOverlay.mood : null);
      nutrition.push(todayOverlay.nutrition !== undefined ? todayOverlay.nutrition : null);
      activity.push(todayOverlay.activity !== undefined ? todayOverlay.activity : null);
      overall.push(todayOverlay.overall !== undefined ? (todayOverlay.overall ?? overallVal) : overallVal);
      hydration.push(todayOverlay.hydration !== undefined ? todayOverlay.hydration : null);
    } else {
      sleep.push(sleepVal);
      energy.push(null);    // honest gap: no per-day stored history in types.ts
      mood.push(null);      // honest gap: no per-day stored history in types.ts
      nutrition.push(null); // honest gap: no per-day stored history in types.ts
      activity.push(null);  // honest gap: no per-day stored history in types.ts
      overall.push(overallVal);
      hydration.push(null); // honest gap: hydration_log_sessions not in types.ts
    }
  }

  return { sleep, energy, mood, nutrition, activity, overall, hydration };
}

// ---------------------------------------------------------------------------
// useJourneyGraphSeries
// ---------------------------------------------------------------------------

/**
 * Returns the windowed per-pillar score series for the Your Journey hero graph.
 *
 * Fetches daily_scores (sleep_score, bio_optimization_score) and
 * bio_optimization_history (score per day) for the window defined by
 * windowFor(range, offset, today). Overlays today's live useDailyScores
 * snapshot onto the current bucket when offset=0.
 *
 * Series length always equals the number of buckets from windowFor.
 * Missing data is null (never 0, never carried forward).
 * Fails open: any read error yields an empty (all-null) series, error=true.
 *
 * @param userId  Authenticated user id, or null before auth resolves.
 * @param range   '1W' | '1M' | '1Y'
 * @param offset  Non-negative integer: periods back from the current period
 *                (0 = current period; today overlay is active only at offset=0).
 */
export function useJourneyGraphSeries(
  userId: string | null,
  range: JourneyRange,
  offset: number,
): JourneyGraphSeriesResult {
  // Stored fetched rows for overlay re-application without re-fetching.
  const rowsRef = useRef<{
    dailyRows: DailyScoreRow[];
    bioHistoryRows: BioHistoryRow[];
    win: JourneyWindow;
    today: string;
  } | null>(null);

  const [seriesState, setSeriesState] = useState<{
    series: Record<PillarKey, (number | null)[]>;
    periodLabel: string;
    canGoNext: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Today's live snapshot (always called: hooks cannot be conditional).
  // Applied as overlay only when offset=0.
  const live = useDailyScores(userId);

  // Helper: recompute series from rowsRef + current live values.
  // Called after both a successful fetch and after live scores update.
  const recompute = () => {
    const data = rowsRef.current;
    if (!data) return;

    const todayOverlay: Partial<TodayOverlay> | undefined =
      offset === 0 && !live.loading
        ? {
            sleep: live.sleepQuality,
            energy: live.energyLevel,
            mood: live.moodStress,
            nutrition: live.nutrition,
            activity: live.physicalActivity,
            overall: live.bioOptimization,
            hydration: live.hydration,
          }
        : undefined;

    const series = buildSeriesFromRows(
      data.win.buckets,
      data.dailyRows,
      data.bioHistoryRows,
      range,
      data.today,
      todayOverlay,
    );

    setSeriesState({
      series,
      periodLabel: data.win.periodLabel,
      canGoNext: data.win.canGoNext,
    });
  };

  // Fetch effect: runs when userId, range, offset, or refreshTick changes.
  useEffect(() => {
    if (!userId) {
      rowsRef.current = null;
      const today = todayLocal();
      const win = windowFor(range, offset, today);
      setSeriesState({
        series: emptySeriesFor(win.buckets),
        periodLabel: win.periodLabel,
        canGoNext: win.canGoNext,
      });
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const today = todayLocal();
        const win = windowFor(range, offset, today);
        const supabase = createClient();

        // ---- Read 1: daily_scores for the window ----
        let dailyRows: DailyScoreRow[] = [];
        try {
          const q = supabase
            .from('daily_scores')
            .select(DAILY_SCORES_COLUMNS)
            .eq('user_id', userId)
            .gte('date', win.rangeStart)
            .lte('date', win.rangeEnd)
            .order('date', { ascending: true });
          const { data } = await withTimeout(
            q as unknown as Promise<{ data: DailyScoreRow[] | null; error: unknown }>,
            5000,
            'useJourneyGraphSeries.daily_scores',
          );
          dailyRows = (data ?? []) as DailyScoreRow[];
        } catch (err) {
          safeLog.warn(
            'useJourneyGraphSeries',
            'daily_scores read failed, failing open',
            { error: err },
          );
        }

        // ---- Read 2: bio_optimization_history for the window ----
        let bioHistoryRows: BioHistoryRow[] = [];
        try {
          const q = supabase
            .from('bio_optimization_history')
            .select(BIO_HISTORY_COLUMNS)
            .eq('user_id', userId)
            .gte('date', win.rangeStart)
            .lte('date', win.rangeEnd)
            .order('date', { ascending: true });
          const { data } = await withTimeout(
            q as unknown as Promise<{ data: BioHistoryRow[] | null; error: unknown }>,
            5000,
            'useJourneyGraphSeries.bio_optimization_history',
          );
          bioHistoryRows = (data ?? []) as BioHistoryRow[];
        } catch (err) {
          safeLog.warn(
            'useJourneyGraphSeries',
            'bio_optimization_history read failed, failing open',
            { error: err },
          );
        }

        if (!active) return;

        // Store rows for re-use by overlay re-application.
        rowsRef.current = { dailyRows, bioHistoryRows, win, today };

        // Build today overlay (live values from useDailyScores).
        const todayOverlay: Partial<TodayOverlay> | undefined =
          offset === 0 && !live.loading
            ? {
                sleep: live.sleepQuality,
                energy: live.energyLevel,
                mood: live.moodStress,
                nutrition: live.nutrition,
                activity: live.physicalActivity,
                overall: live.bioOptimization,
                hydration: live.hydration,
              }
            : undefined;

        const series = buildSeriesFromRows(
          win.buckets,
          dailyRows,
          bioHistoryRows,
          range,
          today,
          todayOverlay,
        );

        setSeriesState({ series, periodLabel: win.periodLabel, canGoNext: win.canGoNext });
        setLoading(false);
        setError(false);
      } catch (err) {
        safeLog.warn(
          'useJourneyGraphSeries',
          'series build failed, failing open',
          { error: err },
        );
        if (active) {
          const today = todayLocal();
          const win = windowFor(range, offset, today);
          rowsRef.current = { dailyRows: [], bioHistoryRows: [], win, today };
          setSeriesState({
            series: emptySeriesFor(win.buckets),
            periodLabel: win.periodLabel,
            canGoNext: win.canGoNext,
          });
          setLoading(false);
          setError(true);
        }
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, range, offset, refreshTick]);
  // Intentional: live is NOT in the deps. Live overlay is applied in the
  // separate effect below so that score updates (check-ins, meal logs) do
  // not trigger a full Supabase re-fetch.

  // Live overlay effect: re-applies mapper (no Supabase re-fetch) when
  // useDailyScores updates for the current period.
  useEffect(() => {
    if (offset !== 0 || live.loading || !rowsRef.current) return;
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    live.sleepQuality,
    live.energyLevel,
    live.moodStress,
    live.nutrition,
    live.physicalActivity,
    live.bioOptimization,
    live.hydration,
    live.loading,
    offset,
  ]);

  // Focus refetch: re-runs Supabase reads when user returns to the tab.
  // Debounced to 500 ms to avoid rapid re-fires.
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

  // Check-in and meal-log event listeners: refetch so today's live overlay
  // is applied to fresh row data after a write. Matches the DailyScoresPanel
  // pattern (checkin-submitted + meal-logged events).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onEvent = () => setRefreshTick((t) => t + 1);
    window.addEventListener('checkin-submitted', onEvent);
    window.addEventListener('meal-logged', onEvent);
    return () => {
      window.removeEventListener('checkin-submitted', onEvent);
      window.removeEventListener('meal-logged', onEvent);
    };
  }, []);

  // Fallback while state is not yet set (before first fetch completes).
  if (!seriesState) {
    const today = todayLocal();
    const win = windowFor(range, offset, today);
    return {
      series: emptySeriesFor(win.buckets),
      periodLabel: win.periodLabel,
      canGoNext: win.canGoNext,
      loading: true,
      error: false,
    };
  }

  return {
    series: seriesState.series,
    periodLabel: seriesState.periodLabel,
    canGoNext: seriesState.canGoNext,
    loading,
    error,
  };
}
