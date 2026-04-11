// Raw → 0-100 normalizers per gauge (Prompt #62d).
//
// Each function takes a raw measurement (hours, minutes, BPM, etc.)
// and returns a 0-100 score that the dailyScoreEngine can blend.

const linear = (value: number, min: number, max: number): number => {
  if (max === min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
};

/** 8 hours = 100, ≤5h = 0, linear in between. */
export const normalizeSleepHours = (hours: number): number =>
  linear(hours, 5, 8);

/** Direct percentage 0-100. */
export const normalizeSleepEfficiency = (pct: number): number =>
  Math.min(100, Math.max(0, pct));

/** WHO guideline curve: 0 min = 0, 30 min = 75, 60+ min = 100. */
export const normalizeExerciseMinutes = (min: number): number => {
  if (min <= 0) return 0;
  if (min >= 60) return 100;
  if (min <= 30) return (min / 30) * 75;
  return 75 + ((min - 30) / 30) * 25;
};

/** Steps: 5,000 = 50, 10,000 = 100, capped. */
export const normalizeSteps = (steps: number): number =>
  linear(steps, 0, 10000);

/**
 * Rough age-adjusted HRV bands. Refine per-vendor (Whoop / Oura provide
 * their own population percentiles) when integrating each source.
 */
export const normalizeHRV = (ms: number, age: number): number => {
  const target = age < 30 ? 65 : age < 45 ? 55 : age < 60 ? 45 : 35;
  return linear(ms, target * 0.5, target * 1.5);
};

/** Self-reported stress 1 (low) – 10 (high). Inverted. */
export const normalizeStressSelfReport = (level: number): number =>
  Math.min(100, Math.max(0, (10 - level) * (100 / 9)));

/** Resting HR — lower is better. Falls off above the age-adjusted target. */
export const normalizeRestingHR = (bpm: number, age: number): number => {
  const target = age < 30 ? 60 : age < 45 ? 65 : age < 60 ? 70 : 72;
  if (bpm <= target - 10) return 100;
  if (bpm >= target + 20) return 0;
  return 100 - ((bpm - (target - 10)) / 30) * 100;
};

/** Streak bands: 0=0, 7=50, 14=75, 30+=100. */
export const normalizeStreakDays = (days: number): number => {
  if (days <= 0) return 0;
  if (days >= 30) return 100;
  if (days <= 7) return (days / 7) * 50;
  if (days <= 14) return 50 + ((days - 7) / 7) * 25;
  return 75 + ((days - 14) / 16) * 25;
};

/** completed/scheduled, rounded. */
export const normalizeAdherence = (
  completed: number,
  scheduled: number,
): number => (scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0);
