/**
 * Data normalization layer.
 * Transforms raw Terra webhook payloads into our internal
 * wearable_summaries schema.
 */

export interface NormalizedDaySummary {
  date: string;
  provider: string;
  terra_user_id: string;

  // Sleep metrics
  sleep_score: number | null;
  sleep_duration_hrs: number | null;
  sleep_efficiency: number | null;
  deep_sleep_hrs: number | null;
  rem_sleep_hrs: number | null;
  light_sleep_hrs: number | null;
  awake_hrs: number | null;

  // Recovery & HRV
  recovery_score: number | null;
  hrv_avg: number | null;
  hrv_rmssd: number | null;
  resting_hr: number | null;

  // Activity / Strain
  strain_score: number | null;
  active_calories: number | null;
  total_calories: number | null;
  steps: number | null;
  distance_meters: number | null;
  active_duration_sec: number | null;
  avg_hr: number | null;
  max_hr: number | null;

  // Stress & Recovery
  stress_score: number | null;
  body_battery: number | null;
  spo2_avg: number | null;
  respiratory_rate: number | null;

  // Raw payload reference
  raw_payload: unknown;
}

/**
 * Maps a Terra stress value (typically 0-100 ascending = more stressed)
 * into our internal 0-100 score where higher = less stressed (better).
 */
export function mapStressScore(terraStress: number | null | undefined): number | null {
  if (terraStress == null) return null;
  const clamped = Math.max(0, Math.min(100, terraStress));
  return Math.round(100 - clamped);
}

/**
 * Safely converts seconds to hours, rounded to two decimals.
 */
function secToHrs(seconds: number | null | undefined): number | null {
  if (seconds == null) return null;
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Normalizes a raw Terra webhook payload into our NormalizedDaySummary.
 * Handles 'daily', 'sleep', and 'activity' payload types.
 */
export function normalizeWearableData(terraPayload: Record<string, any>): NormalizedDaySummary[] {
  const payloadType: string = terraPayload.type ?? '';
  const user = terraPayload.user ?? {};
  const terraUserId: string = user.user_id ?? '';
  const provider: string = (user.provider ?? '').toLowerCase();
  const dataArray: any[] = terraPayload.data ?? [];

  return dataArray.map((entry: any) => {
    const base: NormalizedDaySummary = {
      date: '',
      provider,
      terra_user_id: terraUserId,
      sleep_score: null,
      sleep_duration_hrs: null,
      sleep_efficiency: null,
      deep_sleep_hrs: null,
      rem_sleep_hrs: null,
      light_sleep_hrs: null,
      awake_hrs: null,
      recovery_score: null,
      hrv_avg: null,
      hrv_rmssd: null,
      resting_hr: null,
      strain_score: null,
      active_calories: null,
      total_calories: null,
      steps: null,
      distance_meters: null,
      active_duration_sec: null,
      avg_hr: null,
      max_hr: null,
      stress_score: null,
      body_battery: null,
      spo2_avg: null,
      respiratory_rate: null,
      raw_payload: entry,
    };

    switch (payloadType) {
      case 'daily': {
        const metadata = entry.metadata ?? {};
        const heartRate = entry.heart_rate_data ?? {};
        const stressData = entry.stress_data ?? {};
        const oxygenData = entry.oxygen_data ?? {};
        const scores = entry.scores ?? {};

        base.date = metadata.start_time?.slice(0, 10) ?? '';
        base.recovery_score = scores.recovery ?? null;
        base.hrv_avg = heartRate.avg_hr_variability ?? null;
        base.hrv_rmssd = heartRate.rmssd ?? null;
        base.resting_hr = heartRate.resting_hr_bpm ?? null;
        base.strain_score = scores.strain ?? null;
        base.active_calories = entry.calories_data?.net_activity_calories ?? null;
        base.total_calories = entry.calories_data?.total_burned_calories ?? null;
        base.steps = entry.distance_data?.steps ?? null;
        base.distance_meters = entry.distance_data?.distance_meters ?? null;
        base.stress_score = mapStressScore(stressData.avg_stress_level ?? null);
        base.body_battery = stressData.rest_stress_duration_seconds != null
          ? Math.round((stressData.rest_stress_duration_seconds / 86400) * 100)
          : (scores.body_battery ?? null);
        base.spo2_avg = oxygenData.avg_saturation_percentage ?? null;
        base.respiratory_rate = entry.respiration_data?.avg_breaths_per_min ?? null;
        break;
      }

      case 'sleep': {
        const metadata = entry.metadata ?? {};
        const sleepDurations = entry.sleep_durations_data ?? {};
        const asleep = sleepDurations.asleep ?? {};
        const awake = sleepDurations.awake ?? {};
        const scores = entry.scores ?? {};
        const heartRate = entry.heart_rate_data ?? {};

        base.date = metadata.start_time?.slice(0, 10) ?? '';
        base.sleep_score = scores.overall ?? null;
        base.sleep_duration_hrs = secToHrs(
          sleepDurations.total_sleep_duration_seconds ?? null
        );
        base.sleep_efficiency = scores.efficiency ?? null;
        base.deep_sleep_hrs = secToHrs(asleep.duration_deep_sleep_seconds ?? null);
        base.rem_sleep_hrs = secToHrs(asleep.duration_REM_sleep_seconds ?? null);
        base.light_sleep_hrs = secToHrs(asleep.duration_light_sleep_seconds ?? null);
        base.awake_hrs = secToHrs(awake.duration_awake_seconds ?? null);
        base.hrv_avg = heartRate.avg_hr_variability ?? null;
        base.hrv_rmssd = heartRate.rmssd ?? null;
        base.resting_hr = heartRate.resting_hr_bpm ?? null;
        base.respiratory_rate = entry.respiration_data?.avg_breaths_per_min ?? null;
        break;
      }

      case 'activity': {
        const metadata = entry.metadata ?? {};
        const heartRate = entry.heart_rate_data ?? {};
        const caloriesData = entry.calories_data ?? {};
        const distanceData = entry.distance_data ?? {};

        base.date = metadata.start_time?.slice(0, 10) ?? '';
        base.active_calories = caloriesData.net_activity_calories ?? null;
        base.total_calories = caloriesData.total_burned_calories ?? null;
        base.steps = distanceData.steps ?? null;
        base.distance_meters = distanceData.distance_meters ?? null;
        base.active_duration_sec = entry.active_durations_data?.activity_seconds ?? null;
        base.avg_hr = heartRate.avg_hr_bpm ?? null;
        base.max_hr = heartRate.max_hr_bpm ?? null;
        base.strain_score = entry.scores?.strain ?? null;
        break;
      }

      default:
        // Unknown type — return base with whatever date we can extract
        base.date = entry.metadata?.start_time?.slice(0, 10) ?? '';
        break;
    }

    return base;
  });
}
