import { describe, it, expect } from 'vitest';
import { resolveSurfaceState } from '../surfaceState';
import type { CompositionSnapshot } from '../types';

const baseRegion = { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null };

const partialSnap: CompositionSnapshot = {
  entryId: 'e1',
  source: 'scan',
  recordedAt: '2026-06-22T00:00:00Z',
  totalBodyFatPct: 21.3,
  regionFatPct: { ...baseRegion },
  visceralFatRating: null,
  bodyWaterPct: null,
  regionMuscleLbs: { ...baseRegion },
  totalMuscleMassLbs: null,
  skeletalMuscleMassLbs: null,
};

const fullSnap: CompositionSnapshot = {
  ...partialSnap,
  visceralFatRating: 5,
  bodyWaterPct: 55.0,
  totalMuscleMassLbs: 140.0,
  skeletalMuscleMassLbs: 120.0,
};

describe('resolveSurfaceState', () => {
  it('returns loading when loading is true', () => {
    expect(resolveSurfaceState({ loading: true, error: false, snapshot: null })).toBe('loading');
  });

  it('returns error when error is true (and not loading)', () => {
    expect(resolveSurfaceState({ loading: false, error: true, snapshot: null })).toBe('error');
  });

  it('returns empty when no snapshot', () => {
    expect(resolveSurfaceState({ loading: false, error: false, snapshot: null })).toBe('empty');
  });

  it('returns partial when snapshot has totalBodyFatPct but visceral/bodyWater are null', () => {
    expect(resolveSurfaceState({ loading: false, error: false, snapshot: partialSnap })).toBe('partial');
  });

  it('returns ready when all core metrics are present', () => {
    expect(resolveSurfaceState({ loading: false, error: false, snapshot: fullSnap })).toBe('ready');
  });
});
