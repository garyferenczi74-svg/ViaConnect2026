// Prompt 212: normalize WHOOP v2 payloads into wearable_* rows.
// Missing metrics stay null (UNKNOWN). Never invent zeros.

import { numOrNull } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

export function normalizeWhoopSleep(userId: string, payload: Json) {
  const id = String(payload.id ?? payload.uuid ?? "");
  const start = payload.start ?? payload.created_at ?? null;
  const end = payload.end ?? payload.updated_at ?? start;
  const score = payload.score ?? {};
  const stage = score.stage_summary ?? score.sleep_needed ?? {};
  return {
    user_id: userId,
    source_provider: "whoop" as const,
    external_id: id,
    start_at: start,
    end_at: end,
    time_in_bed_min: numOrNull(stage.total_in_bed_time_milli)
      ? Number(stage.total_in_bed_time_milli) / 60000
      : numOrNull(score.total_in_bed_time_milli)
        ? Number(score.total_in_bed_time_milli) / 60000
        : null,
    total_sleep_min: numOrNull(stage.total_sleep_time_milli)
      ? Number(stage.total_sleep_time_milli) / 60000
      : null,
    rem_min: numOrNull(stage.total_rem_sleep_time_milli)
      ? Number(stage.total_rem_sleep_time_milli) / 60000
      : null,
    deep_min: numOrNull(stage.total_slow_wave_sleep_time_milli)
      ? Number(stage.total_slow_wave_sleep_time_milli) / 60000
      : null,
    light_min: numOrNull(stage.total_light_sleep_time_milli)
      ? Number(stage.total_light_sleep_time_milli) / 60000
      : null,
    awake_min: numOrNull(stage.total_awake_time_milli)
      ? Number(stage.total_awake_time_milli) / 60000
      : null,
    sleep_efficiency_pct: numOrNull(score.sleep_efficiency_percentage ?? score.sleep_performance_percentage),
    respiratory_rate: numOrNull(score.respiratory_rate),
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeWhoopRecovery(userId: string, payload: Json) {
  const cycleId = String(payload.cycle_id ?? payload.id ?? "");
  const score = payload.score ?? {};
  const created = payload.created_at ?? payload.updated_at ?? new Date().toISOString();
  const cycleDate = String(created).slice(0, 10);
  return {
    user_id: userId,
    source_provider: "whoop" as const,
    external_id: cycleId,
    cycle_date: cycleDate,
    recovery_score: numOrNull(score.recovery_score),
    hrv_ms: numOrNull(score.hrv_rmssd_milli),
    resting_hr_bpm: numOrNull(score.resting_heart_rate),
    spo2_pct: numOrNull(score.spo2_percentage),
    skin_temp_c: numOrNull(score.skin_temp_celsius),
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeWhoopWorkout(userId: string, payload: Json) {
  const id = String(payload.id ?? payload.uuid ?? "");
  const score = payload.score ?? {};
  const zone = score.zone_duration ?? {};
  return {
    user_id: userId,
    source_provider: "whoop" as const,
    external_id: id,
    sport: payload.sport_name ?? (payload.sport_id != null ? String(payload.sport_id) : null),
    start_at: payload.start ?? payload.created_at,
    end_at: payload.end ?? null,
    strain: numOrNull(score.strain),
    avg_hr_bpm: numOrNull(score.average_heart_rate),
    max_hr_bpm: numOrNull(score.max_heart_rate),
    kilojoules: numOrNull(score.kilojoule),
    distance_m: numOrNull(score.distance_meter ?? zone.distance_meter),
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
}
