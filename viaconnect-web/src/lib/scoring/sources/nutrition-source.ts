// Nutrition source for the Bio Optimization Score compute bundle.
//
// Prompt 168 Apply C: reads UNION of `meals` (canonical post-cutover) and
// `meal_logs` (legacy). Dedupe via meals.legacy_nutrition_log_id matching
// meal_logs.id when the dual-write window emitted both rows. Counts, latest
// engagement, calorie average, log method distribution, and photo presence
// all reflect the unioned dataset.
//
// Pulls two slices:
//   1. Latest logged_at across both tables for last_engaged_at.
//   2. 30-day window of rows for 7-day / 30-day counts and aggregates.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface NutritionSource {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
  source_specific?: {
    calorie_avg_7d: number;
    log_method_distribution: Record<string, number>;
    has_photo_uploads: boolean;
  };
}

interface MealLogRow {
  id?: string | null;
  meal_date?: string | null;
  log_method?: string | null;
  calories?: number | null;
  photo_url?: string | null;
  logged_at?: string | null;
}

interface MealRow {
  meal_id?: string | null;
  logged_at?: string | null;
  calories_kcal?: number | null;
  source?: string | null;
  legacy_nutrition_log_id?: string | null;
}

interface UnifiedRow {
  id: string;
  logged_at: string;
  date_key: string;
  calories: number;
  log_method: string;
  has_photo: boolean;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function windowStart(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return dateOnly(d);
}

function isoToDateKey(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return dateOnly(d);
}

export async function getNutritionSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<NutritionSource> {
  const empty: NutritionSource = {
    last_engaged_at: null,
    recent_events_7d: 0,
    recent_events_30d: 0,
    source_specific: {
      calorie_avg_7d: 0,
      log_method_distribution: {},
      has_photo_uploads: false,
    },
  };

  try {
    const thirtyAgo = windowStart(30);
    const thirtyAgoIso = `${thirtyAgo}T00:00:00.000Z`;

    const legacyPromise = supabase
      .from('meal_logs')
      .select('id, meal_date, log_method, calories, photo_url, logged_at')
      .eq('user_id', userId)
      .gte('meal_date', thirtyAgo);

    const mealsPromise = supabase
      .from('meals')
      .select('meal_id, logged_at, calories_kcal, source, legacy_nutrition_log_id')
      .eq('user_id', userId)
      .gte('logged_at', thirtyAgoIso);

    const [legacyRes, mealsRes] = await Promise.all([legacyPromise, mealsPromise]);

    // Treat missing-table errors (PGRST205) as empty rather than fatal so the
    // BOS sub-score keeps producing a value during the transition window.
    const legacyRows: MealLogRow[] = !legacyRes.error && Array.isArray(legacyRes.data)
      ? (legacyRes.data as MealLogRow[])
      : [];
    const mealRows: MealRow[] = !mealsRes.error && Array.isArray(mealsRes.data)
      ? (mealsRes.data as MealRow[])
      : [];

    if (legacyRes.error && mealsRes.error) {
      // Both tables down; return empty rather than crash the BOS bundle.
      return empty;
    }

    // Dedupe: meals row with legacy_nutrition_log_id supersedes the legacy row.
    const supersededLegacyIds = new Set<string>();
    for (const m of mealRows) {
      const link = m.legacy_nutrition_log_id;
      if (typeof link === 'string' && link.trim() !== '') {
        supersededLegacyIds.add(link);
      }
    }

    const unified: UnifiedRow[] = [];
    for (const m of mealRows) {
      const id = typeof m.meal_id === 'string' ? m.meal_id : '';
      const iso = typeof m.logged_at === 'string' ? m.logged_at : '';
      unified.push({
        id,
        logged_at: iso,
        date_key: isoToDateKey(iso),
        calories: Number(m.calories_kcal) || 0,
        log_method: typeof m.source === 'string' ? m.source : 'unknown',
        has_photo: m.source === 'photo_ai',
      });
    }
    for (const r of legacyRows) {
      const id = typeof r.id === 'string' ? r.id : '';
      if (id !== '' && supersededLegacyIds.has(id)) continue;
      const iso = typeof r.logged_at === 'string' ? r.logged_at : '';
      unified.push({
        id,
        logged_at: iso,
        date_key: r.meal_date ?? isoToDateKey(iso),
        calories: Number(r.calories) || 0,
        log_method: r.log_method ?? 'unknown',
        has_photo: Boolean(r.photo_url),
      });
    }

    const sevenAgo = windowStart(7);
    const within7 = unified.filter((u) => (u.date_key ?? '') >= sevenAgo);
    const within30 = unified;

    const calorieSum7 = within7.reduce((sum, u) => sum + u.calories, 0);
    const calorie_avg_7d = within7.length > 0 ? Math.round(calorieSum7 / within7.length) : 0;

    const log_method_distribution: Record<string, number> = {};
    for (const u of within30) {
      const k = u.log_method || 'unknown';
      log_method_distribution[k] = (log_method_distribution[k] ?? 0) + 1;
    }
    const has_photo_uploads = within30.some((u) => u.has_photo);

    let last_engaged_at: string | null = null;
    let latestMs = -Infinity;
    for (const u of unified) {
      const t = u.logged_at ? Date.parse(u.logged_at) : NaN;
      if (Number.isFinite(t) && t > latestMs) {
        latestMs = t;
        last_engaged_at = u.logged_at;
      }
    }

    return {
      last_engaged_at,
      recent_events_7d: within7.length,
      recent_events_30d: within30.length,
      source_specific: {
        calorie_avg_7d,
        log_method_distribution,
        has_photo_uploads,
      },
    };
  } catch {
    return empty;
  }
}
