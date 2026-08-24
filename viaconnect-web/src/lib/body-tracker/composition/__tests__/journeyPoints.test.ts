import { describe, it, expect } from 'vitest';
import {
  isCompletedPhotoScan,
  isJourneyCompositionPoint,
  isWeightOnlySnapshot,
} from '../journeyPoints';
import type { CompositionSnapshot } from '../types';

const emptyRegion = {
  right_arm: null,
  left_arm: null,
  trunk: null,
  right_leg: null,
  left_leg: null,
};

function snap(over: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    entryId: 'e',
    source: 'manual',
    recordedAt: '2026-05-08T00:00:00Z',
    totalBodyFatPct: null,
    regionFatPct: { ...emptyRegion },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { ...emptyRegion },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    ...over,
  };
}

describe('journeyPoints (210l honesty)', () => {
  it('treats May-style weight-only dates as not completed photo scans', () => {
    const may8 = snap({ entryId: 'may-8', recordedAt: '2026-05-08T00:00:00Z' });
    const may12 = snap({ entryId: 'may-12', recordedAt: '2026-05-12T00:00:00Z' });
    const may21 = snap({ entryId: 'may-21', recordedAt: '2026-05-21T00:00:00Z' });
    for (const row of [may8, may12, may21]) {
      expect(isWeightOnlySnapshot(row)).toBe(true);
      expect(isCompletedPhotoScan(row)).toBe(false);
      expect(isJourneyCompositionPoint(row)).toBe(false);
    }
  });

  it('keeps the 260/27 manual composition fixture on the journey', () => {
    const fixture = snap({
      entryId: 'bbf8f8d0-59dc-4460-965d-5c66c8bd32eb',
      source: 'manual',
      totalBodyFatPct: 27,
    });
    expect(isWeightOnlySnapshot(fixture)).toBe(false);
    expect(isJourneyCompositionPoint(fixture)).toBe(true);
    expect(isCompletedPhotoScan(fixture)).toBe(false);
  });

  it('treats scan_id / source=scan as a completed photo scan', () => {
    const scan = snap({
      source: 'scan',
      scanId: 'scan-1',
      estimatedBodyFatMin: 18,
      estimatedBodyFatMax: 22,
      isEstimated: true,
    });
    expect(isCompletedPhotoScan(scan)).toBe(true);
    expect(isJourneyCompositionPoint(scan)).toBe(true);
    expect(isWeightOnlySnapshot(scan)).toBe(false);
  });
});
