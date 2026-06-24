/**
 * src/components/journey/coaching/heroHelpers.ts
 *
 * Pure, node-safe helpers for the YourJourneyCoaching hero data wiring
 * (Prompt 208i Task I-T2a). No DOM, no React, no side effects.
 *
 * Exported for unit testing (heroHelpers.test.ts).
 *
 * Rules: no em-dashes, no en-dashes, no emojis. Never throws.
 */

/**
 * Clamp any value into a finite 0..100 integer gauge score.
 * Non-numbers and non-finite values become 0.
 * Pure, deterministic, never throws.
 */
export function heroGaugeScore(v: unknown): number {
  if (typeof v !== 'number' || !isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Build a flat array of length `count` filled with the clamped gauge value.
 * Used for pillar graph lines that have no history (backend gap): a flat
 * line at the current value is the honest "no trend known" representation.
 *
 * Pure, deterministic, never throws.
 */
export function buildFlatSeries(value: number, count: number): number[] {
  const clamped = heroGaugeScore(value);
  return Array.from({ length: Math.max(0, count) }, () => clamped);
}
