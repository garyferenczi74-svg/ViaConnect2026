'use client';

/**
 * src/components/journey/coaching/useJourneyGraphSeries.ts
 *
 * Prompt 208k Task T2 (REWORK 2026-06-28): Windowed per-pillar journey graph
 * series hook that MATCHES THE DASHBOARD by recomputing each past day with the
 * Dashboard's own scoring engine.
 *
 * Why the rework: live-schema introspection confirmed daily_scores has NO
 * wellness-pillar columns (only sleep_score wearable + daily_composite +
 * bio_optimization_score; date column is `date`). The analytics
 * useBioOptimizationTrend per-pillar select hits non-existent columns and is
 * broken. So historical per-pillar values are derived the SAME way the
 * Dashboard derives today's gauges: read each day's daily_checkins +
 * meal_logs and run mapCheckInToScoringInput -> calculateDailyScores plus the
 * meal_score nutrition override, exactly as src/hooks/journey/useDailyScores.ts.
 *
 * Per-day sources (all verified in src/lib/supabase/types.ts):
 *   - daily_checkins (check_in_date): sleep_hours, sleep_quality_score,
 *     energy_recovery_score, stress_level_score, cardio_active,
 *     cardio_duration_min, resistance_active, resistance_duration_min,
 *     activity_level_score -> mapCheckInToScoringInput
 *   - meal_logs (meal_date): meal_type, calories, protein_g, carbs_g, fat_g,
 *     quality_rating, meal_score -> nutrition (meal_score average override)
 *   - bio_optimization_history (date): score -> the Bio Optimization (overall)
 *     line. NEVER profiles.vitality_score.
 *   - hydration: no faithfully reconstructable per-day historical source exists
 *     (hydration_log_sessions absent from types.ts; hydration_reconciliation
 *     holds only targets, no per-day consumed volume). Past-day hydration is an
 *     honest null gap; today is filled live by the useDailyScores overlay.
 *
 * Pillar gap rule: a pillar with no data is null (a gap), NEVER 0, NEVER carried
 * forward. The engine's blend() returns score 0 at confidence 0; this hook maps
 * confidence 0 to null so the 0 is never surfaced.
 *
 * Today (offset 0): the current bucket is overlaid with the live useDailyScores
 * snapshot so it equals the Dashboard gauges and updates live.
 *
 * 1Y: per-day pillar values are aggregated to monthly buckets via T1
 * aggregateMonthly; a month with no data is null.
 *
 * Resilience: one windowed read per table, each withTimeout 5000 ms, try/catch
 * fail open to an empty series, safeLog.warn on failure, all reads scoped to
 * userId under RLS. Focus refetch + checkin-submitted / meal-logged listeners.
 *
 * Rules: no em-dashes, no en-dashes, no emojis, no new dependency.
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
import {
  calculateDailyScores,
  mapCheckInToScoringInput,
  getScoreColor,
  type MealLogData,
} from '@/lib/scoring/dailyScoreEngineV2';
import { useDailyScores } from '@/hooks/journey/useDailyScores';

// ---------------------------------------------------------------------------
// Column constants (centralized so the reads never drift)
// ---------------------------------------------------------------------------

/** daily_checkins columns mapCheckInToScoringInput needs, plus the date key. */
export const CHECKIN_COLUMNS =
  'check_in_date, sleep_hours, sleep_quality_score, energy_recovery_score, stress_level_score, cardio_active, cardio_duration_min, resistance_active, resistance_duration_min, activity_level_score' as const;

/** meal_logs columns useDailyScores reads, plus the date key. */
export const MEAL_COLUMNS =
  'meal_date, meal_type, calories, protein_g, carbs_g, fat_g, quality_rating, meal_score' as const;

/** bio_optimization_history columns for the Bio Optimization line. */
export const BIO_HISTORY_COLUMNS = 'date, score' as const;

// ---------------------------------------------------------------------------
// Pillar keys (MUST match the key field in the PILLARS array in
// src/components/journey/YourJourneyCoaching.tsx).
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

