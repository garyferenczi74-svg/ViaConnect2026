/**
 * Prompt 170o Phase 1 Phase D + Prompt 172e Phase A: unit tests for
 * hydration_ml computation.
 *
 * Gates that the server side hydration math matches the Maughan grounded
 * coefficient table introduced by Prompt 172e (Gordon Deliverable 1
 * ratified 2026-06-02). The old 170o LP1 1.0 table is superseded; the
 * canonical post patch row is in maughan-coefficients.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { computeHydrationMl } from '../hydration-ml-computer';
import {
  hydrationRatio,
  HYDRATION_SOURCE_KINDS,
  HYDRATION_RATIO_CONSERVATIVE,
} from '../types';

describe('computeHydrationMl', () => {
  it('returns 0 when source_kind is null', () => {
    expect(computeHydrationMl({ source_kind: null, portion_volume_ml: 240, counting_mode: 'adjusted' })).toBe(0);
  });

  it('returns 0 when portion_volume_ml is null', () => {
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: null, counting_mode: 'adjusted' })).toBe(0);
  });

  it('returns 0 when portion_volume_ml is non-positive', () => {
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: 0, counting_mode: 'adjusted' })).toBe(0);
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: -50, counting_mode: 'adjusted' })).toBe(0);
  });

  it('computes pure_water at 100pct in both modes', () => {
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: 240, counting_mode: 'conservative' })).toBe(240);
    expect(computeHydrationMl({ source_kind: 'pure_water', portion_volume_ml: 240, counting_mode: 'adjusted' })).toBe(240);
  });

  it('zeros out non water kinds in conservative mode', () => {
    expect(computeHydrationMl({ source_kind: 'coffee_tea', portion_volume_ml: 240, counting_mode: 'conservative' })).toBe(0);
    expect(computeHydrationMl({ source_kind: 'soda', portion_volume_ml: 355, counting_mode: 'conservative' })).toBe(0);
    expect(computeHydrationMl({ source_kind: 'alcohol_high', portion_volume_ml: 148, counting_mode: 'conservative' })).toBe(0);
  });
});

describe('hydrationRatio helper', () => {
  it('exposes the canonical conservative table verbatim', () => {
    for (const kind of HYDRATION_SOURCE_KINDS) {
      const expected = kind === 'pure_water' ? 1.0 : 0;
      expect(HYDRATION_RATIO_CONSERVATIVE[kind]).toBe(expected);
      expect(hydrationRatio(kind, 'conservative')).toBe(expected);
    }
  });
});
