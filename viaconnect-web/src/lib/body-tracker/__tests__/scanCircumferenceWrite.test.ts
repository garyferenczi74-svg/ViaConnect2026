// Task 10 (Prompt 210c): TDD for the per-field confidence write mapping.
// Tests the pure functions in buildScanWrite:
//   - confidenceToNumeric: ConfidenceLevel | null | undefined -> number | null
//   - buildCircumferenceWrite: ExtractedMeasurements -> { circ, hips } DB row shapes
//
// RULE 9: UNKNOWN (cm null) -> NULL in every DB column + null confidence. Never 0.

import { describe, it, expect } from 'vitest';
import { confidenceToNumeric, buildCircumferenceWrite } from '../composition/buildScanWrite';
import { CALIBRATION_VERSION } from '@/lib/arnold/scanning/accuracy/calibrationConfig';
import type { ExtractedMeasurements, MeasuredValue, ConfidenceLevel } from '@/lib/arnold/scanning/types';

// ---- fixtures ---------------------------------------------------------------

function measuredValue(cm: number | null, confidence: ConfidenceLevel = 'high'): MeasuredValue {
  return { cm, uncertaintyCm: 1, confidence, source: cm === null ? 'missing' : 'ellipse_frontSide' };
}

const UNKNOWN = measuredValue(null, 'low');

function makeEmptyMeasurements(): ExtractedMeasurements {
  return {
    neckCirc:         UNKNOWN,
    shoulderCirc:     UNKNOWN,
    chestCirc:        UNKNOWN,
    waistNaturalCirc: UNKNOWN,
    waistNavelCirc:   UNKNOWN,
    hipCirc:          UNKNOWN,
    rightBicepCirc:   UNKNOWN,
    leftBicepCirc:    UNKNOWN,
    rightForearmCirc: UNKNOWN,
    leftForearmCirc:  UNKNOWN,
    rightThighCirc:   UNKNOWN,
    leftThighCirc:    UNKNOWN,
    rightCalfCirc:    UNKNOWN,
    leftCalfCirc:     UNKNOWN,
    waistToHipRatio:      0,
    waistToHeightRatio:   0,
    shoulderToWaistRatio: 0,
    inseamCm:             0,
    torsoLengthCm:        0,
  };
}

// ---- confidenceToNumeric ----------------------------------------------------

describe('confidenceToNumeric', () => {
  it('high -> 0.85', () => {
    expect(confidenceToNumeric('high')).toBe(0.85);
  });

  it('moderate -> 0.60', () => {
    expect(confidenceToNumeric('moderate')).toBe(0.60);
  });

  it('low -> 0.35', () => {
    expect(confidenceToNumeric('low')).toBe(0.35);
  });

  it('null -> null', () => {
    expect(confidenceToNumeric(null)).toBeNull();
  });

  it('undefined -> null', () => {
    expect(confidenceToNumeric(undefined)).toBeNull();
  });
});

// ---- buildCircumferenceWrite ------------------------------------------------

