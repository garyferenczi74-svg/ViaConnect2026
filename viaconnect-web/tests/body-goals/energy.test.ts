import { describe, it, expect } from 'vitest';
import { computeBmr, computeInitialTdee, estimateAdaptiveTdee } from '@/lib/body-goals/energy';
import type { LbmResolution } from '@/lib/gordon/lbm';

const measuredLbm = (lbmKg: number): LbmResolution => ({
  lbmKg,
  bodyFatFraction: 0.2,
  source: 'measured',
});

describe('computeBmr', () => {
  it('uses Katch-McArdle when measured LBM is present', () => {
    const r = computeBmr({ lbm: measuredLbm(60), weightKg: 80, heightCm: 178, age: 35, sex: 'male' });
    expect(r?.method).toBe('katch_mcardle');
    expect(r?.bmr).toBeCloseTo(370 + 21.6 * 60, 1);
  });
  it('falls back to Mifflin-St Jeor when LBM is not measured (estimated source)', () => {
    const estimated: LbmResolution = { lbmKg: 58, bodyFatFraction: null, source: 'estimated' };
    const r = computeBmr({ lbm: estimated, weightKg: 80, heightCm: 178, age: 35, sex: 'male' });
    expect(r?.method).toBe('mifflin_st_jeor');
    expect(r?.bmr).toBeCloseTo(10 * 80 + 6.25 * 178 - 5 * 35 + 5, 1);
  });
  it('returns null when neither path has inputs', () => {
    expect(computeBmr({ lbm: null, weightKg: 0, heightCm: 0, age: 0, sex: 'male' })).toBeNull();
  });
});

describe('computeInitialTdee', () => {
  it('scales BMR by the activity multiplier', () => {
    expect(computeInitialTdee(1700, 'moderate')).toBeCloseTo(1700 * 1.55, 1);
  });
});

describe('estimateAdaptiveTdee', () => {
  it('reconciles intake against the smoothed weight delta', () => {
    const r = estimateAdaptiveTdee({ avgLoggedKcal: 1800, weightChangeLb: -2, windowDays: 14, priorTdee: null });
    expect(r).toBeCloseTo(1800 - (-2 * 3500) / 14, 0);
  });
  it('blends with the prior estimate using alpha 0.5', () => {
    const r = estimateAdaptiveTdee({ avgLoggedKcal: 1800, weightChangeLb: 0, windowDays: 14, priorTdee: 2000 });
    expect(r).toBe(Math.round(0.5 * 1800 + 0.5 * 2000));
  });
});
