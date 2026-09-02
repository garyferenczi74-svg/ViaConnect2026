import { describe, expect, it } from 'vitest';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { estimateCircumferencesFromComposition } from '../estimateCircumferencesFromComposition';
import {
  historySnapshotCanEstimateGirths,
  pickHistorySnapshotForAvatar,
  pickReadyPhotoSnapshot,
  resolveAvatarCircumferences,
} from '../resolveAvatarCircumferences';
import { buildBodyGeometry } from '@/lib/formavision/geometry/buildBodyGeometry';
import { MALE_TEMPLATE } from '@/lib/formavision/geometry/types';
import * as THREE from 'three';
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

  it('cold-load history BF 31% drives a non-template male waist (avatar only)', () => {
    const history = historySnap({
      totalBodyFatPct: 31,
      estimatedBodyFatMin: 30,
      estimatedBodyFatMax: 36,
      estimatedWhrMin: 0.84,
      estimatedWhrMax: 0.88,
    });
    expect(historySnapshotCanEstimateGirths(history)).toBe(true);
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
    const template = scanToParamVector({
      snapshot: history,
      circumferences: null,
      sex: 'male',
      unit: 'in',
    });
    const waist = vector.rings.find((r) => r.id === 'waist')?.circumferenceM;
    const hip = vector.rings.find((r) => r.id === 'hip')?.circumferenceM;
    expect(waist).toBeTruthy();
    expect(hip).toBeTruthy();
    expect(waist).not.toBe(0.9);
    expect(hip).not.toBe(0.98);
    expect(template.rings.find((r) => r.id === 'waist')?.circumferenceM).toBeNull();
  });

  it('skips a weight-only latest and uses the journey BF snapshot', () => {
    const weightOnly = historySnap({
      totalBodyFatPct: null,
      estimatedBodyFatMin: null,
      estimatedBodyFatMax: null,
      isEstimated: false,
      source: 'manual',
      scanId: null,
    });
    const journey = historySnap({ totalBodyFatPct: 31 });
    expect(pickHistorySnapshotForAvatar(weightOnly, [journey])).toBe(journey);
  });

  it('prefers a Ready photo snapshot over a lean composition latest', () => {
    const lean = historySnap({
      totalBodyFatPct: 18,
      estimatedBodyFatMin: 17,
      estimatedBodyFatMax: 19,
    });
    const ready = pickReadyPhotoSnapshot([
      {
        id: 'photo-31',
        date: '2026-09-01',
        protocol: 'formavision_photo',
        captureStatus: 'ready',
        poses: { front: false, right: false, back: false, left: false },
        estimatedBodyFatMin: 29,
        estimatedBodyFatMax: 33,
      },
    ]);
    expect(ready?.totalBodyFatPct).toBe(31);
    expect(pickHistorySnapshotForAvatar(lean, [], ready)).toBe(ready);
  });

  it('journey vector with empty circHistory uses estimated girths; readout waist stays null', () => {
    const history = historySnap({
      totalBodyFatPct: 31,
      estimatedBodyFatMin: 30,
      estimatedBodyFatMax: 36,
    });
    const measured = null;
    const readoutWaist = measured?.waist ?? null;
    expect(readoutWaist).toBeNull();
    const vector = scanToParamVector({
      snapshot: history,
      circumferences: resolveAvatarCircumferences({
        overlay: null,
        measured,
        historySnapshot: history,
        sex: 'male',
        unit: 'in',
      }),
      sex: 'male',
      unit: 'in',
    });
    expect(vector.rings.find((r) => r.id === 'waist')?.circumferenceM).not.toBe(0.9);
  });

  it('BF 30–36% overlay girths change the mesh waist radius vs the sex template', () => {
    const history = historySnap({
      totalBodyFatPct: 33,
      estimatedBodyFatMin: 30,
      estimatedBodyFatMax: 36,
      estimatedWhrMin: 0.84,
      estimatedWhrMax: 0.88,
    });
    const circs = resolveAvatarCircumferences({
      overlay: estimateCircumferencesFromComposition(history, 'male', 'in'),
      measured: emptyMeasurements(),
      historySnapshot: history,
      sex: 'male',
      unit: 'in',
    });
    const morphed = scanToParamVector({
      snapshot: history,
      circumferences: circs,
      sex: 'male',
      unit: 'in',
    });
    const template = scanToParamVector({
      snapshot: null,
      circumferences: null,
      sex: 'male',
      unit: 'in',
    });
    const waistY = MALE_TEMPLATE.rings.find((r) => r.id === 'waist')!.levelN * MALE_TEMPLATE.heightM;
    const morphGeo = buildBodyGeometry(morphed);
    const templateGeo = buildBodyGeometry(template);
    const morphR = meanRadiusAtY(morphGeo.geometry, waistY, 0.02);
    const templateR = meanRadiusAtY(templateGeo.geometry, waistY, 0.02);
    expect(morphR).toBeGreaterThan(templateR * 1.05);
    morphGeo.dispose();
    templateGeo.dispose();
  });
});

function meanRadiusAtY(geometry: THREE.BufferGeometry, targetY: number, bandM: number): number {
  const pos = geometry.getAttribute('position');
  let sum = 0;
  let count = 0;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (Math.abs(y - targetY) <= bandM) {
      sum += Math.hypot(pos.getX(i), pos.getZ(i));
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}