describe('buildCircumferenceWrite', () => {
  const BASE = { userId: 'user-1', entryId: 'entry-1', scanId: 'scan-1' };

  // ----- UNKNOWN preservation (RULE 9) -----

  it('UNKNOWN neck (cm null) -> null neck column and null neck_confidence', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.neck).toBeNull();
    expect(circ.neck_confidence).toBeNull();
  });

  it('UNKNOWN chest -> null chest + null chest_confidence (not 0)', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.chest).not.toBe(0);
    expect(circ.chest).toBeNull();
    expect(circ.chest_confidence).toBeNull();
  });

  it('UNKNOWN hip -> null hips_in and null hips_confidence', () => {
    const m = makeEmptyMeasurements();
    const { hips } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(hips.hips_in).toBeNull();
    expect(hips.hips_confidence).toBeNull();
  });

  // ----- Present measurements -----

  it('present neck (high) -> correct value + 0.85 confidence', () => {
    const m = makeEmptyMeasurements();
    m.neckCirc = measuredValue(38.5, 'high');
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.neck).toBe(38.5);
    expect(circ.neck_confidence).toBe(0.85);
  });

  it('present chest (moderate) -> correct value + 0.60 confidence', () => {
    const m = makeEmptyMeasurements();
    m.chestCirc = measuredValue(100.0, 'moderate');
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.chest).toBe(100.0);
    expect(circ.chest_confidence).toBe(0.60);
  });

  it('present waist (low) -> correct value + 0.35 confidence', () => {
    const m = makeEmptyMeasurements();
    m.waistNaturalCirc = measuredValue(82.4, 'low');
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.waist).toBe(82.4);
    expect(circ.waist_confidence).toBe(0.35);
  });

  it('present hip -> converts cm to inches (round 1dp) + confidence', () => {
    const m = makeEmptyMeasurements();
    // 101.6 cm = exactly 40 inches
    m.hipCirc = measuredValue(101.6, 'high');
    const { hips } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(hips.hips_in).toBeCloseTo(40.0, 1);
    expect(hips.hips_confidence).toBe(0.85);
  });

  it('present hip (moderate) -> 0.60 confidence', () => {
    const m = makeEmptyMeasurements();
    m.hipCirc = measuredValue(96.0, 'moderate');
    const { hips } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(hips.hips_confidence).toBe(0.60);
  });

  it('shoulder_width and shoulder_width_confidence written', () => {
    const m = makeEmptyMeasurements();
    m.shoulderCirc = measuredValue(112.0, 'high');
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.shoulder_width).toBe(112.0);
    expect(circ.shoulder_width_confidence).toBe(0.85);
  });

  it('bilateral limbs: right_upper_arm (rightBicep) + confidence', () => {
    const m = makeEmptyMeasurements();
    m.rightBicepCirc = measuredValue(33.0, 'moderate');
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.right_upper_arm).toBe(33.0);
    expect(circ.right_upper_arm_confidence).toBe(0.60);
  });

  it('calibration version is written to the row', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.scan_calibration_version).toBe(CALIBRATION_VERSION);
    expect(typeof circ.scan_calibration_version).toBe('string');
  });

  it('user_id and entry_id are passed through to the circ row', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.user_id).toBe('user-1');
    expect(circ.entry_id).toBe('entry-1');
  });

  it('scan_id is passed through to the circ row', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.scan_id).toBe('scan-1');
  });

  it('entry_unit is cm', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.entry_unit).toBe('cm');
  });

  it('source is scan', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.source).toBe('scan');
  });

  it('scanId optional - circ.scan_id is null when omitted', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ userId: 'u', entryId: 'e', measurements: m });
    expect(circ.scan_id).toBeNull();
  });

  it('all 12 circ columns present (null or numeric)', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    const expectedCols = [
      'neck', 'shoulder_width', 'chest', 'waist',
      'right_upper_arm', 'left_upper_arm',
      'right_forearm', 'left_forearm',
      'right_upper_thigh', 'left_upper_thigh',
      'right_calf', 'left_calf',
    ];
    for (const col of expectedCols) {
      expect(col in circ).toBe(true);
    }
  });

  it('all 12 confidence columns present (null for UNKNOWN)', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    const confCols = [
      'neck_confidence', 'shoulder_width_confidence', 'chest_confidence', 'waist_confidence',
      'right_upper_arm_confidence', 'left_upper_arm_confidence',
      'right_forearm_confidence', 'left_forearm_confidence',
      'right_upper_thigh_confidence', 'left_upper_thigh_confidence',
      'right_calf_confidence', 'left_calf_confidence',
    ];
    for (const col of confCols) {
      expect(col in circ).toBe(true);
      // All UNKNOWN -> null (never 0)
      expect(circ[col]).toBeNull();
      expect(circ[col]).not.toBe(0);
    }
  });
});
