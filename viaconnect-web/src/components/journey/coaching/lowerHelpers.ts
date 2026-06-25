/**
 * src/components/journey/coaching/lowerHelpers.ts
 *
 * Pure, node-safe helpers for the YourJourneyCoaching lower-section data wiring
 * (Prompt 208i Task I-T2b). No DOM, no React, no side effects.
 *
 * Exported for unit testing (lowerHelpers.test.ts).
 *
 * Rules: no em-dashes, no en-dashes, no emojis. Never throws.
 */

/**
 * Format a macro legend label as "consumed / targetg" e.g. "92 / 120g".
 * Returns "--" when target is null (no targets set) or 0.
 * Rounds grams to the nearest integer.
 * Pure, never throws.
 */
export function formatMacroLabel(consumed: number, target: number | null): string {
  const safeConsumed =
    typeof consumed === 'number' && isFinite(consumed) ? Math.round(consumed) : 0;
  const safeTarget =
    typeof target === 'number' && isFinite(target) && target > 0
      ? Math.round(target)
      : null;
  if (safeTarget === null) return '--';
  return `${safeConsumed} / ${safeTarget}g`;
}

/**
 * Compute kcal-remaining text and label for the Nutrition donut center.
 * Returns { value, label } where:
 *   - targetKcal known: "N kcal left"
 *   - no target but logs exist: "N kcal logged"
 *   - neither: "--  kcal"
 * Pure, never throws.
 */
export function kcalRemaining(
  targetKcal: number | null,
  consumed: number,
): { value: string; label: string } {
  const safeConsumed =
    typeof consumed === 'number' && isFinite(consumed) ? consumed : 0;
  const safeTarget =
    typeof targetKcal === 'number' && isFinite(targetKcal) && targetKcal > 0
      ? targetKcal
      : null;

  if (safeTarget !== null) {
    return {
      value: String(Math.round(safeTarget - safeConsumed)),
      label: 'kcal left',
    };
  }
  if (safeConsumed > 0) {
    return { value: String(Math.round(safeConsumed)), label: 'kcal logged' };
  }
  return { value: '--', label: 'kcal' };
}

/**
 * Compute percent progress between a baseline and a target.
 * Returns null when any input is null/NaN or when baseline equals target (no range).
 * Clamps result to 0-100.
 * Pure, never throws.
 */
export function goalProgressPct(
  baseline: number | null,
  current: number | null,
  target: number | null,
): number | null {
  if (baseline === null || current === null || target === null) return null;
  if (!isFinite(baseline) || !isFinite(current) || !isFinite(target)) return null;
  const range = target - baseline;
  if (range === 0) return null;
  const pct = ((current - baseline) / range) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Build a 7-point flat sparkline for wearable-off vital rows.
 * All points are the same value (default 1) so the SVG renders a visible flat
 * line rather than an invisible degenerate path.
 * Pure, never throws.
 */
export function flatSparkline(value: number = 1): number[] {
  const v = typeof value === 'number' && isFinite(value) ? value : 1;
  return Array.from({ length: 7 }, () => v);
}
