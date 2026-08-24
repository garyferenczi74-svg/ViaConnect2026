// Task 7 (Prompt 210c) - TDD tests for versioned calibration config.
// Section 8.3 / 17.5: extract per-region shape-correction factors from
// circumferencePredictor.ts into a single versioned source of truth.
//
// RED phase: run before calibrationConfig.ts exists -> import fails.
// GREEN phase: run after calibrationConfig.ts + circumferencePredictor.ts changes.

import { describe, it, expect } from 'vitest';
import {
  CALIBRATION_VERSION,
  CORRECTION_FACTORS,
  getCorrectionFactor,
} from '../calibrationConfig';
import {
  predictCircumference,
  ramanujanEllipsePerimeter,
} from '../../circumferencePredictor';
import type { Region } from '../../circumferencePredictor';

// ---------------------------------------------------------------------------
// Pinned pre-refactor baseline factors (source of truth for behavior proof).
// These values MUST match what was inlined in circumferencePredictor.ts before
// the refactor. If calibrationConfig.ts drifts from these, the no-behavior-change
// tests below will catch the regression.
// ---------------------------------------------------------------------------
const BASELINE_FACTORS: Record<Region, { male: number; female: number }> = {
  neck:          { male: 1.02, female: 1.02 },
  shoulder:      { male: 0.95, female: 0.96 },
  chest:         { male: 1.00, female: 1.04 },
  under_bust:    { male: 1.00, female: 1.00 },
  waist_natural: { male: 1.01, female: 1.02 },
  waist_navel:   { male: 1.02, female: 1.02 },
  hip:           { male: 1.03, female: 1.05 },
  bicep:         { male: 0.98, female: 0.98 },
  forearm:       { male: 0.97, female: 0.97 },
  thigh:         { male: 1.02, female: 1.03 },
  calf:          { male: 0.99, female: 0.99 },
};

// Replicate the round1 helper used inside circumferencePredictor.ts.
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Compute the expected circumference value using the pinned baseline factor
// and the same Ramanujan math function exported from circumferencePredictor.
function expectedCircumference(
  frontWidthCm: number,
  depthCm: number,
  region: Region,
  sex: 'male' | 'female',
): number {
  const raw = ramanujanEllipsePerimeter(frontWidthCm / 2, depthCm / 2);
  return round1(raw * BASELINE_FACTORS[region][sex]);
}

// ---------------------------------------------------------------------------
// 1. Config structure: single source of truth
// ---------------------------------------------------------------------------

