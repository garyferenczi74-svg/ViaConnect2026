// Tests for the cross-scan asymmetry trend decision (Prompt #169e Phase 1,
// section 3.2, item 3). The pure module detectSustainedAsymmetryTrends decides
// which paired measurements show a CLINICALLY NOTABLE, SUSTAINED imbalance:
//
//   a left/right delta that EXCEEDS 10 percent AND is SUSTAINED across 2 OR MORE
//   scans.
//
// Boundary cases locked here: exactly 10.0% does NOT trigger; a single
// over-threshold scan does NOT trigger; two sustained scans DO. Node-environment
// pure-logic test (project convention); no DOM/Supabase.

import { describe, it, expect } from 'vitest';
import {
  detectSustainedAsymmetryTrends,
  ASYMMETRY_TREND_THRESHOLD_PCT,
  ASYMMETRY_TREND_MIN_SCANS,
} from '@/lib/body-tracker/asymmetry-trend';
import type { AsymmetryCheck, AsymmetryReport } from '@/lib/arnold/scanning/types';

// One check with a given signed deltaPct. balanceRatioPct is set as the
// complement magnitude so the "measured" probe (balanceRatioPct > 0) is true for
// any non-zero gap, matching how the analyzer builds a real check.
function chk(name: string, deltaPct: number): AsymmetryCheck {
  const magnitude = Math.abs(deltaPct);
  return {
    name,
    leftValue: deltaPct >= 0 ? 38 : 40,
    rightValue: deltaPct >= 0 ? 40 : 38,
    unit: 'cm',
    balanceRatioPct: magnitude === 0 ? 100 : Math.round((100 - magnitude) * 10) / 10,
    deltaCm: 0, // not read by the trend module
    deltaPct,
    status: magnitude >= 15 ? 'significant_imbalance' : magnitude >= 10 ? 'moderate_imbalance' : 'minor_imbalance',
    recommendation: 'x',
  };
}

// An unmeasured check (the analyzer's zero guard): balanceRatioPct 0, deltaPct 0.
function unmeasured(name: string): AsymmetryCheck {
  return {
    name, leftValue: 0, rightValue: 0, unit: 'cm',
    balanceRatioPct: 0, deltaCm: 0, deltaPct: 0,
    status: 'balanced', recommendation: 'Not measured',
  };
}

function report(checks: AsymmetryCheck[]): AsymmetryReport {
  return {
    checks,
    overallScore: 90,
    flaggedAreas: [],
    recommendations: [],
  };
}

describe('detectSustainedAsymmetryTrends thresholds', () => {
  it('exposes the canonical threshold (10%) and min-scan (2) constants', () => {
    expect(ASYMMETRY_TREND_THRESHOLD_PCT).toBe(10);
    expect(ASYMMETRY_TREND_MIN_SCANS).toBe(2);
  });

  it('a single over-threshold scan does NOT trigger (sustained needs 2+)', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Bicep circumference', 14)]),
    ]);
    expect(trends).toHaveLength(0);
  });

  it('two scans over threshold for the SAME pair DOES trigger', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Bicep circumference', 16)]), // newest
      report([chk('Bicep circumference', 12)]),
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0].name).toBe('Bicep circumference');
    expect(trends[0].sustainedCount).toBe(2);
    expect(trends[0].observedCount).toBe(2);
    // maxDeltaPct is the largest magnitude across the sustained scans.
    expect(trends[0].maxDeltaPct).toBe(16);
    // latestDeltaPct comes from the NEWEST (first) over-threshold scan.
    expect(trends[0].latestDeltaPct).toBe(16);
    expect(trends[0].dominantSide).toBe('right');
  });
});

