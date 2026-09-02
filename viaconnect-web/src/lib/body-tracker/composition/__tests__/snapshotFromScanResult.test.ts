import { describe, expect, it } from 'vitest';
import { snapshotFromPhotoScanSummary, snapshotFromScanResult } from '../snapshotFromScanResult';
import { estimateCircumferencesFromComposition } from '../estimateCircumferencesFromComposition';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import type { BodyScanResult } from '../runFormaVisionAnalyze';

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
      ai_confidence: 'high',
      ...overrides,
    },
  };
}

describe('snapshotFromScanResult', () => {
  it('maps the analyze midpoint into a scan-linked composition snapshot', () => {
    const snap = snapshotFromScanResult(result());
    expect(snap.scanId).toBe('scan-1');
    expect(snap.source).toBe('scan');
    expect(snap.isEstimated).toBe(true);
    expect(snap.totalBodyFatPct).toBe(24);
    expect(snap.estimatedBodyFatMin).toBe(22);
    expect(snap.estimatedBodyFatMax).toBe(26);
    expect(snap.estimatedWhrMin).toBe(0.84);
    expect(snap.estimatedWhrMax).toBe(0.88);
  });

  it('overlay girths morph the avatar; scanToParamVector still preserves a null waist', () => {
    const leanSnap = snapshotFromScanResult(result({
      estimated_body_fat_min: 10,
      estimated_body_fat_max: 12,
    }));
    const heavySnap = snapshotFromScanResult(result({
      estimated_body_fat_min: 32,
      estimated_body_fat_max: 36,
    }));
    const honest = scanToParamVector({
      snapshot: heavySnap,
      circumferences: null,
      sex: 'male',
    });
    expect(honest.rings.find((r) => r.id === 'waist')?.circumferenceM).toBeNull();
    expect(honest.rings.find((r) => r.id === 'waist')?.estimated).toBe(true);

    const lean = scanToParamVector({
      snapshot: leanSnap,
      circumferences: estimateCircumferencesFromComposition(leanSnap, 'male', 'in'),
      sex: 'male',
      unit: 'in',
    });
    const heavy = scanToParamVector({
      snapshot: heavySnap,
      circumferences: estimateCircumferencesFromComposition(heavySnap, 'male', 'in'),
      sex: 'male',
      unit: 'in',
    });
    const waistLean = lean.rings.find((r) => r.id === 'waist')?.circumferenceM;
    const waistHeavy = heavy.rings.find((r) => r.id === 'waist')?.circumferenceM;
    expect(waistLean).toBeTruthy();
    expect(waistHeavy).toBeTruthy();
    expect(waistLean!).toBeLessThan(waistHeavy!);
  });

  it('Ready photo-scan summary with a BF range maps to a morphable snapshot', () => {
    const snap = snapshotFromPhotoScanSummary({
      id: 'photo-sep1',
      date: '2026-09-01',
      estimatedBodyFatMin: 30,
      estimatedBodyFatMax: 36,
      estimatedWhrMin: 0.84,
      estimatedWhrMax: 0.88,
    });
    expect(snap?.scanId).toBe('photo-sep1');
    expect(snap?.totalBodyFatPct).toBe(33);
    expect(snap?.isEstimated).toBe(true);
  });

  it('does not invent a snapshot when the Ready row has no BF range', () => {
    expect(
      snapshotFromPhotoScanSummary({
        id: 'photo-empty',
        date: '2026-09-01',
        estimatedBodyFatMin: null,
        estimatedBodyFatMax: null,
      }),
    ).toBeNull();
  });
});