describe('calibrationConfig - single source of truth', () => {
  it('CALIBRATION_VERSION is a non-empty string', () => {
    expect(typeof CALIBRATION_VERSION).toBe('string');
    expect(CALIBRATION_VERSION.length).toBeGreaterThan(0);
  });

  it('CALIBRATION_VERSION marks the pre-fit baseline', () => {
    expect(CALIBRATION_VERSION).toContain('uncalibrated');
  });

  it('CORRECTION_FACTORS is frozen (immutable at top level)', () => {
    expect(Object.isFrozen(CORRECTION_FACTORS)).toBe(true);
  });

  it('CORRECTION_FACTORS has an entry for every Region', () => {
    const regions: Region[] = [
      'neck', 'shoulder', 'chest', 'under_bust',
      'waist_natural', 'waist_navel', 'hip',
      'bicep', 'forearm', 'thigh', 'calf',
    ];
    for (const region of regions) {
      expect(CORRECTION_FACTORS[region]).toBeDefined();
    }
  });

  it('every entry has fittedMape null in the pre-fit baseline', () => {
    for (const region of Object.keys(CORRECTION_FACTORS) as Region[]) {
      expect(CORRECTION_FACTORS[region].fittedMape).toBeNull();
    }
  });

  it('getCorrectionFactor returns the same factors as BASELINE_FACTORS for all regions', () => {
    for (const region of Object.keys(BASELINE_FACTORS) as Region[]) {
      expect(getCorrectionFactor(region, 'male').factor).toBe(BASELINE_FACTORS[region].male);
      expect(getCorrectionFactor(region, 'female').factor).toBe(BASELINE_FACTORS[region].female);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. getCorrectionFactor accessor
// ---------------------------------------------------------------------------

describe('getCorrectionFactor - returns correct factor, fittedMape, and version', () => {
  it('neck male returns factor 1.02 with null fittedMape and correct version', () => {
    const result = getCorrectionFactor('neck', 'male');
    expect(result.factor).toBe(1.02);
    expect(result.fittedMape).toBeNull();
    expect(result.version).toBe(CALIBRATION_VERSION);
  });

  it('hip female returns factor 1.05 (hip cross-section not truly elliptical)', () => {
    const result = getCorrectionFactor('hip', 'female');
    expect(result.factor).toBe(1.05);
    expect(result.version).toBe(CALIBRATION_VERSION);
  });

  it('shoulder male returns factor 0.95 (contracts: shoulder is flatter than ellipse)', () => {
    expect(getCorrectionFactor('shoulder', 'male').factor).toBe(0.95);
  });

  it('shoulder female returns factor 0.96', () => {
    expect(getCorrectionFactor('shoulder', 'female').factor).toBe(0.96);
  });

  it('forearm both sexes return factor 0.97', () => {
    expect(getCorrectionFactor('forearm', 'male').factor).toBe(0.97);
    expect(getCorrectionFactor('forearm', 'female').factor).toBe(0.97);
  });

  it('version string is returned for every region', () => {
    const regions: Region[] = ['neck', 'waist_natural', 'hip', 'thigh', 'calf'];
    for (const region of regions) {
      expect(getCorrectionFactor(region, 'male').version).toBe(CALIBRATION_VERSION);
      expect(getCorrectionFactor(region, 'female').version).toBe(CALIBRATION_VERSION);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. No-behavior-change proof: predictCircumference output is identical after
//    moving the inline factors to calibrationConfig.ts.
// ---------------------------------------------------------------------------

describe('predictCircumference - no behavior change after refactor', () => {
  it('waist_natural male (front+side) matches pre-refactor baseline', () => {
    const input = {
      frontWidthCm: 80,
      sideDepthCm: 64,
      region: 'waist_natural' as const,
      sex: 'male' as const,
    };
    const expected = expectedCircumference(80, 64, 'waist_natural', 'male');
    const result = predictCircumference(input);
    expect(result.circumferenceCm).toBe(expected);
    expect(result.method).toBe('ellipse_frontSide');
    expect(result.confidence).toBe('moderate');
  });

  it('hip female (front+side) matches pre-refactor baseline', () => {
    const input = {
      frontWidthCm: 96,
      sideDepthCm: 80,
      region: 'hip' as const,
      sex: 'female' as const,
    };
    const expected = expectedCircumference(96, 80, 'hip', 'female');
    const result = predictCircumference(input);
    expect(result.circumferenceCm).toBe(expected);
    expect(result.method).toBe('ellipse_frontSide');
  });

  it('neck male (front+side) matches pre-refactor baseline', () => {
    const input = {
      frontWidthCm: 32,
      sideDepthCm: 30,
      region: 'neck' as const,
      sex: 'male' as const,
    };
    const expected = expectedCircumference(32, 30, 'neck', 'male');
    const result = predictCircumference(input);
    expect(result.circumferenceCm).toBe(expected);
  });

  it('shoulder female (front+side) matches pre-refactor baseline', () => {
    const input = {
      frontWidthCm: 40,
      sideDepthCm: 18,
      region: 'shoulder' as const,
      sex: 'female' as const,
    };
    const expected = expectedCircumference(40, 18, 'shoulder', 'female');
    const result = predictCircumference(input);
    expect(result.circumferenceCm).toBe(expected);
  });

  it('thigh male (front+side) matches pre-refactor baseline', () => {
    const input = {
      frontWidthCm: 56,
      sideDepthCm: 46,
      region: 'thigh' as const,
      sex: 'male' as const,
    };
    const expected = expectedCircumference(56, 46, 'thigh', 'male');
    const result = predictCircumference(input);
    expect(result.circumferenceCm).toBe(expected);
  });

  it('waist_natural male (front only, no side) uses depth guess and matches baseline', () => {
    // waist_natural depth guess ratio = 0.80, so depth = 80*0.80 = 64
    const frontWidthCm = 80;
    const depthGuess = frontWidthCm * 0.80;
    const expected = expectedCircumference(frontWidthCm, depthGuess, 'waist_natural', 'male');
    const input = {
      frontWidthCm,
      region: 'waist_natural' as const,
      sex: 'male' as const,
    };
    const result = predictCircumference(input);
    expect(result.circumferenceCm).toBe(expected);
    expect(result.method).toBe('ellipse_frontOnly');
    expect(result.confidence).toBe('low');
  });
});
