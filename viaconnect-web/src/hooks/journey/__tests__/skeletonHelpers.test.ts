/**
 * src/hooks/journey/__tests__/skeletonHelpers.test.ts
 *
 * Prompt 208j Task J-T5. TDD for pure helpers added in the J-T5 skeleton
 * and focus-refetch pass.
 *
 * Tests the shimmerSize helper (extracted from the Shimmer component logic)
 * and the shouldShowSkeleton helper. Both are pure, deterministic, have no
 * side effects, and require no browser globals.
 *
 * Rules: no em-dashes, no emojis, no `any`.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure helper: shimmerSize
//
// Returns the pixel dimensions for a gauge shimmer based on whether the gauge
// is a hero gauge. Matches the sizes used in the GaugeCard skeleton branch
// in YourJourneyCoaching.tsx.
// ---------------------------------------------------------------------------

/**
 * Returns the width and height for a gauge shimmer placeholder.
 * hero gauge: 52x52. standard gauge: 48x48.
 */
function shimmerSize(hero: boolean): { w: number; h: number } {
  return hero ? { w: 52, h: 52 } : { w: 48, h: 48 };
}

// ---------------------------------------------------------------------------
// Pure helper: shouldShowSkeleton
//
// Returns true only when loading is true AND the data is absent (undefined
// or null). When loading is true but data is already present (stale-while-
// revalidate pattern), the populated view should be shown, not a skeleton.
// ---------------------------------------------------------------------------

/**
 * True when loading is true AND data has not yet resolved to a non-null
 * value. False when data is present (show populated view during re-fetch).
 */
function shouldShowSkeleton(loading: boolean, data: unknown): boolean {
  return loading && (data === undefined || data === null);
}

// ---------------------------------------------------------------------------
// shimmerSize tests
// ---------------------------------------------------------------------------

describe('shimmerSize', () => {
  it('returns 52x52 for hero gauges', () => {
    expect(shimmerSize(true)).toEqual({ w: 52, h: 52 });
  });

  it('returns 48x48 for standard gauges', () => {
    expect(shimmerSize(false)).toEqual({ w: 48, h: 48 });
  });

  it('hero size is larger than standard', () => {
    const hero = shimmerSize(true);
    const standard = shimmerSize(false);
    expect(hero.w).toBeGreaterThan(standard.w);
    expect(hero.h).toBeGreaterThan(standard.h);
  });

  it('width and height are equal (square) for both variants', () => {
    const hero = shimmerSize(true);
    const standard = shimmerSize(false);
    expect(hero.w).toBe(hero.h);
    expect(standard.w).toBe(standard.h);
  });
});

// ---------------------------------------------------------------------------
// shouldShowSkeleton tests
// ---------------------------------------------------------------------------

describe('shouldShowSkeleton', () => {
  it('returns true when loading and data is null', () => {
    expect(shouldShowSkeleton(true, null)).toBe(true);
  });

  it('returns true when loading and data is undefined', () => {
    expect(shouldShowSkeleton(true, undefined)).toBe(true);
  });

  it('returns false when not loading, data is null', () => {
    expect(shouldShowSkeleton(false, null)).toBe(false);
  });

  it('returns false when not loading, data is present', () => {
    expect(shouldShowSkeleton(false, { score: 72 })).toBe(false);
  });

  it('returns false when loading but data is already present (stale-while-revalidate)', () => {
    // During a re-fetch, if we have stale data, show populated view not skeleton.
    expect(shouldShowSkeleton(true, { score: 72 })).toBe(false);
  });

  it('returns false when loading but data is zero (falsy but present)', () => {
    // 0 is a valid score value; it is NOT null/undefined so skeleton should not show.
    expect(shouldShowSkeleton(true, 0)).toBe(false);
  });

  it('returns false when loading but data is an empty array (present, not null)', () => {
    expect(shouldShowSkeleton(true, [])).toBe(false);
  });

  it('returns false when loading but data is an empty string (present, not null)', () => {
    expect(shouldShowSkeleton(true, '')).toBe(false);
  });

  it('returns false when loading but data is false (present, not null)', () => {
    expect(shouldShowSkeleton(true, false)).toBe(false);
  });
});
