// Plug Ins source for the Bio Optimization Score compute bundle.
//
// Live schema reality: the only real plug-in backing table is
// wearable_integrations. The /plugins/apps and /plugins/labs surfaces
// are static intake / marketing pages with no read or write paths.
// /plugins/page.tsx references a plugin_requests insert at line 125,
// but that table does not exist in the live schema -- the write is
// dead.
//
// This source therefore currently mirrors the Wearable source, with the
// signal narrowed to "plug-in connected" rather than "plug-in produced
// data". When non-wearable plug-in tables (Apps / Labs) ship, this
// source will diverge to read from those tables in addition.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PlugInsSource {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
  source_specific?: {
    active_count: number;
    device_types: string[];
  };
}

interface IntegrationRow {
  device_type?: string | null;
  is_active?: boolean | null;
  connected_at?: string | null;
  last_sync_date?: string | null;
}

function withinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86400000;
}

export async function getPlugInsSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<PlugInsSource> {
  const empty: PlugInsSource = {
    last_engaged_at: null,
    recent_events_7d: 0,
    recent_events_30d: 0,
    source_specific: {
      active_count: 0,
      device_types: [],
    },
  };

  try {
    const { data, error } = await supabase
      .from('wearable_integrations')
      .select('device_type, is_active, connected_at, last_sync_date')
      .eq('user_id', userId);

    if (error || !data) {
      return empty;
    }

    const rows = data as IntegrationRow[];
    if (rows.length === 0) {
      return empty;
    }

    const sorted = rows
      .map((r) => r.connected_at)
      .filter((t): t is string => typeof t === 'string')
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const last_engaged_at = sorted[0] ?? null;
    const recent_events_7d = rows.filter((r) => withinDays(r.connected_at ?? null, 7)).length;
    const recent_events_30d = rows.filter((r) => withinDays(r.connected_at ?? null, 30)).length;

    const active = rows.filter((r) => r.is_active === true);
    const device_types = Array.from(
      new Set(
        rows
          .map((r) => r.device_type)
          .filter((d): d is string => typeof d === 'string'),
      ),
    );

    return {
      last_engaged_at,
      recent_events_7d,
      recent_events_30d,
      source_specific: {
        active_count: active.length,
        device_types,
      },
    };
  } catch {
    return empty;
  }
}
