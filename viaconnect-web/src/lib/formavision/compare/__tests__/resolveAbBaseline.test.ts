// Prompt Brief 2: tests for resolveAbBaseline / pairScanPoints.

import { describe, it, expect } from 'vitest';
import {
  pairScanPoints,
  resolveAbBaseline,
  type AbScanPoint,
} from '../resolveAbBaseline';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import {
  emptyMeasurements,
  type CircumferenceMeasurements,
} from '@/lib/body-tracker/circumference';

function snapshot(
  entryId: string,
  recordedAt: string,
  waistFat?: number | null,
): CompositionSnapshot {
  return {
    entryId,
    source: 'scan',
    recordedAt,
    totalBodyFatPct: waistFat ?? null,
    regionFatPct: {
      right_arm: null,
      left_arm: null,
      trunk: null,
      right_leg: null,
      left_leg: null,
    },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: {
      right_arm: null,
      left_arm: null,
      trunk: null,
      right_leg: null,
      left_leg: null,
    },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
  };
}

function point(
  entryId: string,
  recordedAt: string,
  circ?: CircumferenceMeasurements | null,
): AbScanPoint {
  return {
    recordedAt,
    composition: snapshot(entryId, recordedAt),
    circumferences: circ ?? null,
  };
}

describe('pairScanPoints', () => {
  it('pairs by recordedAt and leaves unmatched circumference as null', () => {
    const snaps = [
      snapshot('a', '2026-01-01T00:00:00Z'),
      snapshot('b', '2026-02-01T00:00:00Z'),
    ];
    const circ = [
      { recordedAt: '2026-02-01T00:00:00Z', measurements: { ...emptyMeasurements(), waist: 32 } },
    ];
    const paired = pairScanPoints(snaps, circ);
    expect(paired).toHaveLength(2);
    expect(paired[0].circumferences).toBeNull();
    expect(paired[1].circumferences?.waist).toBe(32);
  });

  it('falls back to the same index when timestamps do not match', () => {
    const snaps = [snapshot('a', '2026-01-01T00:00:00Z')];
    const circ = [
      { recordedAt: '2026-01-01T00:00:01Z', measurements: { ...emptyMeasurements(), waist: 34 } },
    ];
    const paired = pairScanPoints(snaps, circ);
    expect(paired[0].circumferences?.waist).toBe(34);
  });
});

describe('resolveAbBaseline: last_scan (default)', () => {
  it('returns not comparable when there are fewer than two scans', () => {
    expect(resolveAbBaseline({ scans: [], mode: 'last_scan' }).comparable).toBe(false);
    const one = resolveAbBaseline({
      scans: [point('a', '2026-01-01T00:00:00Z')],
      mode: 'last_scan',
    });
    expect(one.comparable).toBe(false);
    expect(one.baseline).toBeNull();
    expect(one.latest?.composition.entryId).toBe('a');
  });

  it('picks the scan immediately before latest', () => {
    const scans = [
      point('a', '2026-01-01T00:00:00Z'),
      point('b', '2026-02-01T00:00:00Z'),
      point('c', '2026-03-01T00:00:00Z'),
    ];
    const res = resolveAbBaseline({ scans, mode: 'last_scan' });
    expect(res.kind).toBe('last_scan');
    expect(res.comparable).toBe(true);
    expect(res.baseline?.composition.entryId).toBe('b');
    expect(res.latest?.composition.entryId).toBe('c');
  });
});

describe('resolveAbBaseline: protocol_start (fallback first)', () => {
  const scans = [
    point('a', '2026-01-01T00:00:00Z'),
    point('b', '2026-02-01T00:00:00Z'),
    point('c', '2026-03-01T00:00:00Z'),
  ];

  it('falls back to the first scan when no protocol date is on file', () => {
    const res = resolveAbBaseline({ scans, mode: 'protocol_start', protocolStartedAt: null });
    expect(res.kind).toBe('first_scan_fallback');
    expect(res.baseline?.composition.entryId).toBe('a');
    expect(res.comparable).toBe(true);
  });

  it('picks the last scan at or before protocol start', () => {
    const res = resolveAbBaseline({
      scans,
      mode: 'protocol_start',
      protocolStartedAt: '2026-02-15T00:00:00Z',
    });
    expect(res.kind).toBe('protocol_start');
    expect(res.baseline?.composition.entryId).toBe('b');
  });

  it('falls back to first when every scan is after protocol start', () => {
    const res = resolveAbBaseline({
      scans,
      mode: 'protocol_start',
      protocolStartedAt: '2025-12-01T00:00:00Z',
    });
    expect(res.kind).toBe('first_scan_fallback');
    expect(res.baseline?.composition.entryId).toBe('a');
  });

  it('is not comparable when protocol start is the current scan', () => {
    const res = resolveAbBaseline({
      scans: [point('a', '2026-01-01T00:00:00Z'), point('b', '2026-02-01T00:00:00Z')],
      mode: 'protocol_start',
      protocolStartedAt: '2026-03-01T00:00:00Z',
    });
    expect(res.kind).toBe('protocol_start');
    expect(res.baseline?.composition.entryId).toBe('b');
    expect(res.comparable).toBe(false);
  });

  it('treats an unparseable protocol date as first-scan fallback', () => {
    const res = resolveAbBaseline({
      scans,
      mode: 'protocol_start',
      protocolStartedAt: 'not-a-date',
    });
    expect(res.kind).toBe('first_scan_fallback');
    expect(res.baseline?.composition.entryId).toBe('a');
  });
});
