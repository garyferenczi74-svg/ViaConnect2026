// Wearable source for the Bio Optimization Score compute bundle.
//
// Pulls from:
//   wearable_integrations : legacy configured device list (7 cols).
//   connected_sources     : Prompt 212 WHOOP / HealthKit / Health Connect.
//   wearable_recovery / wearable_sleep_sessions : Prompt 212 normalized layer.
//   daily_scores          : per-day signal payload (wearable / mixed).
//
// last_engaged_at = MAX of integrations, connected_sources, and daily_scores.
// Prefers normalized wearable_* metrics when present (null stays UNKNOWN, never 0).

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

    // Prompt 212 connected sources (fail open if table missing).
    let connectedSync: string | null = null;
    let connectedTypes: string[] = [];
    try {
      const cs = await (supabase as any)
        .from('connected_sources')
        .select('provider, status, last_sync_at')
        .eq('user_id', userId)
        .eq('status', 'connected');
      const rows = (cs.data ?? []) as Array<{ provider?: string; last_sync_at?: string }>;
      connectedTypes = rows.map((r) => r.provider).filter(Boolean) as string[];
      connectedSync = rows
        .map((r) => r.last_sync_at)
        .filter((t): t is string => typeof t === 'string')
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    } catch {
      /* table may not exist yet */
    }

    // Normalized recovery / sleep (null stays null — never 0).
    let latest_hrv: number | null = null;
    let latest_sleep_hours: number | null = null;
    try {
      const rec = await (supabase as any)
        .from('wearable_recovery')
        .select('hrv_ms, cycle_date')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('cycle_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (rec.data?.hrv_ms != null && Number.isFinite(Number(rec.data.hrv_ms))) {
        latest_hrv = Number(rec.data.hrv_ms);
      }
      const sleep = await (supabase as any)
        .from('wearable_sleep_sessions')
        .select('total_sleep_min, end_at')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('end_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sleep.data?.total_sleep_min != null && Number.isFinite(Number(sleep.data.total_sleep_min))) {
        latest_sleep_hours = Number(sleep.data.total_sleep_min) / 60;
      }
    } catch {
      /* normalized tables may not exist yet */
    }

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

    const last_engaged_at = maxIso(
      maxIso(latestSync ?? null, latestDaily ?? null),
      connectedSync,
    );

    const sevenAgo = windowStart(7);
    const thirtyAgo = windowStart(30);
    const within7 = daily.filter((r) => (r.date ?? '') >= sevenAgo).length;
    const within30 = daily.filter((r) => (r.date ?? '') >= thirtyAgo).length;

    const device_types = Array.from(
      new Set(
        [
          ...integrations
            .map((i) => i.device_type)
            .filter((d): d is string => typeof d === 'string'),
          ...connectedTypes,
        ],
      ),
    );

    // Prefer normalized layer; fall back to daily_scores only when still null.
    if (latest_hrv == null || latest_sleep_hours == null) {
      const sortedDaily = [...daily].sort((a, b) => {
        const av = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bv = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bv - av;
      });
      const top = sortedDaily[0];
      if (latest_hrv == null && top?.recovery_hrv != null) {
        const n = Number(top.recovery_hrv);
        if (Number.isFinite(n)) latest_hrv = n;
      }
      if (latest_sleep_hours == null && top?.sleep_hours != null) {
        const n = Number(top.sleep_hours);
        if (Number.isFinite(n)) latest_sleep_hours = n;
      }
    }

    return {
      last_engaged_at,
      recent_events_7d: within7,
      recent_events_30d: within30,
      source_specific: {
        active_integration_count: activeIntegrations.length + connectedTypes.length,
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
