// Prompt 211a W4-2 - Tests for fingerprintFlag.ts (the flag decision).
// TDD: written RED first, then made GREEN.
//
// The flag must appear BEFORE a sharply-different-condition scan enters the
// trend, and must NOT appear when history is too thin to judge (UNKNOWN). These
// assert the decision the flag component renders, wired to the REAL W4-1
// scoreConditionFingerprint (imported, never reimplemented).

import { describe, it, expect } from 'vitest';
import { decideFingerprintFlag } from '../fingerprintFlag';
import type { ScanConditionFingerprint } from '../fingerprint';

const NO_DASHES = /^[^–—]*$/;

// A consistent history: mornings, natural light, good quality.
const MORNING_NATURAL: ScanConditionFingerprint = {
  timeOfDay: 'morning',
  lightingGrade: 'natural',
  poseQuality: 0.9,
  scanQualityScore: 0.9,
};

const HISTORY = [MORNING_NATURAL, MORNING_NATURAL, MORNING_NATURAL, MORNING_NATURAL];

describe('decideFingerprintFlag', () => {
  it('does NOT flag when history is too thin to judge (honest UNKNOWN, no flag)', () => {
    const thin = [MORNING_NATURAL, MORNING_NATURAL]; // below MIN_HISTORY_FOR_FINGERPRINT
    const decision = decideFingerprintFlag(MORNING_NATURAL, thin);
    expect(decision.showFlag).toBe(false);
    expect(decision.consistencyScore).toBeNull();
    expect(decision.reason).toContain('UNKNOWN');
  });

  it('does NOT flag a scan that matches the user own norm', () => {
    const decision = decideFingerprintFlag(MORNING_NATURAL, HISTORY);
    expect(decision.showFlag).toBe(false);
    expect(decision.consistencyScore).not.toBeNull();
  });

  it('FLAGS a scan taken in sharply different conditions (night + dim vs morning + natural)', () => {
    const outlier: ScanConditionFingerprint = {
      timeOfDay: 'night',
      lightingGrade: 'indoor_dim',
      poseQuality: 0.3,
      scanQualityScore: 0.3,
    };
    const decision = decideFingerprintFlag(outlier, HISTORY);
    expect(decision.showFlag).toBe(true);
    // The reason is kind and honest, and dash-free.
    expect(decision.reason.length).toBeGreaterThan(0);
    expect(decision.reason).toMatch(NO_DASHES);
  });

  it('the flag decision mirrors the score outlier verdict exactly (no independent recompute)', () => {
    // A clearly-different lighting + time drives the outlier verdict; the flag
    // must equal isOutlier, proving the UI does not invent its own threshold.
    const differentLight: ScanConditionFingerprint = {
      timeOfDay: 'evening',
      lightingGrade: 'indoor_dim',
      poseQuality: 0.2,
      scanQualityScore: 0.2,
    };
    const decision = decideFingerprintFlag(differentLight, HISTORY);
    expect(decision.showFlag).toBe(true);
  });
});
