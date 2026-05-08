// Prompt #85n: unit tests for the heat-map color helpers. Verifies the
// fat / muscle inversion, the CHANGE_THRESHOLD floor, and the null-input
// fallthrough. Pure utility tests; no DOM, no Supabase.

import { describe, it, expect } from 'vitest';
import {
  CHANGE_THRESHOLD,
  getCalloutToneClass,
  getChangeDirection,
  getRegionFill,
  type RegionChangeData,
} from '@/lib/body-tracker/heatmap-colors';

const FILL_GREEN = 'rgba(45, 200, 120, 0.35)';
const FILL_YELLOW = 'rgba(255, 200, 50, 0.30)';
const FILL_RED = 'rgba(220, 50, 50, 0.35)';

function withRegion(regionId: string, change: number | null): RegionChangeData {
  return {
    [regionId]: {
      current: 25,
      previous: change === null ? null : 25 - change,
      change,
      direction: getChangeDirection(change),
    },
  };
}

describe('getChangeDirection', () => {
  it('returns neutral for null change', () => {
    expect(getChangeDirection(null)).toBe('neutral');
  });

  it('returns neutral when magnitude is below threshold', () => {
    expect(getChangeDirection(0)).toBe('neutral');
    expect(getChangeDirection(0.1)).toBe('neutral');
    expect(getChangeDirection(-0.19)).toBe('neutral');
  });

  it('returns gain for positive changes at or above threshold', () => {
    expect(getChangeDirection(CHANGE_THRESHOLD)).toBe('gain');
    expect(getChangeDirection(0.5)).toBe('gain');
    expect(getChangeDirection(2.4)).toBe('gain');
  });

  it('returns loss for negative changes at or above threshold magnitude', () => {
    expect(getChangeDirection(-CHANGE_THRESHOLD)).toBe('loss');
    expect(getChangeDirection(-0.5)).toBe('loss');
    expect(getChangeDirection(-3.0)).toBe('loss');
  });
});

describe('getRegionFill (fat metric)', () => {
  it('reads green for fat loss', () => {
    expect(getRegionFill('chest', withRegion('chest', -1.5), 'fat')).toBe(FILL_GREEN);
  });

  it('reads red for fat gain', () => {
    expect(getRegionFill('chest', withRegion('chest', 1.5), 'fat')).toBe(FILL_RED);
  });

  it('reads yellow for sub-threshold change', () => {
    expect(getRegionFill('chest', withRegion('chest', 0.1), 'fat')).toBe(FILL_YELLOW);
  });

  it('reads yellow for null previous (no change computable)', () => {
    expect(getRegionFill('chest', withRegion('chest', null), 'fat')).toBe(FILL_YELLOW);
  });

  it('reads yellow when region is missing from the map', () => {
    expect(getRegionFill('chest', {}, 'fat')).toBe(FILL_YELLOW);
  });
});

describe('getRegionFill (muscle metric inversion)', () => {
  it('reads green for muscle gain', () => {
    expect(getRegionFill('chest', withRegion('chest', 1.5), 'muscle')).toBe(FILL_GREEN);
  });

  it('reads red for muscle loss', () => {
    expect(getRegionFill('chest', withRegion('chest', -1.5), 'muscle')).toBe(FILL_RED);
  });

  it('keeps neutral the same regardless of metric', () => {
    expect(getRegionFill('chest', withRegion('chest', 0.1), 'muscle')).toBe(FILL_YELLOW);
    expect(getRegionFill('chest', withRegion('chest', null), 'muscle')).toBe(FILL_YELLOW);
  });
});

describe('getCalloutToneClass', () => {
  it('maps fat gain to text-red-400', () => {
    expect(getCalloutToneClass('gain', 'fat')).toBe('text-red-400');
  });

  it('maps fat loss to text-green-400', () => {
    expect(getCalloutToneClass('loss', 'fat')).toBe('text-green-400');
  });

  it('maps muscle gain to text-green-400', () => {
    expect(getCalloutToneClass('gain', 'muscle')).toBe('text-green-400');
  });

  it('maps muscle loss to text-red-400', () => {
    expect(getCalloutToneClass('loss', 'muscle')).toBe('text-red-400');
  });

  it('maps neutral direction to muted yellow regardless of metric', () => {
    expect(getCalloutToneClass('neutral', 'fat')).toBe('text-yellow-400/80');
    expect(getCalloutToneClass('neutral', 'muscle')).toBe('text-yellow-400/80');
  });
});
