// Prompt 210b P3-T2b: pure timeline math tests for the Time Machine scrubber.

import { describe, it, expect } from 'vitest';
import {
  buildSnapPositions,
  resolveTimelinePosition,
  snapPositionToNearestScan,
  positionForIndex,
  resolveReadoutMode,
} from '../journeyTimeline';

describe('buildSnapPositions', () => {
  it('N scans yield N evenly spaced snap points from 0 to 1', () => {
    const snaps = buildSnapPositions(4);
    expect(snaps.map((s) => s.index)).toEqual([0, 1, 2, 3]);
    expect(snaps.map((s) => s.p)).toEqual([0, 1 / 3, 2 / 3, 1]);
  });

  it('a single scan yields one snap at 0', () => {
    expect(buildSnapPositions(1)).toEqual([{ index: 0, p: 0 }]);
  });

  it('no scans yields no snaps', () => {
    expect(buildSnapPositions(0)).toEqual([]);
  });
});

describe('resolveTimelinePosition', () => {
  it('a position between scan i and i+1 yields those two indices and the right local t', () => {
    // 4 scans -> snaps at 0, 1/3, 2/3, 1. p = 0.5 sits between scan 1 and 2.
    const pos = resolveTimelinePosition(0.5, 4);
    expect(pos.indexA).toBe(1);
    expect(pos.indexB).toBe(2);
    // scaled = 0.5 * 3 = 1.5 -> localT 0.5.
    expect(pos.localT).toBeCloseTo(0.5, 6);
    expect(pos.atSnap).toBe(false);
  });

  it('at a snap point localT is 0 and indexA === indexB (exact scan)', () => {
    const atSecond = resolveTimelinePosition(1 / 3, 4);
    expect(atSecond.atSnap).toBe(true);
    expect(atSecond.indexA).toBe(1);
    expect(atSecond.indexB).toBe(1);
    expect(atSecond.localT).toBe(0);
    expect(atSecond.nearestIndex).toBe(1);
  });

  it('clamps out-of-range positions and lands on the end snaps', () => {
    expect(resolveTimelinePosition(-1, 3).nearestIndex).toBe(0);
    expect(resolveTimelinePosition(2, 3).nearestIndex).toBe(2);
    expect(resolveTimelinePosition(2, 3).atSnap).toBe(true);
  });

  it('nearestIndex is the closer endpoint between scans', () => {
    // 3 scans -> snaps 0, 0.5, 1. p = 0.3 -> between 0 and 1, scaled 0.6, closer to 1.
    const near = resolveTimelinePosition(0.3, 3);
    expect(near.indexA).toBe(0);
    expect(near.indexB).toBe(1);
    expect(near.nearestIndex).toBe(1);
  });

  it('a single scan always resolves to index 0 at a snap', () => {
    const pos = resolveTimelinePosition(0.7, 1);
    expect(pos).toEqual({ indexA: 0, indexB: 0, localT: 0, atSnap: true, nearestIndex: 0 });
  });
});

describe('snapPositionToNearestScan', () => {
  it('snaps an arbitrary position to the nearest scan position (reduced motion)', () => {
    // 5 scans -> snaps at 0, 0.25, 0.5, 0.75, 1. p = 0.6 -> nearest is 0.5.
    expect(snapPositionToNearestScan(0.6, 5)).toBeCloseTo(0.5, 6);
    expect(snapPositionToNearestScan(0.7, 5)).toBeCloseTo(0.75, 6);
  });

  it('a single scan snaps to 0', () => {
    expect(snapPositionToNearestScan(0.9, 1)).toBe(0);
  });
});

describe('positionForIndex', () => {
  it('maps a scan index to its normalized position', () => {
    expect(positionForIndex(0, 4)).toBe(0);
    expect(positionForIndex(2, 4)).toBeCloseTo(2 / 3, 6);
    expect(positionForIndex(3, 4)).toBe(1);
  });
});

describe('resolveReadoutMode (honesty)', () => {
  it('at a snap reports a measured readout for that real scan', () => {
    const pos = resolveTimelinePosition(2 / 3, 4); // exact scan index 2
    const mode = resolveReadoutMode(pos);
    expect(mode).toEqual({ kind: 'measured', scanIndex: 2 });
  });

  it('between scans reports a transition with the two endpoints and the nearest, never a measured value at the in-between point', () => {
    const pos = resolveTimelinePosition(0.5, 4); // between scan 1 and 2
    const mode = resolveReadoutMode(pos);
    expect(mode.kind).toBe('transition');
    if (mode.kind === 'transition') {
      expect(mode.fromIndex).toBe(1);
      expect(mode.toIndex).toBe(2);
      // nearest is a real scan index (the closer endpoint), never a fabricated point.
      expect([1, 2]).toContain(mode.nearestIndex);
    }
  });
});
