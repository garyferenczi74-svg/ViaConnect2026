// Prompt 211a W4-1 - Tests for fingerprint.ts (condition fingerprint pure logic).
// TDD: written RED first, then implementation made them GREEN.
//
// scoreConditionFingerprint flags a scan whose capture conditions differ sharply
// from the user's own norm BEFORE any trend is drawn, with a kind honest reason.
// buildConsistencyTip surfaces the user's OWN best conditions from THEIR history,
// never a generic template, and returns null / UNKNOWN honestly when history is
// too thin. Neither ever fabricates.

import { describe, it, expect } from 'vitest';
import {
  scoreConditionFingerprint,
  buildConsistencyTip,
  MIN_HISTORY_FOR_FINGERPRINT,
  MIN_HISTORY_FOR_TIP,
  type ScanConditionFingerprint,
} from '../fingerprint';

// A dash-free assertion helper: Hannah-tone copy must contain zero em/en dashes.
const NO_DASHES = /^[^–—]*$/;

function fp(overrides: Partial<ScanConditionFingerprint> = {}): ScanConditionFingerprint {
  return {
    timeOfDay: 'morning',
    lightingGrade: 'natural',
    poseQuality: 0.9,
    scanQualityScore: 0.9,
    ...overrides,
  };
}

// A consistent morning-by-the-window history: the user's clear norm.
const MORNING_NORM: ScanConditionFingerprint[] = [
  fp({ scanQualityScore: 0.92, poseQuality: 0.9 }),
  fp({ scanQualityScore: 0.9, poseQuality: 0.88 }),
  fp({ scanQualityScore: 0.94, poseQuality: 0.91 }),
  fp({ scanQualityScore: 0.89, poseQuality: 0.87 }),
];

describe('scoreConditionFingerprint', () => {
  it('returns a high consistency score and no outlier flag for a scan matching the user norm', () => {
    const result = scoreConditionFingerprint(fp(), MORNING_NORM);
    expect(result.isOutlier).toBe(false);
    expect(result.consistencyScore).toBeGreaterThan(0.7);
    expect(result.consistencyScore).toBeLessThanOrEqual(1);
    expect(result.reason).toMatch(NO_DASHES);
  });

  it('flags an outlier when conditions differ sharply from the norm (evening, dim, low quality)', () => {
    const oddball = fp({
      timeOfDay: 'evening',
      lightingGrade: 'indoor_dim',
      poseQuality: 0.4,
      scanQualityScore: 0.45,
    });
    const result = scoreConditionFingerprint(oddball, MORNING_NORM);
    expect(result.isOutlier).toBe(true);
    expect(result.consistencyScore).toBeLessThan(0.5);
    // Kind, honest reason that references what differed.
    expect(result.reason.length).toBeGreaterThan(0);
    expect(result.reason).toMatch(NO_DASHES);
  });

  it('reports an honest UNKNOWN reason and does not flag an outlier when history is too thin', () => {
    const thin = MORNING_NORM.slice(0, MIN_HISTORY_FOR_FINGERPRINT - 1);
    const result = scoreConditionFingerprint(fp(), thin);
    // Not enough history to judge, so it must NOT fabricate an outlier verdict.
    expect(result.isOutlier).toBe(false);
    expect(result.consistencyScore).toBeNull();
    expect(result.reason).toContain('UNKNOWN');
    expect(result.reason).toMatch(NO_DASHES);
  });

  it('never returns a fabricated 0 score for thin history (null, not 0)', () => {
    const result = scoreConditionFingerprint(fp(), []);
    expect(result.consistencyScore).not.toBe(0);
    expect(result.consistencyScore).toBeNull();
  });

  it('exposes the minimum history constant', () => {
    expect(MIN_HISTORY_FOR_FINGERPRINT).toBeGreaterThan(1);
  });
});

describe('buildConsistencyTip', () => {
  it('names the user OWN best conditions from their real history', () => {
    const tip = buildConsistencyTip(MORNING_NORM);
    expect(tip).not.toBeNull();
    // The tip must reflect THIS user's dominant conditions (morning + natural light).
    expect(tip).toContain('morning');
    expect(tip?.toLowerCase()).toContain('window');
    expect(tip).toMatch(NO_DASHES);
  });

  it('derives the best time bucket from the highest quality scans, not a generic default', () => {
    // Same-count buckets, but the afternoon scans are clearly the sharpest.
    const mixed: ScanConditionFingerprint[] = [
      fp({ timeOfDay: 'morning', lightingGrade: 'indoor_dim', scanQualityScore: 0.5, poseQuality: 0.5 }),
      fp({ timeOfDay: 'morning', lightingGrade: 'indoor_dim', scanQualityScore: 0.52, poseQuality: 0.5 }),
      fp({ timeOfDay: 'afternoon', lightingGrade: 'natural', scanQualityScore: 0.95, poseQuality: 0.93 }),
      fp({ timeOfDay: 'afternoon', lightingGrade: 'natural', scanQualityScore: 0.93, poseQuality: 0.92 }),
    ];
    const tip = buildConsistencyTip(mixed);
    expect(tip).not.toBeNull();
    expect(tip).toContain('afternoon');
    expect(tip).toMatch(NO_DASHES);
  });

  it('returns null honestly when history is too thin to know a best condition', () => {
    const thin = MORNING_NORM.slice(0, MIN_HISTORY_FOR_TIP - 1);
    expect(buildConsistencyTip(thin)).toBeNull();
    expect(buildConsistencyTip([])).toBeNull();
  });

  it('exposes the minimum history constant for the tip', () => {
    expect(MIN_HISTORY_FOR_TIP).toBeGreaterThan(1);
  });

  it('produces dash-free Hannah-toned copy', () => {
    const tip = buildConsistencyTip(MORNING_NORM);
    expect(tip).toMatch(NO_DASHES);
    // Warm and personal, addressed to the user.
    expect(tip?.toLowerCase()).toContain('your');
  });
});
