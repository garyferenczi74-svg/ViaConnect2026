// Tests for the per-tier render-cost helpers (Prompt 210b, P7-T2).
//
// dprForTier and showParticlesForTier are pure functions: identical inputs always
// yield identical outputs. The critical invariant is that every cinematic value is
// byte-identical to the hardcoded constant that existed before this phase so a
// capable device sees zero change. Every cost reduction is gated on tier === 'lite'.

import { describe, it, expect } from 'vitest';
import { dprForTier, showParticlesForTier } from '../tierCost';

describe('dprForTier', () => {
  it('returns [1, 2] for cinematic -- byte-identical to the pre-P7-T2 hardcoded Canvas dpr value', () => {
    expect(dprForTier('cinematic')).toEqual([1, 2]);
  });

  it('returns [1, 1.5] for lite -- reduced fill-rate cap for low-power GPUs', () => {
    expect(dprForTier('lite')).toEqual([1, 1.5]);
  });

  it('lite DPR max is strictly less than cinematic DPR max (cost is genuinely reduced)', () => {
    const [, cinematicMax] = dprForTier('cinematic');
    const [, liteMax] = dprForTier('lite');
    expect(liteMax).toBeLessThan(cinematicMax);
  });

  it('both tiers share the same minimum DPR of 1 (no below-native rendering)', () => {
    expect(dprForTier('cinematic')[0]).toBe(1);
    expect(dprForTier('lite')[0]).toBe(1);
  });

  it('is pure: calling dprForTier twice with the same tier returns equal values', () => {
    expect(dprForTier('cinematic')).toEqual(dprForTier('cinematic'));
    expect(dprForTier('lite')).toEqual(dprForTier('lite'));
  });

  it('caps Safari / WebKit at 1× so first-paint does not miss a high-DPR buffer', () => {
    expect(dprForTier('cinematic', true)).toEqual([1, 1]);
    expect(dprForTier('lite', true)).toEqual([1, 1]);
    expect(dprForTier('cinematic')).toEqual([1, 2]);
  });
});

describe('showParticlesForTier', () => {
  it('returns true for cinematic -- byte-identical to today (particles fire when emphasisRegion is set)', () => {
    expect(showParticlesForTier('cinematic')).toBe(true);
  });

  it('returns false for lite -- decorative burst suppressed to save GPU fill-rate and blending cost', () => {
    expect(showParticlesForTier('lite')).toBe(false);
  });

  it('is pure: identical tier always yields the identical boolean', () => {
    expect(showParticlesForTier('cinematic')).toBe(showParticlesForTier('cinematic'));
    expect(showParticlesForTier('lite')).toBe(showParticlesForTier('lite'));
  });
});
