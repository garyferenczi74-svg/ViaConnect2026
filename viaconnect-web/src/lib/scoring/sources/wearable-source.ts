// Wearable source for the Bio Optimization Score compute bundle.
//
// Reads ingest tables only. /api/bos/current never calls this path
// directly; the worker copies a contributor into breakdown after persist.
// Null stays UNKNOWN, never 0.

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

interface ConnectedRow {
  provider?: string | null;
  last_sync_at?: string | null;
}

interface RecoveryRow {
  hrv_ms?: number | string | null;
  cycle_date?: string | null;
  updated_at?: string | null;
}

interface SleepRow {
  total_sleep_min?: number | string | null;
  end_at?: string | null;
}

interface BodyRow {
  measured_at?: string | null;
  updated_at?: string | null;
  source_app?: string | null;
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

function finiteOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const EMPTY: WearableSource = {
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

export async function getWearableSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<WearableSource> {
  try {
    const integrationsResult = await supabase
      .from('wearable_integrations')
      .select('device_type, is_active, last_sync_date, connected_at')
      .eq('user_id', userId);

    if (integrationsResult.error) {
      return EMPTY;
    }
    const integrations = (integrationsResult.data as IntegrationRow[] | null) ?? [];

    let connectedSync: string | null = null;
    let connectedTypes: string[] = [];
    const cs = await supabase
      .from('connected_sources')
      .select('provider, status, last_sync_at')
      .eq('user_id', userId)
      .eq('status', 'connected');
    if (!cs.error) {
      const rows = (cs.data ?? []) as ConnectedRow[];
      connectedTypes = rows.map((r) => r.provider).filter((p): p is string => typeof p === 'string');
      connectedSync =
        rows
          .map((r) => r.last_sync_at)
          .filter((t): t is string => typeof t === 'string')
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    }

    let latest_hrv: number | null = null;
    let latest_sleep_hours: number | null = null;
    let recoveryAt: string | null = null;
    let sleepAt: string | null = null;
    let bodyAt: string | null = null;
    let ingestEvents7 = 0;
    let ingestEvents30 = 0;

    const rec = await supabase
      .from('wearable_recovery')
      .select('hrv_ms, cycle_date, updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('cycle_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!rec.error && rec.data) {
      const row = rec.data as RecoveryRow;
      latest_hrv = finiteOrNull(row.hrv_ms);
      recoveryAt = row.updated_at ?? (row.cycle_date ? `${row.cycle_date}T00:00:00.000Z` : null);
    }

    const sleep = await supabase
      .from('wearable_sleep_sessions')
      .select('total_sleep_min, end_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('end_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sleep.error && sleep.data) {
      const row = sleep.data as SleepRow;
      const mins = finiteOrNull(row.total_sleep_min);
      latest_sleep_hours = mins === null ? null : mins / 60;
      sleepAt = row.end_at ?? null;
    }

    const body = await supabase
      .from('wearable_body_composition')
      .select('measured_at, updated_at, source_app')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('measured_at', { ascending: false })
      .limit(5);
    if (!body.error) {
      const rows = (body.data ?? []) as BodyRow[];
      bodyAt = rows[0]?.updated_at ?? rows[0]?.measured_at ?? null;
      const sevenAgo = windowStart(7);
      const thirtyAgo = windowStart(30);
      for (const row of rows) {
        const day = (row.measured_at ?? '').slice(0, 10);
        if (day >= sevenAgo) ingestEvents7 += 1;
        if (day >= thirtyAgo) ingestEvents30 += 1;
      }
      const hume = rows.some((r) => (r.source_app ?? '').toLowerCase().includes('hume'));
      if (hume && !connectedTypes.includes('hume')) connectedTypes.push('hume');
    }

    const dailyResult = await supabase
      .from('daily_scores')
      .select('updated_at, date, data_source, recovery_hrv, sleep_hours')
      .eq('user_id', userId)
      .in('data_source', ['wearable', 'mixed']);

    if (dailyResult.error) {
      return EMPTY;
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
      maxIso(maxIso(latestSync ?? null, latestDaily ?? null), connectedSync),
      maxIso(maxIso(recoveryAt, sleepAt), bodyAt),
    );

    const sevenAgo = windowStart(7);
    const thirtyAgo = windowStart(30);
    const within7 = daily.filter((r) => (r.date ?? '') >= sevenAgo).length + ingestEvents7;
    const within30 = daily.filter((r) => (r.date ?? '') >= thirtyAgo).length + ingestEvents30;

    const device_types = Array.from(
      new Set([
        ...integrations.map((i) => i.device_type).filter((d): d is string => typeof d === 'string'),
        ...connectedTypes,
      ]),
    );

    if (latest_hrv == null || latest_sleep_hours == null) {
      const sortedDaily = [...daily].sort((a, b) => {
        const av = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bv = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bv - av;
      });
      const top = sortedDaily[0];
      if (latest_hrv == null) latest_hrv = finiteOrNull(top?.recovery_hrv);
      if (latest_sleep_hours == null) latest_sleep_hours = finiteOrNull(top?.sleep_hours);
    }

    return {
      last_engaged_at,
      recent_events_7d: within7,
      recent_events_30d: within30,
      source_specific: {
        active_integration_count: activeIntegrations.length + connectedTypes.length,
        device_types,
        latest_hrv,
        latest_sleep_hours,
      },
    };
  } catch {
    return EMPTY;
  }
}
