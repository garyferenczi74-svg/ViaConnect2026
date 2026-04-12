import type { NormalizedData, NormalizedSleep, NormalizedSteps, NormalizedWorkout } from '../dataNormalizer';

export function normalizeFitbitSleep(userId: string, raw: any): NormalizedData {
  const stages = raw.levels?.summary ?? {};
  const sleep: NormalizedSleep = {
    type: 'sleep',
    totalHours: (raw.duration ?? 0) / 3600000,
    efficiency: raw.efficiency ?? 0,
    remMinutes: stages.rem?.minutes,
    deepMinutes: stages.deep?.minutes,
    lightMinutes: stages.light?.minutes,
    awakeMinutes: stages.wake?.minutes,
    restingHR: raw.restingHeartRate,
  };

  return {
    id: `fitbit_sleep_${raw.logId ?? Date.now()}`,
    userId,
    dataType: 'sleep',
    source: { appId: 'fitbit', appName: 'Fitbit', tier: 1, originalId: String(raw.logId ?? '') },
    timestamp: raw.startTime ?? new Date().toISOString(),
    date: (raw.dateOfSleep ?? new Date().toISOString()).split('T')[0],
    data: sleep,
    raw,
  };
}

export function normalizeFitbitSteps(userId: string, raw: any): NormalizedData {
  const steps: NormalizedSteps = { type: 'steps', count: raw.value ?? raw.steps ?? 0 };
  return {
    id: `fitbit_steps_${raw.dateTime ?? Date.now()}`,
    userId,
    dataType: 'steps',
    source: { appId: 'fitbit', appName: 'Fitbit', tier: 1, originalId: raw.dateTime ?? '' },
    timestamp: raw.dateTime ?? new Date().toISOString(),
    date: (raw.dateTime ?? new Date().toISOString()).split('T')[0],
    data: steps,
    raw,
  };
}

export function normalizeFitbitWorkout(userId: string, raw: any): NormalizedData {
  const workout: NormalizedWorkout = {
    type: 'workout',
    activityType: raw.activityName ?? 'Workout',
    durationMinutes: (raw.duration ?? 0) / 60000,
    caloriesBurned: raw.calories,
    avgHeartRate: raw.averageHeartRate,
    distance: raw.distance,
    distanceUnit: raw.distanceUnit ?? 'km',
  };

  return {
    id: `fitbit_workout_${raw.logId ?? Date.now()}`,
    userId,
    dataType: 'workout',
    source: { appId: 'fitbit', appName: 'Fitbit', tier: 1, originalId: String(raw.logId ?? '') },
    timestamp: raw.startTime ?? new Date().toISOString(),
    date: (raw.startTime ?? new Date().toISOString()).split('T')[0],
    data: workout,
    raw,
  };
}
