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

// J-T5: these helpers are now imported from the real source module so the tests
// verify production code, not in-test definitions.
import { shimmerSize, shouldShowSkeleton } from '../skeletonHelpers';

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
