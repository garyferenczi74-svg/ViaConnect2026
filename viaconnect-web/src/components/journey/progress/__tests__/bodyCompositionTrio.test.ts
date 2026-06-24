/**
 * src/components/journey/progress/__tests__/bodyCompositionTrio.test.ts
 *
 * TDD unit tests for the PURE deriveLeanMass helper (Prompt 208g, Task G-T4).
 * Written RED first, then GREEN after the implementation ships.
 *
 * deriveLeanMass is:
 *   - deterministic and side-effect free (pure function, never throws).
 *   - Prefers the measured total muscle mass in lbs when present and finite.
 *   - Falls back to latestWeightLbs x (1 - bodyFatPct / 100) when
 *     weight > 0 and 0 <= bodyFatPct < 100.
 *   - Returns null (honest "--") when neither path can produce a finite result.
 *
 * No DB, no React, no Supabase. No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';
import { deriveLeanMass } from '../BodyCompositionTrio';

describe('deriveLeanMass', () => {
  it('returns measuredMuscleLbs when present and finite', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: 145.5, latestWeightLbs: 200, bodyFatPct: 20 }),
    ).toBe(145.5);
  });

  it('returns measured even when it is zero (a legitimate scan value)', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: 0, latestWeightLbs: 200, bodyFatPct: 20 }),
    ).toBe(0);
  });

  it('derives from weight x (1 - fat/100) when measured is null', () => {
    const result = deriveLeanMass({
      measuredMuscleLbs: null,
      latestWeightLbs: 200,
      bodyFatPct: 20,
    });
    expect(result).toBeCloseTo(160, 5);
  });

  it('derives from weight x (1 - fat/100) when measured is non-finite (NaN)', () => {
    const result = deriveLeanMass({
      measuredMuscleLbs: NaN,
      latestWeightLbs: 200,
      bodyFatPct: 20,
    });
    expect(result).toBeCloseTo(160, 5);
  });

  it('derives from weight x (1 - fat/100) when measured is Infinity', () => {
    const result = deriveLeanMass({
      measuredMuscleLbs: Infinity,
      latestWeightLbs: 200,
      bodyFatPct: 20,
    });
    expect(result).toBeCloseTo(160, 5);
  });

  it('returns null when latestWeightLbs is null (cannot derive)', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: null, bodyFatPct: 20 }),
    ).toBeNull();
  });

  it('returns null when latestWeightLbs is 0 (guard: weight <= 0)', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: 0, bodyFatPct: 20 }),
    ).toBeNull();
  });

  it('returns null when latestWeightLbs is negative', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: -10, bodyFatPct: 20 }),
    ).toBeNull();
  });

  it('returns null when bodyFatPct is null', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: 200, bodyFatPct: null }),
    ).toBeNull();
  });

  it('returns null when bodyFatPct is exactly 100 (guard: fat >= 100)', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: 200, bodyFatPct: 100 }),
    ).toBeNull();
  });

  it('returns null when bodyFatPct is above 100', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: 200, bodyFatPct: 101 }),
    ).toBeNull();
  });

  it('returns null when bodyFatPct is negative', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: 200, bodyFatPct: -1 }),
    ).toBeNull();
  });

  it('allows bodyFatPct = 0 (derives weight x 1.0 = full weight)', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: 180, bodyFatPct: 0 }),
    ).toBeCloseTo(180, 5);
  });

  it('returns null when latestWeightLbs is NaN', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: NaN, bodyFatPct: 20 }),
    ).toBeNull();
  });

  it('returns null when bodyFatPct is NaN', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: 200, bodyFatPct: NaN }),
    ).toBeNull();
  });

  it('returns null when latestWeightLbs is Infinity', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: Infinity, bodyFatPct: 20 }),
    ).toBeNull();
  });

  it('returns null when all inputs are null', () => {
    expect(
      deriveLeanMass({ measuredMuscleLbs: null, latestWeightLbs: null, bodyFatPct: null }),
    ).toBeNull();
  });

  it('never throws on any combination of inputs', () => {
    const cases = [
      { measuredMuscleLbs: null, latestWeightLbs: null, bodyFatPct: null },
      { measuredMuscleLbs: NaN, latestWeightLbs: NaN, bodyFatPct: NaN },
      { measuredMuscleLbs: Infinity, latestWeightLbs: Infinity, bodyFatPct: Infinity },
      { measuredMuscleLbs: -Infinity, latestWeightLbs: -Infinity, bodyFatPct: -Infinity },
      { measuredMuscleLbs: 100, latestWeightLbs: 0, bodyFatPct: 100 },
    ];
    for (const c of cases) {
      expect(() => deriveLeanMass(c)).not.toThrow();
    }
  });

  it('is deterministic (same input produces identical output)', () => {
    const input = { measuredMuscleLbs: null, latestWeightLbs: 175, bodyFatPct: 18 };
    expect(deriveLeanMass(input)).toBe(deriveLeanMass(input));
  });
});
