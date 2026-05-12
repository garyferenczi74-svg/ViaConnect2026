// Supplements source for the Bio Optimization Score compute bundle.
//
// Primary table: supplement_adherence (12 cols).
// Per Phase B pre-flight: no dedicated dose-log table exists in the live
// schema (grep of supabase/migrations/ confirmed). last_engaged_at
// therefore falls back to MAX(started_at) FROM supplement_adherence per
// the pre-flight's documented contingency. When a dose-log table ships,
// rewrite the last_engaged_at + recent_events_* queries to read from it.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupplementsSource {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
  source_specific?: {
    avg_adherence_percent: number;
    active_supplement_count: number;
    longest_streak: number;
  };
}

interface AdherenceRow {
  started_at?: string | null;
  status?: string | null;
  adherence_percent?: number | string | null;
  streak_days?: number | null;
}

function withinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86400000;
}

export async function getSupplementsSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<SupplementsSource> {
  const empty: SupplementsSource = {
    last_engaged_at: null,
    recent_events_7d: 0,
    recent_events_30d: 0,
    source_specific: {
      avg_adherence_percent: 0,
      active_supplement_count: 0,
      longest_streak: 0,
    },
  };

  try {
    const { data, error } = await supabase
      .from('supplement_adherence')
      .select('started_at, status, adherence_percent, streak_days')
      .eq('user_id', userId);

    if (error || !data) {
      return empty;
    }

    const rows = data as AdherenceRow[];
    if (rows.length === 0) {
      return empty;
    }

    const startedTimes = rows
      .map((r) => r.started_at)
      .filter((t): t is string => typeof t === 'string')
      .map((t) => ({ iso: t, ms: new Date(t).getTime() }))
      .filter((p) => !Number.isNaN(p.ms))
      .sort((a, b) => b.ms - a.ms);

    const last_engaged_at = startedTimes[0]?.iso ?? null;

    const recent_events_7d = rows.filter((r) => withinDays(r.started_at ?? null, 7)).length;
    const recent_events_30d = rows.filter((r) => withinDays(r.started_at ?? null, 30)).length;

    const active = rows.filter((r) => r.status === 'active');
    const active_supplement_count = active.length;

    // Average across ALL rows (active + completed) so a recently
    // completed protocol's adherence still informs the engagement
    // signal.
    const adherenceValues = rows
      .map((r) => Number(r.adherence_percent))
      .filter((n) => Number.isFinite(n));
    const avg_adherence_percent =
      adherenceValues.length > 0
        ? Math.round(adherenceValues.reduce((s, n) => s + n, 0) / adherenceValues.length)
        : 0;

    const longest_streak = rows.reduce(
      (max, r) => Math.max(max, Number(r.streak_days) || 0),
      0,
    );

    return {
      last_engaged_at,
      recent_events_7d,
      recent_events_30d,
      source_specific: {
        avg_adherence_percent,
        active_supplement_count,
        longest_streak,
      },
    };
  } catch {
    return empty;
  }
}