export interface JourneyCheckinRow {
  check_in_date: string;
  sleep_hours: number | null;
  sleep_quality_score: number | null;
  energy_recovery_score: number | null;
  stress_level_score: number | null;
  cardio_active: boolean | null;
  cardio_duration_min: number | null;
  resistance_active: boolean | null;
  resistance_duration_min: number | null;
  activity_level_score: number | null;
}

export interface JourneyMealRow {
  meal_date: string;
  meal_type: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  quality_rating: number | null;
  meal_score: number | null;
}

export interface BioHistoryRow {
  date: string;
  score: number;
}

/** The five engine-derived wellness pillars for a single day. */
export interface DayPillars {
  sleep: number | null;
  energy: number | null;
  mood: number | null;
  nutrition: number | null;
  activity: number | null;
}

/** Live snapshot used to overlay today's bucket (from useDailyScores). */
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
  buckets: JourneyBucket[];
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
// emptySeriesFor: per-pillar series of null gaps sized to buckets.
// ---------------------------------------------------------------------------

function emptySeriesFor(
  buckets: JourneyBucket[],
): Record<PillarKey, (number | null)[]> {
  return Object.fromEntries(
    PILLAR_KEYS.map((k) => [k, buckets.map(() => null)]),
  ) as Record<PillarKey, (number | null)[]>;
}

// ---------------------------------------------------------------------------
// computeDayPillars (exported for TDD)
//
// The heart of the task. Reproduces the EXACT path used by
// src/hooks/journey/useDailyScores.ts for a single calendar day so historical
// values equal the Dashboard gauges:
//   1. mapCheckInToScoringInput(checkinRow) -> DailyCheckinData (or null)
//   2. map meal rows to the engine's meal shape
//   3. calculateDailyScores(checkinData, mealLog, null)
//   4. meal_score nutrition override (average meal_logs.meal_score, then
//      quality_rating * 25 fallback) and overall recompute, exactly as
//      useDailyScores Step 5. There is no localStorage cache for history, so the
//      cached-meal supplement step is omitted (it only applies to "today").
//   5. map each gauge to its score, or null when confidence is 0 (a gap).
//
// daily_scores.sleep_score is deliberately NOT used: it is a wearable metric,
// not the check-in sleep_quality the gauge uses. Pure, deterministic, no I/O.
// ---------------------------------------------------------------------------

export function computeDayPillars(
  checkinRow: JourneyCheckinRow | null,
  mealRows: JourneyMealRow[],
): DayPillars {
  const checkinData = checkinRow
    ? mapCheckInToScoringInput(checkinRow as unknown as Record<string, unknown>)
    : null;

  const dbMeals = mealRows.map((m) => ({
    meal_type: m.meal_type,
    calories: m.calories,
    protein_grams: m.protein_g,
    carbs_grams: m.carbs_g,
    fats_grams: m.fat_g,
    includes_vegetables: false,
    includes_whole_grains: false,
    includes_lean_protein: false,
    meal_quality_rating: m.quality_rating,
  }));

  const dbMealScores = mealRows
    .map((m) => m.meal_score)
    .filter((s): s is number => s !== null && s !== undefined);

  const mealLog: MealLogData = dbMeals.length > 0 ? { meals: dbMeals } : { meals: [] };

  const result = calculateDailyScores(
    checkinData,
    mealLog.meals.length > 0 ? mealLog : null,
    null,
  );

  // ---- meal_score nutrition override (mirrors useDailyScores Step 5) ----
  // Primary: meal_score average from DB rows.
  const mealScores: number[] = [...dbMealScores];

  // Final fallback: quality_rating * 25 from DB meals (no localStorage cache
  // for history; the cached-meal supplement step in useDailyScores is omitted).
  if (mealScores.length === 0) {
    for (const m of dbMeals) {
      if (m.meal_quality_rating != null) {
        mealScores.push(Math.min(100, Math.max(0, m.meal_quality_rating * 25)));
      }
    }
  }

  if (mealScores.length > 0) {
    const avg = Math.round(mealScores.reduce((s, v) => s + v, 0) / mealScores.length);
    result.nutrition = {
      ...result.nutrition,
      score: avg,
      manualScore: avg,
      manualWeight: 1,
      wearableWeight: 0,
      confidence: Math.min(1, 0.4 + mealScores.length * 0.15),
      color: getScoreColor(avg),
    };
    // Recompute overall so the new nutrition value is reflected (mirrors
    // useDailyScores; the engine overall is not used for the series line but
    // is recomputed to keep the per-day mirror faithful).
    const active2 = [result.sleep, result.energy, result.moodStress, result.nutrition, result.activity]
      .filter((g) => g.confidence > 0);
    if (active2.length > 0) {
      const overallScore = Math.round(active2.reduce((s, g) => s + g.score, 0) / active2.length);
      result.overall = {
        ...result.overall,
        score: overallScore,
        confidence: active2.length / 5,
        color: getScoreColor(overallScore),
      };
    }
  }

  // confidence 0 means no data for that pillar -> null gap (never the 0 score).
  return {
    sleep: result.sleep.confidence > 0 ? result.sleep.score : null,
    energy: result.energy.confidence > 0 ? result.energy.score : null,
    mood: result.moodStress.confidence > 0 ? result.moodStress.score : null,
    nutrition: result.nutrition.confidence > 0 ? result.nutrition.score : null,
    activity: result.activity.confidence > 0 ? result.activity.score : null,
  };
}

