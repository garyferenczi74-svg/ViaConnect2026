// After a real wearable persist, write a wearable contributor into the
// latest bio_optimization_history.breakdown. Does not change the score
// formula. /api/bos/current still only reads that breakdown.

import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueBOSCompute } from './queue';
import type { WearableSource } from './sources/wearable-source';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const SCOPE = 'lib.scoring.wearable-contributor';

export interface WearableContributorSnapshot {
  present: boolean;
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
  device_types: string[];
  latest_hrv: number | null;
  latest_sleep_hours: number | null;
}

export function wearableContributorFromSource(source: WearableSource): WearableContributorSnapshot {
  const latestHrv = source.source_specific?.latest_hrv ?? null;
  const latestSleep = source.source_specific?.latest_sleep_hours ?? null;
  return {
    present:
      source.last_engaged_at !== null ||
      (source.source_specific?.active_integration_count ?? 0) > 0 ||
      latestHrv !== null ||
      latestSleep !== null,
    last_engaged_at: source.last_engaged_at,
    recent_events_7d: source.recent_events_7d,
    recent_events_30d: source.recent_events_30d,
    device_types: source.source_specific?.device_types ?? [],
    latest_hrv: latestHrv,
    latest_sleep_hours: latestSleep,
  };
}

interface HistoryRow {
  id: string;
  breakdown: Record<string, unknown> | null;
}

export async function applyWearableContributorToBreakdown(
  admin: SupabaseClient,
  userId: string,
  source: WearableSource,
): Promise<{ applied: boolean; historyId: string | null }> {
  const contributor = wearableContributorFromSource(source);
  if (!contributor.present) {
    return { applied: false, historyId: null };
  }

  try {
    const { data, error } = await withTimeout(
      admin
        .from('bio_optimization_history')
        .select('id, breakdown')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('compute_seq', { ascending: false })
        .limit(1)
        .maybeSingle(),
      4000,
      `${SCOPE}.loadHistory`,
    );
    if (error || !data) {
      return { applied: false, historyId: null };
    }
    const row = data as HistoryRow;
    const breakdown: Record<string, unknown> = { ...(row.breakdown ?? {}) };
    const engagement =
      typeof breakdown.engagement_state === 'object' && breakdown.engagement_state !== null
        ? { ...(breakdown.engagement_state as Record<string, unknown>) }
        : {};
    engagement.wearable = {
      last_engaged_at: contributor.last_engaged_at,
      recent_events_7d: contributor.recent_events_7d,
      recent_events_30d: contributor.recent_events_30d,
    };
    breakdown.engagement_state = engagement;
    breakdown.contributors = {
      ...(typeof breakdown.contributors === 'object' && breakdown.contributors !== null
        ? (breakdown.contributors as Record<string, unknown>)
        : {}),
      wearable: contributor,
    };

    const { error: updErr } = await withTimeout(
      admin.from('bio_optimization_history').update({ breakdown }).eq('id', row.id),
      4000,
      `${SCOPE}.updateBreakdown`,
    );
    if (updErr) {
      safeLog.warn(SCOPE, 'breakdown update failed', { error: updErr });
      return { applied: false, historyId: row.id };
    }
    return { applied: true, historyId: row.id };
  } catch (err) {
    safeLog.warn(SCOPE, 'apply failed', { error: err });
    return { applied: false, historyId: null };
  }
}

export async function enqueueWearableBosRecompute(
  admin: SupabaseClient,
  userId: string,
  eventId?: string,
): Promise<void> {
  try {
    await enqueueBOSCompute({
      userId,
      source: 'wearable_sync',
      event_id: eventId,
      payload: { reason: 'wearable_persist' },
      supabase: admin,
    });
  } catch (err) {
    safeLog.warn(SCOPE, 'enqueue failed', { error: err });
  }
}
