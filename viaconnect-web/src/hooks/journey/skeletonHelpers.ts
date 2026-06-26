/**
 * src/hooks/journey/skeletonHelpers.ts
 *
 * Prompt 208j Task J-T5. Pure helpers for the journey coaching skeleton +
 * focus-refetch pass. Both are pure, deterministic, have no side effects, and
 * require no browser globals.
 *
 * shouldShowSkeleton implements the stale-while-revalidate gate: a skeleton is
 * shown only when a read is loading AND no data has resolved yet. Once data is
 * present, a background re-fetch (for example a window-focus refetch) keeps the
 * populated view on screen instead of flashing a skeleton.
 *
 * shimmerSize returns the square pixel dimensions for a gauge shimmer, matching
 * the GaugeCard skeleton branch sizes in YourJourneyCoaching.tsx.
 *
 * Rules: no em-dashes, no emojis, no `any`.
 */

/**
 * True when loading is true AND data has not yet resolved to a non-null value.
 * False when data is present (show the populated view during a re-fetch).
 *
 * Note: any value that is not null or undefined counts as present, including
 * falsy-but-valid values such as 0, "", false, and [].
 */
export function shouldShowSkeleton(loading: boolean, data: unknown): boolean {
  return loading && (data === undefined || data === null);
}

/**
 * Returns the width and height for a gauge shimmer placeholder.
 * hero gauge: 52x52. standard gauge: 48x48.
 */
export function shimmerSize(hero: boolean): { w: number; h: number } {
  return hero ? { w: 52, h: 52 } : { w: 48, h: 48 };
}
