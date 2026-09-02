import { describe, expect, it } from 'vitest';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { estimateCircumferencesFromComposition } from '../estimateCircumferencesFromComposition';
import {
  historySnapshotCanEstimateGirths,
  resolveAvatarCircumferences,
} from '../resolveAvatarCircumferences';
import { snapshotFromScanResult } from '../snapshotFromScanResult';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import type { BodyScanResult } from '../runFormaVisionAnalyze';
import type { CompositionSnapshot } from '../types';

function result(overrides: Partial<BodyScanResult['estimates']> = {}): BodyScanResult {
  return {
    scanId: 'scan-1',
    scanDate: '2026-09-02T12:00:00.000Z',
    estimates: {
      estimated_body_fat_min: 22,
      estimated_body_fat_max: 26,
      body_type: 'mesomorph',
      fat_distribution: 'even',
      estimated_whr_min: 0.84,
      estimated_whr_max: 0.88,
      muscle_development: { arms: 3, chest: 3, back: 3, core: 3, legs: 3 },
      ai_confidence: 'medium',
      ...overrides,
    },
  };
}

const EMPTY_REGION = {
  right_arm: null,
  left_arm: null,
  trunk: null,
  right_leg: null,
  left_leg: null,
};

function historySnap(overrides: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    entryId: 'entry-1',
    source: 'scan',
    recordedAt: '2026-09-01T18:00:00.000Z',
    totalBodyFatPct: 24,
    regionFatPct: { ...EMPTY_REGION },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { ...EMPTY_REGION },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    scanId: 'scan-1',
    estimatedBodyFatMin: 22,
    estimatedBodyFatMax: 26,
    isEstimated: true,
    ...overrides,
  };
}

describe('resolveAvatarCircumferences', () => {
  it('prefers overlay, then any finite measured girth, then history BF estimate', () => {
    const overlaySnap = snapshotFromScanResult(result({
      estimated_body_fat_min: 10,
      estimated_body_fat_max: 12,
    }));
    const overlay = estimateCircumferencesFromComposition(overlaySnap, 'male', 'in');
    const measured = emptyMeasurements();
    measured.waist = 34;
    const history = historySnap({ totalBodyFatPct: 34, estimatedBodyFatMin: 32, estimatedBodyFatMax: 36 });

    expect(resolveAvatarCircumferences({
      overlay,
      measured,
      historySnapshot: history,
      sex: 'male',
      unit: 'in',
    })).toEqual(overlay);

    expect(resolveAvatarCircumferences({
      overlay: null,
      measured,
      historySnapshot: history,
      sex: 'male',
      unit: 'in',
    })?.waist).toBe(34);

    const fromHistory = resolveAvatarCircumferences({
      overlay: null,
      measured: emptyMeasurements(),
      historySnapshot: history,
      sex: 'male',
      unit: 'in',
    });
    expect(fromHistory).toEqual(estimateCircumferencesFromComposition(history, 'male', 'in'));
  });

  it('treats emptyMeasurements / all-null as absent so Close/refresh still morphs from history BF', () => {
    const history = historySnap({ totalBodyFatPct: 24 });
    const circs = resolveAvatarCircumferences({
      overlay: null,
      measured: emptyMeasurements(),
      historySnapshot: history,
      sex: 'male',
      unit: 'in',
    });
    const vector = scanToParamVector({
      snapshot: history,
      circumferences: circs,
      sex: 'male',
      unit: 'in',
    });
    const waist = vector.rings.find((r) => r.id === 'waist')?.circumferenceM;
    expect(waist).toBeTruthy();
    expect(waist).not.toBe(0.9);
    expect(historySnapshotCanEstimateGirths(history)).toBe(true);
  });

  it('does not invent girths inside scanToParamVector when history BF exists but circs stay null', () => {
    const history = historySnap();
    const honest = scanToParamVector({
      snapshot: history,
      circumferences: null,
      sex: 'male',
      unit: 'in',
    });
    expect(honest.rings.find((r) => r.id === 'waist')?.circumferenceM).toBeNull();
    expect(honest.rings.find((r) => r.id === 'waist')?.estimated).toBe(true);
  });

  it('returns null when history has no BF / is not an estimated scan', () => {
    expect(resolveAvatarCircumferences({
      overlay: null,
      measured: null,
      historySnapshot: historySnap({
        totalBodyFatPct: null,
        estimatedBodyFatMin: null,
        estimatedBodyFatMax: null,
        isEstimated: false,
        source: 'manual',
        scanId: null,
      }),
      sex: 'male',
      unit: 'in',
    })).toBeNull();
    expect(historySnapshotCanEstimateGirths(null)).toBe(false);
  });
});
