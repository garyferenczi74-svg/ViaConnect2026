// Check-in Score Bridge — Prompt #66
// Converts raw Quick Daily Check slider values to normalised 0-100 scores
// matching wearable scales, then merges both sources (wearable wins).

// ─── Normalisation: check-in → 0–100 ──────────────────────

/** Sleep hours → score. Optimal 7-9 h = 100; tapers outside. */
export function sleepHoursToScore(hours: number): number {
  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6 && hours < 7)  return 75 + ((hours - 6) / 1) * 25;
  if (hours > 9 && hours <= 10) return 75 + ((10 - hours) / 1) * 25;
  if (hours >= 5 && hours < 6)  return 40 + ((hours - 5) / 1) * 35;
  if (hours > 10)               return Math.max(40, 75 - (hours - 10) * 20);
  if (hours >= 0 && hours < 5)  return (hours / 5) * 40;
  return 0;
}

/** Sleep quality 1-5 → 0-100 linear. */
export function sleepQualityToScore(rating: number): number {
  return Math.round(((rating - 1) / 4) * 100);
}

/** Combined sleep: 55% hours + 45% quality. */
export function sleepCheckinScore(hours: number, quality: number): number {
  return Math.round(sleepHoursToScore(hours) * 0.55 + sleepQualityToScore(quality) * 0.45);
}

/** Activity level 1-5 → 0-100 linear. */
export function activityCheckinScore(level: number): number {
  return Math.round(((level - 1) / 4) * 100);
}

/**
 * Exercise score from cardio + resistance toggles/durations.
 * Each contributes up to 50 pts (20 base + 30 for duration up to 45 min).
 */
export function exerciseCheckinScore(
  cardioActive: boolean,
  cardioDuration: number,
  resistanceActive: boolean,
  resistanceDuration: number,
): number {
  const calc = (active: boolean, duration: number): number => {
    if (!active) return 0;
    return 20 + (Math.min(duration, 45) / 45) * 30;
  };
  return Math.min(100, Math.round(calc(cardioActive, cardioDuration) + calc(resistanceActive, resistanceDuration)));
}

/** Stress 1-5 → 0-100 INVERTED (low stress = high score). */
export function stressCheckinScore(level: number): number {
  return Math.round(((5 - level) / 4) * 100);
}

/** Energy & recovery 1-5 → 0-100 linear. */
export function energyCheckinScore(level: number): number {
  return Math.round(((level - 1) / 4) * 100);
}

// ─── Types ─────────────────────────────────────────────────

export interface WearableScores {
  sleep?:    number | null;
  activity?: number | null;
  stress?:   number | null;
  recovery?: number | null;
  hrv?:      number | null;
}

export interface CheckInRaw {
  sleep_hours?:              number | null;
  sleep_quality_score?:      number | null;
  cardio_active?:            boolean | null;
  cardio_duration_min?:      number | null;
  resistance_active?:        boolean | null;
  resistance_duration_min?:  number | null;
  activity_level_score?:     number | null;
  stress_level_score?:       number | null;
  energy_recovery_score?:    number | null;
}

export type ScoreSource = 'wearable' | 'checkin' | null;

export interface MergedDayScores {
  sleep:    number | null;
  activity: number | null;
  stress:   number | null;
  recovery: number | null;
  hrv:      number | null;
  sleepSource:    ScoreSource;
  activitySource: ScoreSource;
  stressSource:   ScoreSource;
  recoverySource: ScoreSource;
}

// ─── Merge: wearable wins, check-in fills gaps ────────────

export function mergeScoreSources(
  wearable: WearableScores,
  checkin: CheckInRaw,
): MergedDayScores {
  const wSleep = wearable.sleep ?? null;
  const cSleep =
    checkin.sleep_hours != null && checkin.sleep_quality_score != null
      ? sleepCheckinScore(checkin.sleep_hours, checkin.sleep_quality_score)
      : checkin.sleep_hours != null
        ? sleepHoursToScore(checkin.sleep_hours)
        : null;

  const wActivity = wearable.activity ?? null;
  const cActivity =
    checkin.activity_level_score != null
      ? activityCheckinScore(checkin.activity_level_score)
      : checkin.cardio_active != null || checkin.resistance_active != null
        ? exerciseCheckinScore(
            checkin.cardio_active ?? false,
            checkin.cardio_duration_min ?? 0,
            checkin.resistance_active ?? false,
            checkin.resistance_duration_min ?? 0,
          )
        : null;

  const wStress = wearable.stress ?? null;
  const cStress =
    checkin.stress_level_score != null
      ? stressCheckinScore(checkin.stress_level_score)
      : null;

  const wRecovery = wearable.recovery ?? null;
  const cRecovery =
    checkin.energy_recovery_score != null
      ? energyCheckinScore(checkin.energy_recovery_score)
      : null;

  return {
    sleep:    wSleep    ?? cSleep,
    activity: wActivity ?? cActivity,
    stress:   wStress   ?? cStress,
    recovery: wRecovery ?? cRecovery,
    hrv:      wearable.hrv ?? null,
    sleepSource:    wSleep    != null ? 'wearable' : cSleep    != null ? 'checkin' : null,
    activitySource: wActivity != null ? 'wearable' : cActivity != null ? 'checkin' : null,
    stressSource:   wStress   != null ? 'wearable' : cStress   != null ? 'checkin' : null,
    recoverySource: wRecovery != null ? 'wearable' : cRecovery != null ? 'checkin' : null,
  };
}

// ─── Day score from merged dimensions ──────────────────────
// Weights re-normalise across available dimensions only (never zero-fill).

const DIMENSION_WEIGHTS = {
  sleep: 0.30,
  activity: 0.25,
  stress: 0.20,
  recovery: 0.15,
  hrv: 0.10,
} as const;

export function calculateDayScore(merged: MergedDayScores): number {
  const dims: Array<{ score: number; weight: number }> = [];

  if (merged.sleep    != null) dims.push({ score: merged.sleep,    weight: DIMENSION_WEIGHTS.sleep });
  if (merged.activity != null) dims.push({ score: merged.activity, weight: DIMENSION_WEIGHTS.activity });
  if (merged.stress   != null) dims.push({ score: merged.stress,   weight: DIMENSION_WEIGHTS.stress });
  if (merged.recovery != null) dims.push({ score: merged.recovery, weight: DIMENSION_WEIGHTS.recovery });
  if (merged.hrv      != null) dims.push({ score: merged.hrv,      weight: DIMENSION_WEIGHTS.hrv });

  if (dims.length === 0) return 0;

  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  return Math.round(dims.reduce((s, d) => s + d.score * (d.weight / totalWeight), 0));
}