// ---------------------------------------------------------------------------
// buildSeriesFromRows (exported for TDD)
//
// Pure, deterministic per-bucket assembly. Given the window buckets and the
// raw windowed rows, produces a per-pillar series aligned index-for-index to
// buckets.
//
//   sleep/energy/mood/nutrition/activity -> computeDayPillars for the day
//   overall                              -> bio_optimization_history.score
//   hydration                            -> null gap for past days
//
// 1W and 1M: each bucket is a day; join rows by exact date.
// 1Y: compute per-day pillar values across the window then aggregate to monthly
//     via aggregateMonthly (T1); a month with no data is null.
//
// Today (date === today, overlay present): the live overlay replaces that day's
// values (a null overlay field falls back to the recomputed value). For 1Y the
// overlay is injected as today's per-day point so it joins its month average.
//
// Rows outside the window simply never match a bucket date / bucket month and
// are ignored. Never emits 0 for missing data; never references vitality_score.
// ---------------------------------------------------------------------------

export function buildSeriesFromRows(
  buckets: JourneyBucket[],
  checkinRows: JourneyCheckinRow[],
  mealRows: JourneyMealRow[],
  bioHistoryRows: BioHistoryRow[],
  range: JourneyRange,
  today: string,
  todayOverlay?: Partial<TodayOverlay>,
): Record<PillarKey, (number | null)[]> {
  // --- Index rows by date ---
  const checkinByDate = new Map<string, JourneyCheckinRow>();
  for (const r of checkinRows) {
    if (r.check_in_date) checkinByDate.set(r.check_in_date, r);
  }

  const mealsByDate = new Map<string, JourneyMealRow[]>();
  for (const r of mealRows) {
    if (!r.meal_date) continue;
    const list = mealsByDate.get(r.meal_date) ?? [];
    list.push(r);
    mealsByDate.set(r.meal_date, list);
  }

  const bioByDate = new Map<string, number>();
  for (const r of bioHistoryRows) {
    if (r.date && typeof r.score === 'number' && Number.isFinite(r.score)) {
      bioByDate.set(r.date, r.score);
    }
  }

  const hasOverlay = todayOverlay !== undefined;

  // Compute a single day's full 7-pillar values from stored rows (no overlay).
  function dayValues(date: string): Record<PillarKey, number | null> {
    const dp = computeDayPillars(
      checkinByDate.get(date) ?? null,
      mealsByDate.get(date) ?? [],
    );
    return {
      sleep: dp.sleep,
      energy: dp.energy,
      mood: dp.mood,
      nutrition: dp.nutrition,
      activity: dp.activity,
      overall: bioByDate.get(date) ?? null,
      hydration: null, // honest gap: no per-day historical hydration source
    };
  }

  // Today's values with the live overlay applied. A provided-but-null overlay
  // field falls back to the recomputed value (never coerced to 0); an omitted
  // field keeps the recomputed value.
  function todayValues(date: string): Record<PillarKey, number | null> {
    const base = dayValues(date);
    if (!hasOverlay) return base;
    const o = todayOverlay as Partial<TodayOverlay>;
    return {
      sleep: o.sleep !== undefined ? (o.sleep ?? base.sleep) : base.sleep,
      energy: o.energy !== undefined ? (o.energy ?? base.energy) : base.energy,
      mood: o.mood !== undefined ? (o.mood ?? base.mood) : base.mood,
      nutrition: o.nutrition !== undefined ? (o.nutrition ?? base.nutrition) : base.nutrition,
      activity: o.activity !== undefined ? (o.activity ?? base.activity) : base.activity,
      overall: o.overall !== undefined ? (o.overall ?? base.overall) : base.overall,
      // hydration today is live-only; honor a provided value even when null.
      hydration: o.hydration !== undefined ? o.hydration : base.hydration,
    };
  }

  const series = emptySeriesFor(buckets);

  // --- Daily ranges: bucket == day ---
  if (range !== '1Y') {
    buckets.forEach((b, i) => {
      const vals = hasOverlay && b.date === today ? todayValues(b.date) : dayValues(b.date);
      for (const k of PILLAR_KEYS) series[k][i] = vals[k];
    });
    return series;
  }

  // --- 1Y: per-day compute then monthly aggregation ---
  const dayDates = new Set<string>([
    ...Array.from(checkinByDate.keys()),
    ...Array.from(mealsByDate.keys()),
    ...Array.from(bioByDate.keys()),
  ]);
  // Ensure today is represented so the live overlay joins its month average.
  if (hasOverlay) dayDates.add(today);

  const pointsByPillar = Object.fromEntries(
    PILLAR_KEYS.map((k) => [k, [] as { date: string; value: number | null }[]]),
  ) as Record<PillarKey, { date: string; value: number | null }[]>;

  for (const date of dayDates) {
    const vals = hasOverlay && date === today ? todayValues(date) : dayValues(date);
    for (const k of PILLAR_KEYS) {
      pointsByPillar[k].push({ date, value: vals[k] });
    }
  }

  const aggByPillar = Object.fromEntries(
    PILLAR_KEYS.map((k) => [k, aggregateMonthly(pointsByPillar[k])]),
  ) as Record<PillarKey, Map<string, number | null>>;

  buckets.forEach((b, i) => {
    for (const k of PILLAR_KEYS) {
      series[k][i] = aggByPillar[k].get(b.date) ?? null;
    }
  });

  return series;
}

