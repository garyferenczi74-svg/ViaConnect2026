import { describe, it, expect } from 'vitest';
import {
  buildScale,
  weightYDomain,
  computeMilestones,
  thinMilestonesForRange,
  thinTicks,
  onTrackStatus,
  smoothLinePath,
  areaPath,
} from '../trajectoryChartMath';

const PAD = { t: 30, r: 20, b: 40, l: 50 };

describe('buildScale', () => {
  const s = buildScale({ minMs: 0, maxMs: 100, yMin: 100, yMax: 200, vbW: 820, vbH: 320, pad: PAD });
  it('maps the x domain edges to the inner left and right', () => {
    expect(s.xForMs(0)).toBeCloseTo(PAD.l, 5);
    expect(s.xForMs(100)).toBeCloseTo(820 - PAD.r, 5);
  });
  it('maps the y domain so yMax is at the top and yMin at the baseline', () => {
    expect(s.yForLb(200)).toBeCloseTo(PAD.t, 5);
    expect(s.yForLb(100)).toBeCloseTo(s.baseY, 5);
  });
});

describe('weightYDomain', () => {
  it('pads the min and max by 5 lb', () => {
    expect(weightYDomain([190, 200, 180])).toEqual([175, 205]);
  });
  it('handles an empty series', () => {
    expect(weightYDomain([])).toEqual([0, 1]);
  });
});

describe('computeMilestones', () => {
  it('loss goal yields start, 10 lb crossing, goal (halfway deduped)', () => {
    expect(computeMilestones(200, 180)).toEqual([200, 190, 180]);
  });
  it('gain goal ordered start to goal', () => {
    expect(computeMilestones(150, 170)).toEqual([150, 160, 170]);
  });
  it('equal start and goal yields a single marker', () => {
    expect(computeMilestones(180, 180)).toEqual([180]);
  });
});

describe('thinMilestonesForRange', () => {
  it('keeps all on a wide span', () => {
    expect(thinMilestonesForRange([200, 190, 180], 20)).toEqual([200, 190, 180]);
  });
  it('drops intermediates on a narrow span', () => {
    expect(thinMilestonesForRange([200, 197, 194, 191, 188], 4)).toEqual([200, 194, 188]);
  });
});

describe('thinTicks', () => {
  it('returns all when under the cap', () => {
    expect(thinTicks([1, 2, 3], 5)).toEqual([1, 2, 3]);
  });
  it('samples at most maxTicks', () => {
    const out = thinTicks([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
    expect(out.length).toBeLessThanOrEqual(4);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(9);
  });
});

describe('onTrackStatus', () => {
  const base = { startLb: 200, goalLb: 180, startMs: 0, projectedMs: 100, todayMs: 50 };
  // Expected at today (50%): 190.
  it('ahead when losing faster than expected', () => {
    expect(onTrackStatus({ ...base, latestLb: 186 })).toBe('ahead');
  });
  it('behind when losing slower than expected', () => {
    expect(onTrackStatus({ ...base, latestLb: 195 })).toBe('behind');
  });
  it('on_track within tolerance', () => {
    expect(onTrackStatus({ ...base, latestLb: 190.5 })).toBe('on_track');
  });
  it('gain goal: above expected is ahead', () => {
    expect(
      onTrackStatus({ startLb: 150, goalLb: 170, startMs: 0, projectedMs: 100, todayMs: 50, latestLb: 165 }),
    ).toBe('ahead');
  });
  it('null when latest weight missing', () => {
    expect(onTrackStatus({ ...base, latestLb: null })).toBeNull();
  });
  it('null when no projected date', () => {
    expect(onTrackStatus({ ...base, latestLb: 190, projectedMs: null })).toBeNull();
  });
});

describe('path builders', () => {
  const s = buildScale({ minMs: 0, maxMs: 2, yMin: 100, yMax: 200, vbW: 820, vbH: 320, pad: PAD });
  it('smoothLinePath starts with a move command', () => {
    const d = smoothLinePath([{ ms: 0, lb: 150 }, { ms: 1, lb: 160 }, { ms: 2, lb: 170 }], s);
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('C');
  });
  it('areaPath closes back to the baseline', () => {
    const d = areaPath([{ ms: 0, lb: 150 }, { ms: 2, lb: 170 }], s);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain(s.baseY.toFixed(2));
  });
});
