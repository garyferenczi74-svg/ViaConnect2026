// =============================================================================
// Prompt 173c Phase B (2026-06-04): canonical interstitial advance constants.
//
// One source of truth for the hybrid advance behavior per 173c 1.2. No
// magic numbers in the InterstitialScreen component; tuning the cadence
// touches this file only.
//
// Cadence design rationale (locked):
//   * A 20-word body line at 200 to 250 wpm comprehends in 5 to 6 seconds.
//     A timer-only 3-second flip removes the screen mid-read.
//   * The clamp keeps short teasers from feeling rushed (>= 4s) and long
//     interstitials from feeling abandoned (<= 9s).
//   * The base offset accounts for the animation reveal plus a moment to
//     orient before reading begins.
// =============================================================================

// Reading-time-aware auto-advance constants. delay_ms is derived per 173c
// 1.2 from word_count via:
//
//   delay_ms = clamp(base_ms + (word_count / words_per_second) * 1000, min_ms, max_ms)
//
// A 20-word card lands near 7s, a short 5-word teaser at the 4s floor.
export const INTERSTITIAL_ADVANCE = {
  base_ms: 1500,
  words_per_second: 3.5, // ~ 210 wpm
  min_ms: 4000,
  max_ms: 9000,
  // Progress fill update tick. The bar interpolates linearly; we redraw at
  // ~ 30 fps so the motion reads as continuous without burning CPU.
  progress_tick_ms: 33,
} as const;

export type InterstitialAdvanceConfig = typeof INTERSTITIAL_ADVANCE;

/**
 * Compute the reading-time-aware auto-advance delay for an interstitial
 * given the total word count of its visible body copy. Pure + total; safe
 * to unit-test in isolation.
 *
 * Callers count words across whatever copy renders on the card: the quote
 * plus the featureCard description plus the subtext, when present. The
 * floor (min_ms) protects short teasers; the ceiling (max_ms) protects
 * long featureCards from feeling abandoned.
 */
export function computeAdvanceDelayMs(
  wordCount: number,
  config: InterstitialAdvanceConfig = INTERSTITIAL_ADVANCE,
): number {
  // NaN and negative inputs are defensive-zeroed; positive infinity is left
  // alone so it routes to the ceiling via the clamp below.
  if (Number.isNaN(wordCount) || wordCount < 0) wordCount = 0;
  const raw = config.base_ms + (wordCount / config.words_per_second) * 1000;
  return Math.max(config.min_ms, Math.min(config.max_ms, raw));
}

/**
 * Count words across the copy fragments visible on the interstitial card.
 * Whitespace runs are collapsed; empty / null fragments contribute zero.
 * Used by the InterstitialScreen to feed computeAdvanceDelayMs.
 */
export function countInterstitialWords(...fragments: ReadonlyArray<string | null | undefined>): number {
  let total = 0;
  for (const f of fragments) {
    if (!f) continue;
    const trimmed = f.trim();
    if (trimmed.length === 0) continue;
    total += trimmed.split(/\s+/).length;
  }
  return total;
}
