// Caffeine timing source for the Bio Optimization Score compute bundle.
//
// Prompt 171b Phase 1. Reads caffeine_mg from meal_items + logged_at from
// meals across the last 24 hours, plus the user's sleep window from profiles
// (defaulting to 23:00 to 07:00 when not yet set via CAQ Phase 7). For each
// caffeinated meal, computes a circadian-impact summary that lets Hannah
// reason about sleep onset disruption when computing the Bio Optimization
// Score.
//
// 10th source slice per the gather list in bio-optimization-score.ts. The
// first 9 sources are diagnostic_foundation (CAQ + Labs + Genetics) and the
// six engagement levers; caffeine timing is a sibling signal that informs
// the score without being framed as a lever.
//
// Empty data behavior: when no caffeine has been logged in the last 24 hours
// (the case for every user at Phase 1 ship time since caffeine_mg is brand
// new), has_data is false and the impact summaries array is empty. Hannah's
// prompt explicitly handles this case as neutral (no penalty for users
// without caffeine data).

import type { SupabaseClient } from '@supabase/supabase-js';

export type CaffeineImpactCategory = 'none' | 'mild' | 'moderate' | 'severe';
export type CaffeineSleepWindowSource = 'caq_phase_7' | 'default';

export interface CaffeineMealImpactSummary {
  consumed_at: string;
  caffeine_mg: number;
  hours_to_sleep_window: number;
  estimated_pct_remaining_at_sleep_onset: number;
  impact_category: CaffeineImpactCategory;
}

export interface CaffeineSleepWindow {
  sleep_start: string;
  wake_time: string;
  source: CaffeineSleepWindowSource;
}

export interface CaffeineTimingSource {
  has_data: boolean;
  data_window_hours: number;
  total_caffeine_mg_24h: number;
  per_meal_impact_summaries: CaffeineMealImpactSummary[];
  sleep_window: CaffeineSleepWindow;
}

const DATA_WINDOW_HOURS = 24;
const CAFFEINE_HALF_LIFE_HOURS = 5;
const DEFAULT_SLEEP_START = '23:00';
const DEFAULT_SLEEP_WAKE = '07:00';

interface ProfileSleepRow {
  sleep_start?: string | null;
  sleep_wake?: string | null;
}

interface MealCaffeineRow {
  caffeine_mg?: number | string | null;
  meals?: { logged_at?: string | null; user_id?: string | null } | null;
}

function normalizeTimeString(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  // Accept HH:MM or HH:MM:SS; return HH:MM.
  const m = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

function hoursBetween(consumedAtIso: string, sleepStartTime: string): number {
  // Approximate: treats sleep_start as the next occurrence of HH:MM in UTC
  // after consumed_at. Timezone-aware refinement is deferred to a future
  // 171b supplement; for v1 the approximation is acceptable per the filing.
  const consumed = new Date(consumedAtIso);
  if (Number.isNaN(consumed.getTime())) return 0;
  const [h, m] = sleepStartTime.split(':').map((s) => Number(s));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  const sleepOnset = new Date(consumed);
  sleepOnset.setUTCHours(h, m, 0, 0);
  if (sleepOnset.getTime() <= consumed.getTime()) {
    // Sleep window passes after the consumption hour; roll to next day.
    sleepOnset.setUTCDate(sleepOnset.getUTCDate() + 1);
  }
  const diffMs = sleepOnset.getTime() - consumed.getTime();
  return diffMs / (1000 * 60 * 60);
}

function pctRemaining(hoursToSleep: number): number {
  if (!Number.isFinite(hoursToSleep) || hoursToSleep < 0) return 1;
  return Math.pow(0.5, hoursToSleep / CAFFEINE_HALF_LIFE_HOURS);
}

function impactCategoryFromPct(pct: number): CaffeineImpactCategory {
  if (pct < 0.10) return 'none';
  if (pct < 0.25) return 'mild';
  if (pct < 0.50) return 'moderate';
  return 'severe';
}

async function readSleepWindow(
  userId: string,
  supabase: SupabaseClient,
): Promise<CaffeineSleepWindow> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('sleep_start, sleep_wake')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      return {
        sleep_start: DEFAULT_SLEEP_START,
        wake_time: DEFAULT_SLEEP_WAKE,
        source: 'default',
      };
    }
    const row = data as ProfileSleepRow;
    const sleepStart = normalizeTimeString(row.sleep_start ?? null);
    const sleepWake = normalizeTimeString(row.sleep_wake ?? null);
    if (sleepStart === null || sleepWake === null) {
      return {
        sleep_start: DEFAULT_SLEEP_START,
        wake_time: DEFAULT_SLEEP_WAKE,
        source: 'default',
      };
    }
    return {
      sleep_start: sleepStart,
      wake_time: sleepWake,
      source: 'caq_phase_7',
    };
  } catch {
    return {
      sleep_start: DEFAULT_SLEEP_START,
      wake_time: DEFAULT_SLEEP_WAKE,
      source: 'default',
    };
  }
}

async function readCaffeineMeals(
  userId: string,
  supabase: SupabaseClient,
): Promise<MealCaffeineRow[]> {
  try {
    const cutoff = new Date(Date.now() - DATA_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('meal_items')
      .select('caffeine_mg, meals!inner(logged_at, user_id)')
      .eq('meals.user_id', userId)
      .gt('caffeine_mg', 0)
      .gte('meals.logged_at', cutoff);
    if (error || !Array.isArray(data)) return [];
    return data as MealCaffeineRow[];
  } catch {
    return [];
  }
}

export async function getCaffeineTimingSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<CaffeineTimingSource> {
  const sleepWindow = await readSleepWindow(userId, supabase);
  const rows = await readCaffeineMeals(userId, supabase);

  const summaries: CaffeineMealImpactSummary[] = [];
  let totalMg = 0;

  for (const row of rows) {
    const caffeineMg = Number(row.caffeine_mg);
    const loggedAt = row.meals?.logged_at;
    if (!Number.isFinite(caffeineMg) || caffeineMg <= 0) continue;
    if (typeof loggedAt !== 'string' || loggedAt.length === 0) continue;
    const hours = hoursBetween(loggedAt, sleepWindow.sleep_start);
    const pct = pctRemaining(hours);
    summaries.push({
      consumed_at: loggedAt,
      caffeine_mg: Math.round(caffeineMg * 100) / 100,
      hours_to_sleep_window: Math.round(hours * 100) / 100,
      estimated_pct_remaining_at_sleep_onset: Math.round(pct * 1000) / 1000,
      impact_category: impactCategoryFromPct(pct),
    });
    totalMg += caffeineMg;
  }

  summaries.sort((a, b) => a.consumed_at.localeCompare(b.consumed_at));

  return {
    has_data: summaries.length > 0,
    data_window_hours: DATA_WINDOW_HOURS,
    total_caffeine_mg_24h: Math.round(totalMg * 100) / 100,
    per_meal_impact_summaries: summaries,
    sleep_window: sleepWindow,
  };
}
