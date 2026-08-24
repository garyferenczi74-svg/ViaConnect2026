// Normalize Oura Cloud v2 payloads into wearable_* rows.
// Missing metrics stay null (UNKNOWN). Never invent zeros.

import { numOrNull } from '../types';

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
}

function secondsToMin(v: number | null): number | null {
  return v === null ? null : v / 60;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

export function normalizeOuraSleep(userId: string, payload: unknown) {
  const raw = asRecord(payload);
  const id = str(raw.id || raw.uuid);
  const start = str(raw.bedtime_start || raw.start_datetime || raw.timestamp || raw.day);
  const end = str(raw.bedtime_end || raw.end_datetime || start);
  const totalSec = numOrNull(raw.total_sleep_duration);
  const remSec = numOrNull(raw.rem_sleep_duration);
  const deepSec = numOrNull(raw.deep_sleep_duration);
  const lightSec = numOrNull(raw.light_sleep_duration);
  const awakeSec = numOrNull(raw.awake_time);
  const score = numOrNull(raw.score ?? raw.efficiency);
  return {
    user_id: userId,
    source_provider: 'oura' as const,
    external_id: id,
    start_at: start || new Date().toISOString(),
    end_at: end || start || new Date().toISOString(),
    time_in_bed_min: secondsToMin(numOrNull(raw.time_in_bed)),
    total_sleep_min: secondsToMin(totalSec),
    rem_min: secondsToMin(remSec),
    deep_min: secondsToMin(deepSec),
    light_min: secondsToMin(lightSec),
    awake_min: secondsToMin(awakeSec),
    sleep_efficiency_pct: score,
    respiratory_rate: numOrNull(raw.average_breath),
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeOuraRecovery(userId: string, payload: unknown) {
  const raw = asRecord(payload);
  const contributors =
    raw.contributors && typeof raw.contributors === 'object'
      ? (raw.contributors as Record<string, unknown>)
      : {};
  const id = str(raw.id || raw.uuid || raw.day);
  const day = str(raw.day || raw.timestamp).slice(0, 10);
  return {
    user_id: userId,
    source_provider: 'oura' as const,
    external_id: id,
    cycle_date: day || new Date().toISOString().slice(0, 10),
    recovery_score: numOrNull(raw.score),
    hrv_ms: numOrNull(contributors.hrv_balance ?? raw.hrv),
    resting_hr_bpm: numOrNull(contributors.resting_heart_rate ?? raw.resting_heart_rate),
    spo2_pct: null,
    skin_temp_c: numOrNull(contributors.body_temperature ?? raw.temperature_deviation),
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
}

export function ouraDailySleepScore(payload: unknown): number | null {
  const raw = asRecord(payload);
  return numOrNull(raw.score);
}
