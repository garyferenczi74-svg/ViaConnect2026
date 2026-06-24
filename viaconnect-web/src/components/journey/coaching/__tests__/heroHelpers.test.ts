/**
 * src/components/journey/coaching/__tests__/heroHelpers.test.ts
 *
 * TDD for heroGaugeScore and buildFlatSeries (Prompt 208i Task I-T2a).
 * Pure helpers: deterministic, never throw, no DOM, node-safe.
 *
 * heroGaugeScore: clamp any value into a finite 0..100 integer.
 * buildFlatSeries: repeat a clamped value n times (flat line for no-history pillars).
 */

import { describe, it, expect } from 'vitest';
import { heroGaugeScore, buildFlatSeries } from '../heroHelpers';

// ---------------------------------------------------------------------------
// heroGaugeScore
// ---------------------------------------------------------------------------

describe('heroGaugeScore', () => {
  it('rounds 73.6 to 74', () => {
    expect(heroGaugeScore(73.6)).toBe(74);
  });

  it('clamps 120 to 100', () => {
    expect(heroGaugeScore(120)).toBe(100);
  });

  it('clamps -5 to 0', () => {
    expect(heroGaugeScore(-5)).toBe(0);
  });

  it('passes through 50 unchanged', () => {
    expect(heroGaugeScore(50)).toBe(50);
  });

  it('returns 0 for NaN', () => {
    expect(heroGaugeScore(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(heroGaugeScore(Infinity)).toBe(0);
  });

  it('returns 0 for -Infinity', () => {
    expect(heroGaugeScore(-Infinity)).toBe(0);
  });

  it('returns 0 for null (typed as unknown)', () => {
    expect(heroGaugeScore(null as unknown as number)).toBe(0);
  });

  it('returns 0 for undefined (typed as unknown)', () => {
    expect(heroGaugeScore(undefined as unknown as number)).toBe(0);
  });

  it('returns 0 for a string (typed as unknown)', () => {
    expect(heroGaugeScore('hello' as unknown as number)).toBe(0);
  });

  it('passes 0 through as 0', () => {
    expect(heroGaugeScore(0)).toBe(0);
  });

  it('passes 100 through as 100', () => {
    expect(heroGaugeScore(100)).toBe(100);
  });

  it('never throws', () => {
    expect(() => heroGaugeScore(NaN)).not.toThrow();
    expect(() => heroGaugeScore(undefined as unknown as number)).not.toThrow();
    expect(() => heroGaugeScore(null as unknown as number)).not.toThrow();
  });

  it('is deterministic', () => {
    expect(heroGaugeScore(65)).toBe(heroGaugeScore(65));
  });
});

// ---------------------------------------------------------------------------
// buildFlatSeries
// ---------------------------------------------------------------------------

describe('buildFlatSeries', () => {
  it('returns an array of the given length', () => {
    expect(buildFlatSeries(50, 7)).toHaveLength(7);
  });

  it('fills every element with the clamped value', () => {
    const result = buildFlatSeries(42, 5);
    expect(result).toEqual([42, 42, 42, 42, 42]);
  });

  it('clamps input above 100 to 100', () => {
    const result = buildFlatSeries(150, 3);
    expect(result).toEqual([100, 100, 100]);
  });

  it('clamps input below 0 to 0', () => {
    const result = buildFlatSeries(-10, 3);
    expect(result).toEqual([0, 0, 0]);
  });

  it('handles count of 0 returning empty array', () => {
    expect(buildFlatSeries(50, 0)).toEqual([]);
  });

  it('handles count of 1', () => {
    expect(buildFlatSeries(75, 1)).toEqual([75]);
  });

  it('handles NaN value as 0', () => {
    const result = buildFlatSeries(NaN, 4);
    expect(result).toEqual([0, 0, 0, 0]);
  });

  it('handles count of 12 (1M range)', () => {
    const result = buildFlatSeries(60, 12);
    expect(result).toHaveLength(12);
    expect(result.every((v) => v === 60)).toBe(true);
  });

  it('is deterministic', () => {
    expect(buildFlatSeries(33, 7)).toEqual(buildFlatSeries(33, 7));
  });

  it('never throws on valid input', () => {
    expect(() => buildFlatSeries(50, 7)).not.toThrow();
  });

  it('never throws on edge inputs', () => {
    expect(() => buildFlatSeries(NaN, 0)).not.toThrow();
    expect(() => buildFlatSeries(-999, 1)).not.toThrow();
    expect(() => buildFlatSeries(999, 12)).not.toThrow();
  });
});
