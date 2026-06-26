/**
 * src/hooks/journey/__tests__/useTodayStats.test.ts
 *
 * TDD for pure helpers exported from useTodayStats.
 * Prompt 208j Task J-T3.
 *
 * Rules: no em-dashes, no emojis.
 */

import { describe, it, expect } from 'vitest';
import { stepsPct, exercisePct, sleepPct } from '../useTodayStats';

// ---------------------------------------------------------------------------
// stepsPct
// ---------------------------------------------------------------------------

describe('stepsPct', () => {
  it('returns 0 when steps is null', () => {
    expect(stepsPct(null, 10000)).toBe(0);
  });

  it('returns 50 when steps is half the target', () => {
    expect(stepsPct(5000, 10000)).toBe(50);
  });

  it('clamps to 100 when steps exceed target', () => {
    expect(stepsPct(12000, 10000)).toBe(100);
  });

  it('returns 0 when target is 0', () => {
    expect(stepsPct(5000, 0)).toBe(0);
  });

  it('returns 0 when steps is 0', () => {
    expect(stepsPct(0, 10000)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// exercisePct
// ---------------------------------------------------------------------------

describe('exercisePct', () => {
  it('returns 0 when minutes is null', () => {
    expect(exercisePct(null, 30)).toBe(0);
  });

  it('returns 50 when minutes is half the target', () => {
    expect(exercisePct(15, 30)).toBe(50);
  });

  it('returns 100 when minutes equal target', () => {
    expect(exercisePct(30, 30)).toBe(100);
  });

  it('clamps to 100 when minutes exceed target', () => {
    expect(exercisePct(60, 30)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// sleepPct
// ---------------------------------------------------------------------------

describe('sleepPct', () => {
  it('returns 0 when hours is null', () => {
    expect(sleepPct(null, 8)).toBe(0);
  });

  it('returns 50 when hours is half the target', () => {
    expect(sleepPct(4, 8)).toBe(50);
  });

  it('clamps to 100 when hours exceed target', () => {
    expect(sleepPct(10, 8)).toBe(100);
  });

  it('returns 100 when hours equal target', () => {
    expect(sleepPct(8, 8)).toBe(100);
  });

  it('returns 0 when target is 0', () => {
    expect(sleepPct(8, 0)).toBe(0);
  });
});
