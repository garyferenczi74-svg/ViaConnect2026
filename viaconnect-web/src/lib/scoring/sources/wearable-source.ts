// Wearable source for the Bio Optimization Score compute bundle.
//
// Pulls from two tables:
//   wearable_integrations : the configured device list (7 cols).
//   daily_scores          : the per-day signal payload (filter
//                           data_source IN ('wearable', 'mixed')).
//
// last_engaged_at = MAX of integrations.last_sync_date and
// daily_scores.updated_at across the two slices.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface WearableSource {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
  source_specific?: {
    active_integration_count: number;
    device_types: string[];
    latest_hrv: number | null;
    latest_sleep_hours: number | null;
  };
}

interface IntegrationRow {
  device_type?: string | null;
  is_active?: boolean | null;
  last_sync_date?: string | null;
  connected_at?: string | null;
}

interface DailyRow {
  updated_at?: string | null;
  date?: string | null;
  data_source?: string | null;
  recovery_hrv?: number | string | null;
  sleep_hours?: number | string | null;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function windowStart(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return dateOnly(d);
}

function maxIso(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export async function getWearableSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<WearableSource> {
  const empty: WearableSource = {
    last_engaged_at: null,
    recent_events_7d: 0,
    recent_events_30d: 0,
    source_specific: {
      active_integration_count: 0,
      device_types: [],
      latest_hrv: null,
      latest_sleep_hours: null,
    },
  };

  try {
    const integrationsResult = await supabase
      .from('wearable_integrations')
      .select('device_type, is_active, last_sync_date, connected_at')
      .eq('user_id', userId);

    if (integrationsResult.error) {
      return empty;
    }
    const integrations = (integrationsResult.data as IntegrationRow[] | null) ?? [];

    const dailyResult = await supabase
      .from('daily_scores')
      .select('updated_at, date, data_source, recovery_hrv, sleep_hours')
      .eq('user_id', userId)
      .in('data_source', ['wearable', 'mixed']);

    if (dailyResult.error) {
      return empty;
    }
    const daily = (dailyResult.data as DailyRow[] | null) ?? [];

    const activeIntegrations = integrations.filter((i) => i.is_active === true);
    const latestSync = activeIntegrations
      .map((i) => i.last_sync_date)
      .filter((t): t is string => typeof t === 'string')
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const latestDaily = daily
      .map((r) => r.updated_at)
      .filter((t): t is string => typeof t === 'string')
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const last_engaged_at = maxIso(latestSync ?? null, latestDaily ?? null);

    const sevenAgo = windowStart(7);
    const thirtyAgo = windowStart(30);
    const within7 = daily.filter((r) => (r.date ?? '') >= sevenAgo).length;
    const within30 = daily.filter((r) => (r.date ?? '') >= thirtyAgo).length;

    const device_types = Array.from(
      new Set(
        integrations
          .map((i) => i.device_type)
          .filter((d): d is string => typeof d === 'string'),
      ),
    );

    // latest_hrv / latest_sleep_hours come from the most recent daily row
    const sortedDaily = [...daily].sort((a, b) => {
      const av = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bv = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bv - av;
    });
    const top = sortedDaily[0];
    const latest_hrv = top?.recovery_hrv != null ? Number(top.recovery_hrv) : null;
    const latest_sleep_hours = top?.sleep_hours != null ? Number(top.sleep_hours) : null;

    return {
      last_engaged_at,
      recent_events_7d: within7,
      recent_events_30d: within30,
      source_specific: {
        active_integration_count: activeIntegrations.length,
        device_types,
        latest_hrv: latest_hrv != null && Number.isFinite(latest_hrv) ? latest_hrv : null,
        latest_sleep_hours:
          latest_sleep_hours != null && Number.isFinite(latest_sleep_hours)
            ? latest_sleep_hours
            : null,
      },
    };
  } catch {
    return empty;
  }
}
