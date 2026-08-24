// Persist parsed Apple Health / Hume-tagged records into wearable_* tables
// that the Bio Optimization Score wearable contributor can read.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { ParsedHealthRecord } from './apple-health-xml';
import type { WearableDimension } from '../wearable-tiles';

const SCOPE = 'lib.body-tracker.wearable-ingest';

export interface StoredWearableRow {
  table:
    | 'wearable_body_composition'
    | 'wearable_sleep_sessions'
    | 'wearable_recovery'
    | 'wearable_daily_vitals';
  tileId: 'apple_health' | 'hume';
  dimension: WearableDimension;
  payload: Record<string, unknown>;
}

export interface PersistResult {
  stored: number;
  humeStored: number;
  dimensionsFed: WearableDimension[];
  humeDimensionsFed: WearableDimension[];
  rows: StoredWearableRow[];
}

function providerFor(record: ParsedHealthRecord): 'health_kit' {
  return 'health_kit';
}

export function recordsToWearableRows(userId: string, records: ParsedHealthRecord[]): StoredWearableRow[] {
  const rows: StoredWearableRow[] = [];
  const now = new Date().toISOString();

  for (const rec of records) {
    const tileId = rec.isHume ? 'hume' : 'apple_health';
    const provider = providerFor(rec);

    if (rec.metricKey === 'weight' || rec.metricKey === 'body_fat_pct' || rec.metricKey === 'lean_mass' || rec.metricKey === 'bmi') {
      rows.push({
        table: 'wearable_body_composition',
        tileId,
        dimension: 'metabolic',
        payload: {
          user_id: userId,
          source_provider: provider,
          measured_at: rec.measuredAt,
          weight_kg: rec.metricKey === 'weight' ? rec.value : null,
          body_fat_pct: rec.metricKey === 'body_fat_pct' ? rec.value : null,
          muscle_mass_kg: rec.metricKey === 'lean_mass' ? rec.value : null,
          water_pct: null,
          visceral_fat_index: null,
          source_app: rec.sourceName,
          external_id: rec.externalId,
          deleted_at: null,
          updated_at: now,
        },
      });
      continue;
    }

    if (rec.metricKey === 'sleep') {
      const start = rec.measuredAt;
      const end = rec.endAt ?? start;
      const mins =
        start && end
          ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000)
          : null;
      rows.push({
        table: 'wearable_sleep_sessions',
        tileId: 'apple_health',
        dimension: 'sleep',
        payload: {
          user_id: userId,
          source_provider: provider,
          external_id: rec.externalId,
          start_at: start,
          end_at: end,
          time_in_bed_min: mins,
          total_sleep_min: mins,
          rem_min: null,
          deep_min: null,
          light_min: null,
          awake_min: null,
          sleep_efficiency_pct: null,
          respiratory_rate: null,
          source_app: rec.sourceName,
          deleted_at: null,
          updated_at: now,
        },
      });
      continue;
    }

    if (rec.metricKey === 'hrv' || rec.metricKey === 'resting_hr') {
      rows.push({
        table: 'wearable_recovery',
        tileId: 'apple_health',
        dimension: 'sleep',
        payload: {
          user_id: userId,
          source_provider: provider,
          external_id: rec.externalId,
          cycle_date: rec.measuredAt.slice(0, 10),
          recovery_score: null,
          hrv_ms: rec.metricKey === 'hrv' ? rec.value : null,
          resting_hr_bpm: rec.metricKey === 'resting_hr' ? rec.value : null,
          spo2_pct: null,
          skin_temp_c: null,
          source_app: rec.sourceName,
          deleted_at: null,
          updated_at: now,
        },
      });
      continue;
    }

    if (rec.metricKey === 'steps' || rec.metricKey === 'active_energy') {
      rows.push({
        table: 'wearable_daily_vitals',
        tileId: 'apple_health',
        dimension: 'sleep',
        payload: {
          user_id: userId,
          source_provider: provider,
          metric_date: rec.measuredAt.slice(0, 10),
          steps: rec.metricKey === 'steps' ? rec.value : null,
          active_calories: rec.metricKey === 'active_energy' ? rec.value : null,
          hrv_ms: null,
          resting_hr_bpm: null,
          respiratory_rate: null,
          spo2_pct: null,
          source_app: rec.sourceName,
          deleted_at: null,
          updated_at: now,
        },
      });
    }
  }

  return rows;
}

export function summarizePersist(rows: StoredWearableRow[]): PersistResult {
  const dimensionsFed = Array.from(new Set(rows.filter((r) => r.tileId === 'apple_health').map((r) => r.dimension)));
  const humeDimensionsFed = Array.from(new Set(rows.filter((r) => r.tileId === 'hume').map((r) => r.dimension)));
  return {
    stored: rows.length,
    humeStored: rows.filter((r) => r.tileId === 'hume').length,
    dimensionsFed,
    humeDimensionsFed,
    rows,
  };
}

const CONFLICT: Record<StoredWearableRow['table'], string> = {
  wearable_body_composition: 'source_provider,external_id',
  wearable_sleep_sessions: 'source_provider,external_id',
  wearable_recovery: 'source_provider,external_id',
  wearable_daily_vitals: 'user_id,source_provider,metric_date',
};

export async function persistWearableRows(
  admin: SupabaseClient,
  rows: StoredWearableRow[],
): Promise<number> {
  let stored = 0;
  for (const row of rows) {
    try {
      const { error } = await withTimeout(
        admin.from(row.table).upsert(row.payload, {
          onConflict: CONFLICT[row.table],
          ignoreDuplicates: false,
        }),
        4000,
        `${SCOPE}.upsert.${row.table}`,
      );
      if (error) {
        safeLog.warn(SCOPE, 'upsert failed', { table: row.table, error });
      } else {
        stored += 1;
      }
    } catch (err) {
      safeLog.warn(SCOPE, 'upsert exception', { table: row.table, error: err });
    }
  }
  return stored;
}

export async function persistParsedHealthRecords(
  admin: SupabaseClient,
  userId: string,
  records: ParsedHealthRecord[],
): Promise<PersistResult> {
  const rows = recordsToWearableRows(userId, records);
  const summary = summarizePersist(rows);
  const stored = await persistWearableRows(admin, rows);
  return { ...summary, stored };
}
