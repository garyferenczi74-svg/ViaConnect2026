import { describe, expect, it } from 'vitest';
import { snapshotFromScanResult } from '../snapshotFromScanResult';
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

  it('drives a visible waist morph versus the sex-template baseline', () => {
    const lean = scanToParamVector({
      snapshot: snapshotFromScanResult(result({
        estimated_body_fat_min: 10,
        estimated_body_fat_max: 12,
      })),
      circumferences: null,
      sex: 'male',
    });
    const heavy = scanToParamVector({
      snapshot: snapshotFromScanResult(result({
        estimated_body_fat_min: 32,
        estimated_body_fat_max: 36,
      })),
      circumferences: null,
      sex: 'male',
    });
    const waistLean = lean.rings.find((r) => r.id === 'waist')?.circumferenceM;
    const waistHeavy = heavy.rings.find((r) => r.id === 'waist')?.circumferenceM;
    expect(waistLean).toBeTruthy();
    expect(waistHeavy).toBeTruthy();
    expect(waistLean!).toBeLessThan(waistHeavy!);
  });
});
