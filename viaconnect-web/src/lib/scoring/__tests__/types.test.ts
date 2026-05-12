// Tests for src/lib/scoring/types.ts.
//
// #161c Item 10 introduces two exported decay-policy constants
// (HALF_LIFE_DAYS and FULL_DECAY_DAYS). The assertions below pin their
// values so any accidental edit fails CI before the prompt and the code
// drift apart. Bumping either value requires a coordinated prompt_version
// bump in bio-optimization-score.ts.

import { describe, it, expect } from 'vitest';
import { HALF_LIFE_DAYS, FULL_DECAY_DAYS } from '../types';

describe('decay constants', () => {
  it('HALF_LIFE_DAYS is 7', () => {
    expect(HALF_LIFE_DAYS).toBe(7);
  });

  it('FULL_DECAY_DAYS is 14', () => {
    expect(FULL_DECAY_DAYS).toBe(14);
  });

  it('FULL_DECAY_DAYS is exactly two half-lives', () => {
    expect(FULL_DECAY_DAYS).toBe(2 * HALF_LIFE_DAYS);
  });

  it('both constants are positive integers', () => {
    expect(Number.isInteger(HALF_LIFE_DAYS)).toBe(true);
    expect(Number.isInteger(FULL_DECAY_DAYS)).toBe(true);
    expect(HALF_LIFE_DAYS).toBeGreaterThan(0);
    expect(FULL_DECAY_DAYS).toBeGreaterThan(0);
  });
});
