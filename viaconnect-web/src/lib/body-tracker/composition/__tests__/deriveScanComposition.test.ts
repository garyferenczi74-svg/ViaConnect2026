import { describe, it, expect } from 'vitest';
import { deriveScanComposition } from '../deriveScanComposition';

const base = { body_type: 'meso', fat_distribution: 'balanced', estimated_whr_min: 0.8, estimated_whr_max: 0.9, muscle_development: {}, ai_confidence: 'medium' as const };

describe('deriveScanComposition', () => {
  it('keeps the range and stores midpoint only as metadata', () => {
    const r = deriveScanComposition({ ...base, estimated_body_fat_min: 18, estimated_body_fat_max: 22 });
    expect(r.estimatedBodyFatMin).toBe(18);
    expect(r.estimatedBodyFatMax).toBe(22);
    expect(r.totalBodyFatPct).toBe(20);
  });
  it('returns null (UNKNOWN) not 0 when the range is unusable', () => {
    const r = deriveScanComposition({ ...base, estimated_body_fat_min: NaN as unknown as number, estimated_body_fat_max: 22 });
    expect(r.totalBodyFatPct).toBeNull();
  });
  it('maps ai_confidence to a 0..1 number', () => {
    expect(deriveScanComposition({ ...base, estimated_body_fat_min: 10, estimated_body_fat_max: 12, ai_confidence: 'high' }).confidence).toBeCloseTo(0.85);
    expect(deriveScanComposition({ ...base, estimated_body_fat_min: 10, estimated_body_fat_max: 12, ai_confidence: 'low' }).confidence).toBeCloseTo(0.4);
  });
});
