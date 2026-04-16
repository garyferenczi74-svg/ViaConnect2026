// Prompt #86 — Temporal blending: CAQ baseline vs behavioral data
// Mirrors the existing 80/20 → 40/60 pattern from Prompt #17 bio-optimization.ts
// over a 40-day window.

/**
 * Blends a CAQ-derived score with a behavioral (daily tracking) score.
 * The CAQ weight starts at 0.8 and decays to 0.4 over 40 days as
 * behavioral data accumulates.
 */
export function blendCAQAndBehavioral(
  caqScore: number,
  behavioralScore: number,
  behavioralDaysActive: number,
): number {
  const blendProgress = Math.min(1, behavioralDaysActive / 40);
  const caqWeight = 0.8 - 0.4 * blendProgress;
  const behavioralWeight = 0.2 + 0.4 * blendProgress;
  return Math.round(caqScore * caqWeight + behavioralScore * behavioralWeight);
}

/**
 * Returns the current CAQ weight factor (0.4–0.8) for a given
 * number of behavioral days. Useful when callers need the raw
 * weight rather than a blended score.
 */
export function caqWeightFactor(behavioralDaysActive: number): number {
  const progress = Math.min(1, behavioralDaysActive / 40);
  return 0.8 - 0.4 * progress;
}

/**
 * Returns the current behavioral weight factor (0.2–0.6).
 */
export function behavioralWeightFactor(behavioralDaysActive: number): number {
  return 1 - caqWeightFactor(behavioralDaysActive);
}
