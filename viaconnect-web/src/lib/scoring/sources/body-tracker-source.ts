// Body Tracker source for the Bio Optimization Score compute bundle.
//
// Primary table: body_tracker_entries (14 cols, active).
// Optional join: body_tracker_weight for latest_weight enrichment.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface BodyTrackerSource {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
  source_specific?: {
    source_distribution: Record<string, number>;
    has_photo_scans: boolean;
    latest_weight: { weight_kg: number; recorded_at: string | null } | null;
  };
}

interface EntryRow {
  created_at?: string | null;
  entry_date?: string | null;
  source?: string | null;
  scan_photo_url?: string | null;
}

interface WeightRow {
  weight_kg?: number | string | null;
  recorded_at?: string | null;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function windowStart(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return dateOnly(d);
}

export async function getBodyTrackerSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<BodyTrackerSource> {
  const empty: BodyTrackerSource = {
    last_engaged_at: null,
    recent_events_7d: 0,
    recent_events_30d: 0,
    source_specific: {
      source_distribution: {},
      has_photo_scans: false,
      latest_weight: null,
    },
  };

  try {
    const entriesResult = await supabase
      .from('body_tracker_entries')
      .select('created_at, entry_date, source, scan_photo_url')
      .eq('user_id', userId);

    if (entriesResult.error) {
      return empty;
    }

    const rows = (entriesResult.data as EntryRow[] | null) ?? [];

    const weightResult = await supabase
      .from('body_tracker_weight')
      .select('weight_kg, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const weightRow = (weightResult.error ? null : weightResult.data) as WeightRow | null;

    if (rows.length === 0) {
      return {
        ...empty,
        source_specific: {
          ...empty.source_specific!,
          latest_weight:
            weightRow && weightRow.weight_kg != null
              ? {
                  weight_kg: Number(weightRow.weight_kg),
                  recorded_at: weightRow.recorded_at ?? null,
                }
              : null,
        },
      };
    }

    const sortedByCreated = rows
      .map((r) => r.created_at)
      .filter((t): t is string => typeof t === 'string')
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const sevenAgo = windowStart(7);
    const thirtyAgo = windowStart(30);
    const within7 = rows.filter((r) => (r.entry_date ?? '') >= sevenAgo);
    const within30 = rows.filter((r) => (r.entry_date ?? '') >= thirtyAgo);

    const source_distribution: Record<string, number> = {};
    for (const r of rows) {
      const k = r.source ?? 'unknown';
      source_distribution[k] = (source_distribution[k] ?? 0) + 1;
    }
    const has_photo_scans = rows.some((r) => Boolean(r.scan_photo_url));

    return {
      last_engaged_at: sortedByCreated[0] ?? null,
      recent_events_7d: within7.length,
      recent_events_30d: within30.length,
      source_specific: {
        source_distribution,
        has_photo_scans,
        latest_weight:
          weightRow && weightRow.weight_kg != null
            ? {
                weight_kg: Number(weightRow.weight_kg),
                recorded_at: weightRow.recorded_at ?? null,
              }
            : null,
      },
    };
  } catch {
    return empty;
  }
}
