// Tests for the SIGNED left/right delta computation added to analyzeAsymmetry in
// Prompt #169e Phase 1 (section 3.2, item 1). These enhance the existing
// asymmetry analysis (balanceRatioPct / status / recommendation are unchanged);
// here we lock down the new deltaCm + deltaPct fields and the not-measured guard.
//
// SIGN CONVENTION UNDER TEST: positive = RIGHT side larger (deltaCm = right - left),
// negative = LEFT side larger. deltaPct is that signed cm gap as a percent of the
// LARGER side. Node-environment pure-logic test (project convention); no DOM/Supabase.

import { describe, it, expect } from 'vitest';
import { analyzeAsymmetry } from '@/lib/arnold/scanning/asymmetryAnalyzer';
import type { ExtractedMeasurements, MeasuredValue } from '@/lib/arnold/scanning/types';

// Build an ExtractedMeasurements where every L/R pair is set explicitly and all
// the non-paired fields are inert. analyzeAsymmetry only reads the 4 paired
// circumferences, so the rest can be zeroed.
function mv(cm: number): MeasuredValue {
  return { cm, uncertaintyCm: 0, confidence: 'moderate', source: 'test' };
}

function measurements(pairs: {
  bicep?: [number, number];   // [left, right]
  forearm?: [number, number];
  thigh?: [number, number];
  calf?: [number, number];
}): ExtractedMeasurements {
  const [lb, rb] = pairs.bicep   ?? [0, 0];
  const [lf, rf] = pairs.forearm ?? [0, 0];
  const [lt, rt] = pairs.thigh   ?? [0, 0];
  const [lc, rc] = pairs.calf    ?? [0, 0];
  return {
    neckCirc: mv(0), shoulderCirc: mv(0), chestCirc: mv(0),
    waistNaturalCirc: mv(0), waistNavelCirc: mv(0), hipCirc: mv(0),
    leftBicepCirc: mv(lb), rightBicepCirc: mv(rb),
    leftForearmCirc: mv(lf), rightForearmCirc: mv(rf),
    leftThighCirc: mv(lt), rightThighCirc: mv(rt),
    leftCalfCirc: mv(lc), rightCalfCirc: mv(rc),
    waistToHipRatio: 0, waistToHeightRatio: 0, shoulderToWaistRatio: 0,
    inseamCm: 0, torsoLengthCm: 0,
  };
}

function check(report: ReturnType<typeof analyzeAsymmetry>, name: string) {
  const c = report.checks.find((x) => x.name === name);
  if (!c) throw new Error(`missing check ${name}`);
  return c;
}

describe('analyzeAsymmetry signed deltas (deltaCm, deltaPct)', () => {
  it('positive deltaCm/deltaPct when the RIGHT side is larger', () => {
    // Right bicep 40, left 38 -> +2.0 cm, gap as % of larger (40) = 5.0%.
    const r = analyzeAsymmetry(measurements({ bicep: [38, 40] }));
    const c = check(r, 'Bicep circumference');
    expect(c.deltaCm).toBe(2);
    expect(c.deltaPct).toBe(5);
    expect(c.leftValue).toBe(38);
    expect(c.rightValue).toBe(40);
  });

  it('negative deltaCm/deltaPct when the LEFT side is larger', () => {
    // Left thigh 60, right 57 -> right - left = -3.0 cm, -3/60 = -5.0%.
    const r = analyzeAsymmetry(measurements({ thigh: [60, 57] }));
    const c = check(r, 'Thigh circumference');
    expect(c.deltaCm).toBe(-3);
    expect(c.deltaPct).toBe(-5);
  });

  it('zero deltas for a perfectly even pair', () => {
    const r = analyzeAsymmetry(measurements({ calf: [38, 38] }));
    const c = check(r, 'Calf circumference');
    expect(c.deltaCm).toBe(0);
    expect(c.deltaPct).toBe(0);
    expect(c.balanceRatioPct).toBe(100);
  });

  it('|deltaPct| is the complement of balanceRatioPct (same gap, opposite framing)', () => {
    // 36 vs 30: smaller/larger = 30/36 = 83.3% balanced; gap 6/36 = 16.7%.
    const r = analyzeAsymmetry(measurements({ forearm: [30, 36] }));
    const c = check(r, 'Forearm circumference');
    expect(c.balanceRatioPct).toBeCloseTo(83.3, 1);
    expect(Math.abs(c.deltaPct)).toBeCloseTo(100 - c.balanceRatioPct, 1);
    expect(c.deltaCm).toBe(6); // right larger
  });

  it('deltas are rounded to one decimal place', () => {
    // 30.00 vs 30.25 -> +0.25 cm rounds to 0.3; 0.25/30.25 = 0.826% -> 0.8%.
    const r = analyzeAsymmetry(measurements({ bicep: [30, 30.25] }));
    const c = check(r, 'Bicep circumference');
    expect(c.deltaCm).toBe(0.3);
    expect(c.deltaPct).toBe(0.8);
  });
});

describe('analyzeAsymmetry not-measured / zero guard yields zero deltas', () => {
  it('an unmeasured pair (0 cm) reports deltaCm/deltaPct = 0 and Not measured', () => {
    const r = analyzeAsymmetry(measurements({})); // all pairs zeroed
    for (const name of [
      'Bicep circumference', 'Forearm circumference', 'Thigh circumference', 'Calf circumference',
    ]) {
      const c = check(r, name);
      expect(c.deltaCm).toBe(0);
      expect(c.deltaPct).toBe(0);
      expect(c.balanceRatioPct).toBe(0);
      expect(c.recommendation).toBe('Not measured');
    }
  });

  it('a partially measured pair (one side 0) is treated as not measured (no signed delta)', () => {
    // right calf present, left calf 0 -> guard fires, no misleading +cm delta.
    const r = analyzeAsymmetry(measurements({ calf: [0, 38] }));
    const c = check(r, 'Calf circumference');
    expect(c.deltaCm).toBe(0);
    expect(c.deltaPct).toBe(0);
    expect(c.balanceRatioPct).toBe(0);
  });

  it('a negative/garbage value is treated as not measured', () => {
    const r = analyzeAsymmetry(measurements({ thigh: [-5, 50] }));
    const c = check(r, 'Thigh circumference');
    expect(c.deltaCm).toBe(0);
    expect(c.deltaPct).toBe(0);
  });
});