// ---------------------------------------------------------------------------
// useJourneyGraphSeries
// ---------------------------------------------------------------------------

/**
 * Returns the windowed per-pillar score series for the Your Journey hero graph,
 * recomputing each past day with the Dashboard scoring engine so history equals
 * the Dashboard gauges. Today's bucket is overlaid with the live useDailyScores
 * snapshot.
 *
 * Series arrays are aligned index-for-index to the returned buckets. Missing
 * data is null (never 0). Fails open: any read error yields an empty (all-null)
 * series with error=true.
 *
 * @param userId  Authenticated user id, or null before auth resolves.
 * @param range   '1W' | '1M' | '1Y'
 * @param offset  Non-negative periods back from the current period (0 = current;
 *                the live today overlay is active only at offset 0).
 */
export function useJourneyGraphSeries(
  userId: string | null,
  range: JourneyRange,
  offset: number,
): JourneyGraphSeriesResult {
  const rowsRef = useRef<{
    checkinRows: JourneyCheckinRow[];
    mealRows: JourneyMealRow[];
    bioHistoryRows: BioHistoryRow[];
    win: JourneyWindow;
    today: string;
  } | null>(null);

  const [state, setState] = useState<{
    buckets: JourneyBucket[];
    series: Record<PillarKey, (number | null)[]>;
    periodLabel: string;
    canGoNext: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Today's live snapshot (hooks cannot be conditional). Overlaid at offset 0.
  const live = useDailyScores(userId);

  // Build the today overlay from the live snapshot when on the current period.
  const overlayFor = (): Partial<TodayOverlay> | undefined =>
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

  // Recompute series from stored rows + current live overlay (no re-fetch).
  const recompute = () => {
    const data = rowsRef.current;
    if (!data) return;
    const series = buildSeriesFromRows(
      data.win.buckets,
      data.checkinRows,
      data.mealRows,
      data.bioHistoryRows,
      range,
      data.today,
      overlayFor(),
    );
    setState({
      buckets: data.win.buckets,
      series,
      periodLabel: data.win.periodLabel,
      canGoNext: data.win.canGoNext,
    });
  };

  // Fetch effect.
  useEffect(() => {
    const today = todayLocal();
    const win = windowFor(range, offset, today);

    if (!userId) {
      rowsRef.current = null;
      setState({
        buckets: win.buckets,
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
        const supabase = createClient();

        // ---- Read 1: daily_checkins windowed by check_in_date ----
        let checkinRows: JourneyCheckinRow[] = [];
        try {
          const q = supabase
            .from('daily_checkins')
            .select(CHECKIN_COLUMNS)
            .eq('user_id', userId)
            .gte('check_in_date', win.rangeStart)
            .lte('check_in_date', win.rangeEnd)
            .order('check_in_date', { ascending: true });
          const { data } = await withTimeout(
            q as unknown as Promise<{ data: JourneyCheckinRow[] | null; error: unknown }>,
            5000,
            'useJourneyGraphSeries.daily_checkins',
          );
          checkinRows = (data ?? []) as JourneyCheckinRow[];
        } catch (err) {
          safeLog.warn('useJourneyGraphSeries', 'daily_checkins read failed, failing open', { error: err });
        }

        // ---- Read 2: meal_logs windowed by meal_date ----
        let mealRows: JourneyMealRow[] = [];
        try {
          const q = supabase
            .from('meal_logs')
            .select(MEAL_COLUMNS)
            .eq('user_id', userId)
            .gte('meal_date', win.rangeStart)
            .lte('meal_date', win.rangeEnd)
            .order('meal_date', { ascending: true });
          const { data } = await withTimeout(
            q as unknown as Promise<{ data: JourneyMealRow[] | null; error: unknown }>,
            5000,
            'useJourneyGraphSeries.meal_logs',
          );
          mealRows = (data ?? []) as JourneyMealRow[];
        } catch (err) {
          safeLog.warn('useJourneyGraphSeries', 'meal_logs read failed, failing open', { error: err });
        }

        // ---- Read 3: bio_optimization_history windowed by date ----
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
          safeLog.warn('useJourneyGraphSeries', 'bio_optimization_history read failed, failing open', { error: err });
        }

        if (!active) return;

        rowsRef.current = { checkinRows, mealRows, bioHistoryRows, win, today };

        const series = buildSeriesFromRows(
          win.buckets,
          checkinRows,
          mealRows,
          bioHistoryRows,
          range,
          today,
          overlayFor(),
        );

        setState({
          buckets: win.buckets,
          series,
          periodLabel: win.periodLabel,
          canGoNext: win.canGoNext,
        });
        setLoading(false);
        setError(false);
      } catch (err) {
        safeLog.warn('useJourneyGraphSeries', 'series build failed, failing open', { error: err });
        if (active) {
          rowsRef.current = { checkinRows: [], mealRows: [], bioHistoryRows: [], win, today };
          setState({
            buckets: win.buckets,
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
  // Intentional: live is NOT a dep here. The live overlay is re-applied in the
  // effect below without a full Supabase re-fetch.

  // Live overlay effect: re-apply the mapper (no re-fetch) when useDailyScores
  // updates for the current period (check-in, meal log, hydration change).
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

  // Focus refetch (debounced 500 ms) so returning to the tab refreshes rows.
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

  // Check-in / meal-log listeners: refetch so fresh rows feed the live overlay
  // (mirrors DailyScoresPanel's checkin-submitted + meal-logged events).
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

  // Fallback before the first fetch resolves.
  if (!state) {
    const today = todayLocal();
    const win = windowFor(range, offset, today);
    return {
      buckets: win.buckets,
      series: emptySeriesFor(win.buckets),
      periodLabel: win.periodLabel,
      canGoNext: win.canGoNext,
      loading: true,
      error: false,
    };
  }

  return {
    buckets: state.buckets,
    series: state.series,
    periodLabel: state.periodLabel,
    canGoNext: state.canGoNext,
    loading,
    error,
  };
}
