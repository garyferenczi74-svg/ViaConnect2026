// Nutrition source for the Bio Optimization Score compute bundle.
//
// Primary table: meal_logs (21 cols, active).
// Pulls two slices:
//   1. Latest logged_at for last_engaged_at.
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
  meal_date?: string | null;
  log_method?: string | null;
  calories?: number | null;
  photo_url?: string | null;
  logged_at?: string | null;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function windowStart(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
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
    const latest = await supabase
      .from('meal_logs')
      .select('logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const thirtyAgo = windowStart(30);
    const recent = await supabase
      .from('meal_logs')
      .select('meal_date, log_method, calories, photo_url')
      .eq('user_id', userId)
      .gte('meal_date', thirtyAgo);

    if (latest.error && recent.error) {
      return empty;
    }

    const latestRow = (latest.error ? null : latest.data) as { logged_at?: string | null } | null;
    const rows = (recent.error ? [] : (recent.data as MealLogRow[] | null) ?? []) as MealLogRow[];

    const sevenAgo = windowStart(7);
    const within7 = rows.filter((r) => (r.meal_date ?? '') >= sevenAgo);
    const within30 = rows;

    const calorieSum7 = within7.reduce((sum, r) => sum + (Number(r.calories) || 0), 0);
    const calorie_avg_7d = within7.length > 0 ? Math.round(calorieSum7 / within7.length) : 0;

    const log_method_distribution: Record<string, number> = {};
    for (const r of within30) {
      const k = r.log_method ?? 'unknown';
      log_method_distribution[k] = (log_method_distribution[k] ?? 0) + 1;
    }
    const has_photo_uploads = within30.some((r) => Boolean(r.photo_url));

    return {
      last_engaged_at: latestRow?.logged_at ?? null,
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
