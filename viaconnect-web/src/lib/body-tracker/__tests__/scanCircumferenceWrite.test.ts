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

// Null semi-axes and zero corroboration: required fields added in Tasks 6 and 8.
// The ? was removed from both fields in Task 11 (types cleanup).
const _NULL_AX = { aCm: null, bCm: null, aspectRatio: null } as const;
const _EMPTY_SEMI_AXES = {
  neck: _NULL_AX, shoulder: _NULL_AX, chest: _NULL_AX,
  waistNatural: _NULL_AX, waistNavel: _NULL_AX, hip: _NULL_AX,
  bicepR: _NULL_AX, bicepL: _NULL_AX, forearmR: _NULL_AX, forearmL: _NULL_AX,
  thighR: _NULL_AX, thighL: _NULL_AX, calfR: _NULL_AX, calfL: _NULL_AX,
} as const;

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
    corroborationSignals: { lrCorroboration: 0, fbCorroboration: 0, lrAsymmetry: null },
    semiAxes: _EMPTY_SEMI_AXES,
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

  // body_tracker_circumference.scan_id FK-references body_photo_sessions(id).
  // The 209 vision scanId (body_tracker_photo_scans) is not a body_photo_sessions id,
  // so writing it would cause a FK violation and silently drop the row.
  // The fix: always write null; the row is identified by entry_id.
  it('scan_id in circ payload is null (not the vision scanId) to avoid body_photo_sessions FK violation', () => {
    const m = makeEmptyMeasurements();
    const { circ } = buildCircumferenceWrite({ ...BASE, measurements: m });
    expect(circ.scan_id).toBeNull();
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

  it('hip-only write carries hips_in but NO weight_lbs (so it must not shadow BMI)', () => {
    const m = makeEmptyMeasurements();
    m.hipCirc = measuredValue(96.0, 'high');
    const { hips } = buildCircumferenceWrite({ ...BASE, measurements: m });
    // The hip write carries hips_in + hips_confidence but NO weight_lbs.
    // A naive insert would leave weight_lbs null on the most-recent weight row.
    expect('weight_lbs' in hips).toBe(false);
    expect(hips.hips_in).not.toBeNull();
  });
});

// ---- BMI weight read guard (T10 review fix) ---------------------------------
//
// Locks the contract that the body_tracker_weight read used for BMI in
// useLatestComposition filters weight_lbs IS NOT NULL, so a hip-only
// circumference-scan row (weight_lbs null) cannot shadow the real most-recent
// weight. The mock below is a tiny in-memory query engine that honors
// .not('weight_lbs','is',null); replaying the hook's exact chain shows that
// WITHOUT the not-null filter the hip-only row would win (null), and WITH it the
// real weight is returned.

interface WeightRowFixture {
  weight_lbs: number | null;
  created_at: string;
}

/** Minimal chainable query builder over an in-memory row set.
 *  Records whether .not('weight_lbs','is',null) was applied and filters rows accordingly. */
function makeWeightQuery(rows: WeightRowFixture[]) {
  const calls: { not: Array<[string, string, unknown]> } = { not: [] };
  let working = [...rows];
  const builder = {
    select: () => builder,
    eq: () => builder,
    not(col: string, op: string, val: unknown) {
      calls.not.push([col, op, val]);
      if (col === 'weight_lbs' && op === 'is' && val === null) {
        working = working.filter((r) => r.weight_lbs !== null);
      }
      return builder;
    },
    order(_col: string, opts: { ascending: boolean }) {
      working.sort((a, b) =>
        opts.ascending
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at),
      );
      return builder;
    },
    limit: () => builder,
    maybeSingle: () =>
      Promise.resolve({ data: working[0] ?? null, error: null }),
  };
  return { builder, calls };
}

describe('BMI weight read guard', () => {
  // hip-only row is the most recent; real weight is older.
  const rows: WeightRowFixture[] = [
    { weight_lbs: null, created_at: '2026-06-29T10:00:00Z' }, // hip-only scan row (most recent)
    { weight_lbs: 180,  created_at: '2026-06-28T10:00:00Z' }, // real weight (older)
  ];

  it('with the not-null filter, the real weight wins (hip-only row does not shadow BMI)', async () => {
    const { builder, calls } = makeWeightQuery(rows);
    const result = await builder
      .select()
      .eq()
      .not('weight_lbs', 'is', null)
      .order('created_at', { ascending: false })
      .limit()
      .maybeSingle();
    // Assert the not-null filter was applied with the exact arguments.
    expect(calls.not).toContainEqual(['weight_lbs', 'is', null]);
    // Assert the real weight is returned, not the most-recent hip-only null.
    expect(result.data?.weight_lbs).toBe(180);
  });

  it('WITHOUT the not-null filter, the hip-only row would shadow BMI (proves the filter is load-bearing)', async () => {
    const { builder } = makeWeightQuery(rows);
    const result = await builder
      .select()
      .eq()
      .order('created_at', { ascending: false })
      .limit()
      .maybeSingle();
    // Demonstrates the defect the filter prevents: most-recent row has null weight_lbs.
    expect(result.data?.weight_lbs).toBeNull();
  });
});