describe('detectSustainedAsymmetryTrends boundary at exactly 10 percent', () => {
  it('exactly 10.0% does NOT count (strictly greater than 10 required)', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Thigh circumference', 10)]),
      report([chk('Thigh circumference', 10)]),
    ]);
    expect(trends).toHaveLength(0);
  });

  it('just over 10% (10.1) across two scans DOES count', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Thigh circumference', 10.1)]),
      report([chk('Thigh circumference', 10.1)]),
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0].sustainedCount).toBe(2);
  });

  it('one scan at 10.0 (excluded) + one over does NOT reach the 2-scan minimum', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Calf circumference', 13)]),   // counts
      report([chk('Calf circumference', 10)]),   // exactly 10 -> excluded
    ]);
    expect(trends).toHaveLength(0);
  });
});

describe('detectSustainedAsymmetryTrends direction + mixed signs', () => {
  it('reports the LEFT side as dominant when the latest over-threshold gap is negative', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Forearm circumference', -13)]), // newest, left larger
      report([chk('Forearm circumference', -11)]),
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0].dominantSide).toBe('left');
    expect(trends[0].latestDeltaPct).toBe(-13);
    // magnitude, not sign, drives maxDeltaPct.
    expect(trends[0].maxDeltaPct).toBe(13);
  });

  it('counts magnitude regardless of which side leads in each scan', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Bicep circumference', 12)]),  // right larger
      report([chk('Bicep circumference', -14)]), // left larger, still > 10% magnitude
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0].sustainedCount).toBe(2);
  });
});

describe('detectSustainedAsymmetryTrends measured/observed accounting', () => {
  it('does NOT count unmeasured (zero-guard) scans toward sustained or observed', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Calf circumference', 16)]),
      report([unmeasured('Calf circumference')]), // measured=false
      report([chk('Calf circumference', 13)]),
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0].sustainedCount).toBe(2);
    // the unmeasured scan is not observed.
    expect(trends[0].observedCount).toBe(2);
  });

  it('tracks observedCount separately from sustainedCount (sub-threshold still observed)', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Thigh circumference', 18)]),
      report([chk('Thigh circumference', 4)]),  // measured but under threshold
      report([chk('Thigh circumference', 12)]),
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0].sustainedCount).toBe(2);
    expect(trends[0].observedCount).toBe(3);
  });

  it('handles multiple pairs independently and sorts most-sustained first', () => {
    const trends = detectSustainedAsymmetryTrends([
      report([chk('Bicep circumference', 13), chk('Calf circumference', 20)]),
      report([chk('Bicep circumference', 12), chk('Calf circumference', 21)]),
      report([chk('Calf circumference', 22)]), // calf sustained 3x, bicep 2x
    ]);
    expect(trends.map((t) => t.name)).toEqual([
      'Calf circumference',   // 3 sustained
      'Bicep circumference',  // 2 sustained
    ]);
    expect(trends[0].sustainedCount).toBe(3);
    expect(trends[1].sustainedCount).toBe(2);
  });
});

describe('detectSustainedAsymmetryTrends robustness', () => {
  it('ignores null/undefined reports and empty input', () => {
    expect(detectSustainedAsymmetryTrends([])).toEqual([]);
    expect(detectSustainedAsymmetryTrends([null, undefined])).toEqual([]);
    expect(detectSustainedAsymmetryTrends([null, report([chk('Bicep circumference', 30)])])).toEqual([]);
  });

  it('falls back to balanceRatioPct when an older report has no deltaPct field', () => {
    // Simulate a pre-#169e persisted check: deltaPct/deltaCm absent.
    const legacy = (name: string, balancePct: number): AsymmetryCheck => ({
      name, leftValue: 38, rightValue: 40, unit: 'cm',
      balanceRatioPct: balancePct,
      status: 'moderate_imbalance', recommendation: 'x',
    } as unknown as AsymmetryCheck);
    // 86% balanced -> 14% gap magnitude, over threshold.
    const trends = detectSustainedAsymmetryTrends([
      report([legacy('Bicep circumference', 86)]),
      report([legacy('Bicep circumference', 88)]), // 12% gap
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0].sustainedCount).toBe(2);
    expect(trends[0].maxDeltaPct).toBeCloseTo(14, 1);
  });
});
