import type { NormalizedData, NormalizedSleep, NormalizedHRV } from '../dataNormalizer';

export function normalizeOuraSleep(userId: string, raw: any): NormalizedData {
  const sleep: NormalizedSleep = {
    type: 'sleep',
    totalHours: (raw.total_sleep_duration ?? 0) / 3600,
    efficiency: raw.efficiency ?? 0,
    remMinutes: raw.rem_sleep_duration ? raw.rem_sleep_duration / 60 : undefined,
    deepMinutes: raw.deep_sleep_duration ? raw.deep_sleep_duration / 60 : undefined,
    lightMinutes: raw.light_sleep_duration ? raw.light_sleep_duration / 60 : undefined,
    awakeMinutes: raw.awake_duration ? raw.awake_duration / 60 : undefined,
    restingHR: raw.lowest_heart_rate,
    hrv: raw.average_hrv,
    readinessScore: raw.readiness?.score,
  };

  return {
    id: `oura_sleep_${raw.id ?? Date.now()}`,
    userId,
    dataType: 'sleep',
    source: { appId: 'oura', appName: 'Oura', tier: 1, originalId: String(raw.id ?? '') },
    timestamp: raw.bedtime_start ?? new Date().toISOString(),
    date: (raw.day ?? new Date().toISOString()).split('T')[0],
    data: sleep,
    raw,
  };
}

export function normalizeOuraHRV(userId: string, raw: any): NormalizedData {
  const hrv: NormalizedHRV = {
    type: 'hrv',
    avgMs: raw.average_hrv ?? raw.hrv ?? 0,
    restingHR: raw.lowest_heart_rate ?? raw.resting_heart_rate,
  };

  return {
    id: `oura_hrv_${raw.id ?? Date.now()}`,
    userId,
    dataType: 'hrv',
    source: { appId: 'oura', appName: 'Oura', tier: 1, originalId: String(raw.id ?? '') },
    timestamp: raw.day ?? new Date().toISOString(),
    date: (raw.day ?? new Date().toISOString()).split('T')[0],
    data: hrv,
    raw,
  };
}
