// Task 13a (Prompt 210c) - Tests for captureQuality.ts
// TDD: tests written RED first, then implementation made them GREEN.

import { describe, it, expect } from 'vitest';
import {
  assessCaptureQuality,
  type CaptureQualityInput,
  TILT_WARN_DEG,
  TILT_BLOCK_DEG,
  CONTRAST_WARN_MIN,
  CONTRAST_BLOCK_MIN,
  MIN_LANDMARK_VISIBILITY,
} from '../captureQuality';

// ---- Shared baseline fixtures ----

const ALL_LANDMARKS_VISIBLE = {
  noseVisible: true,
  leftShoulderVisible: true,
  rightShoulderVisible: true,
  leftHipVisible: true,
  rightHipVisible: true,
  leftAnkleVisible: true,
  rightAnkleVisible: true,
  averageVisibility: 0.95,
};

/** Ideal front capture: person detected, full body in frame, correct orientation,
 *  near-zero tilt, excellent contrast. */
const CLEAN_FRONT: CaptureQualityInput = {
  requestedPose: 'front',
  detectedPose: 'front',
  personDetected: true,
  landmarks: ALL_LANDMARKS_VISIBLE,
  tiltDeg: 1.5,
  contrastScore: 0.85,
};

// ---- Test suite ----

describe('assessCaptureQuality', () => {
  // ------------------------------------------------------------------
  // Test 1: clean capture passes with score near 1 and no issues
  // ------------------------------------------------------------------
  it('passes a clean front capture with score near 1 and no issues', () => {
    const result = assessCaptureQuality(CLEAN_FRONT);

    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
    // Score should be close to 1; only minor tilt (1.5 deg) which is below TILT_WARN_DEG
    expect(result.score).toBeGreaterThan(0.85);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('passes a clean back capture with score near 1', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      requestedPose: 'back',
      detectedPose: 'back',
    });
    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThan(0.85);
  });

  // ------------------------------------------------------------------
  // Test 2: no person detected -> BLOCKING
  // ------------------------------------------------------------------
  it('blocks and returns low score when no person is detected', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      personDetected: false,
      detectedPose: null,
    });

    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.includes('no person detected'))).toBe(true);
    expect(result.score).toBeLessThan(0.3);
  });

  it('does not check landmark framing when no person is detected', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      personDetected: false,
      detectedPose: null,
      landmarks: {
        ...ALL_LANDMARKS_VISIBLE,
        leftAnkleVisible: false,
        rightAnkleVisible: false,
      },
    });

    // Only "no person detected" should appear; landmark check is skipped
    expect(result.issues.filter(i => i.includes('no person')).length).toBe(1);
    expect(result.issues.some(i => i.includes('full body not in frame'))).toBe(false);
  });

  // ------------------------------------------------------------------
  // Test 3: missing ankles -> full body not in frame -> BLOCKING
  // ------------------------------------------------------------------
  it('blocks when both ankles are not visible (feet outside frame)', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      landmarks: {
        ...ALL_LANDMARKS_VISIBLE,
        leftAnkleVisible: false,
        rightAnkleVisible: false,
      },
    });

    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.includes('full body not in frame'))).toBe(true);
    expect(result.issues.some(i => i.includes('ankles'))).toBe(true);
  });

  it('blocks when nose (head) is not visible', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      landmarks: { ...ALL_LANDMARKS_VISIBLE, noseVisible: false },
    });

    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.includes('head'))).toBe(true);
  });

  it('blocks when one shoulder is missing', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      landmarks: { ...ALL_LANDMARKS_VISIBLE, leftShoulderVisible: false },
    });

    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.includes('shoulders'))).toBe(true);
  });

  it('names all missing parts in the issue string when multiple anchors are absent', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      landmarks: {
        ...ALL_LANDMARKS_VISIBLE,
        noseVisible: false,
        leftAnkleVisible: false,
        rightAnkleVisible: false,
      },
    });

    const frameIssue = result.issues.find(i => i.includes('full body not in frame'));
    expect(frameIssue).toBeDefined();
    expect(frameIssue).toContain('head');
    expect(frameIssue).toContain('ankles');
  });

  // ------------------------------------------------------------------
  // Test 4: orientation mismatch -> BLOCKING
  // ------------------------------------------------------------------
  it('blocks when detected pose is a side view but front was requested', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      detectedPose: 'left',
    });

    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.includes('orientation does not match'))).toBe(true);
    // The issue message should name both the requested and detected poses
    const orientationIssue = result.issues.find(i => i.includes('orientation'));
    expect(orientationIssue).toContain('front');
    expect(orientationIssue).toContain('left');
  });

  it('blocks when detected pose is back but front was requested', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      detectedPose: 'back',
    });

    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.includes('orientation does not match'))).toBe(true);
  });

  it('does not add an orientation issue when detectedPose is null (cannot classify)', () => {
    // If the system could not determine orientation, it should not raise
    // a mismatch issue; a missing-person issue covers this case instead.
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      personDetected: false,
      detectedPose: null,
    });

    expect(result.issues.some(i => i.includes('orientation does not match'))).toBe(false);
  });

  // ------------------------------------------------------------------
  // Test 5a: excessive tilt -> BLOCKING (>= TILT_BLOCK_DEG)
  // Rule documented in CaptureQualityResult JSDoc: excessive tilt is blocking
  // because perspective distortion is systematic and cannot be corrected.
  // ------------------------------------------------------------------
  it('blocks and reduces score when device tilt exceeds TILT_BLOCK_DEG', () => {
    const tilt = TILT_BLOCK_DEG + 5;
    const result = assessCaptureQuality({ ...CLEAN_FRONT, tiltDeg: tilt });

    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.includes('device tilt too high'))).toBe(true);
    // Score should be substantially reduced
    expect(result.score).toBeLessThan(0.65);
  });

  it('includes the actual tilt value in the blocking tilt issue string', () => {
    const result = assessCaptureQuality({ ...CLEAN_FRONT, tiltDeg: 30 });
    const tiltIssue = result.issues.find(i => i.includes('device tilt'));
    expect(tiltIssue).toContain('30.0');
  });

  // ------------------------------------------------------------------
  // Test 5b: mild tilt -> SOFT (>= TILT_WARN_DEG and < TILT_BLOCK_DEG)
  // ------------------------------------------------------------------
  it('adds a soft tilt warning (does not block) for tilt between TILT_WARN_DEG and TILT_BLOCK_DEG', () => {
    const tilt = TILT_WARN_DEG + 3; // 13 deg: above warn, below block
    const result = assessCaptureQuality({ ...CLEAN_FRONT, tiltDeg: tilt });

    expect(result.pass).toBe(true);
    expect(result.issues.some(i => i.includes('tilt'))).toBe(true);
    // Score reduced but still high
    expect(result.score).toBeLessThan(1.0);
    expect(result.score).toBeGreaterThan(0.6);
  });

  it('adds no tilt issue when tilt is below TILT_WARN_DEG', () => {
    const result = assessCaptureQuality({ ...CLEAN_FRONT, tiltDeg: TILT_WARN_DEG - 1 });

    expect(result.issues.some(i => i.includes('tilt'))).toBe(false);
  });

  it('treats negative tilt values as their absolute value', () => {
    const positive = assessCaptureQuality({ ...CLEAN_FRONT, tiltDeg: TILT_BLOCK_DEG + 5 });
    const negative = assessCaptureQuality({ ...CLEAN_FRONT, tiltDeg: -(TILT_BLOCK_DEG + 5) });
    expect(positive.pass).toBe(false);
    expect(negative.pass).toBe(false);
    expect(positive.score).toBeCloseTo(negative.score, 5);
  });

  // ------------------------------------------------------------------
  // Test 6: low contrast
  // ------------------------------------------------------------------
  it('adds a soft contrast warning (does not block) for marginal contrast', () => {
    const marginalContrast = (CONTRAST_BLOCK_MIN + CONTRAST_WARN_MIN) / 2;
    const result = assessCaptureQuality({ ...CLEAN_FRONT, contrastScore: marginalContrast });

    expect(result.pass).toBe(true);
    expect(result.issues.some(i => i.includes('low contrast'))).toBe(true);
    expect(result.score).toBeLessThan(1.0);
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('blocks when contrast is below CONTRAST_BLOCK_MIN', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      contrastScore: CONTRAST_BLOCK_MIN - 0.05,
    });

    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.includes('low contrast'))).toBe(true);
  });

  it('adds no contrast issue when contrast is at or above CONTRAST_WARN_MIN', () => {
    const result = assessCaptureQuality({ ...CLEAN_FRONT, contrastScore: CONTRAST_WARN_MIN });

    expect(result.issues.some(i => i.includes('contrast'))).toBe(false);
  });

  // ------------------------------------------------------------------
  // Test 6b: low landmark visibility (SOFT)
  // ------------------------------------------------------------------
  it('adds a soft visibility warning when average visibility is below MIN_LANDMARK_VISIBILITY', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      landmarks: { ...ALL_LANDMARKS_VISIBLE, averageVisibility: MIN_LANDMARK_VISIBILITY - 0.05 },
    });

    expect(result.pass).toBe(true);
    expect(result.issues.some(i => i.includes('low landmark visibility'))).toBe(true);
    expect(result.score).toBeLessThan(1.0);
  });

  it('adds no visibility issue when average visibility is at or above MIN_LANDMARK_VISIBILITY', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      landmarks: { ...ALL_LANDMARKS_VISIBLE, averageVisibility: MIN_LANDMARK_VISIBILITY },
    });

    expect(result.issues.some(i => i.includes('visibility'))).toBe(false);
  });

  // ------------------------------------------------------------------
  // Test 7: score is always in [0, 1]
  // ------------------------------------------------------------------
  it('keeps score in [0, 1] even when multiple blocking issues stack', () => {
    // Worst-case scenario: all blocking conditions simultaneously.
    const result = assessCaptureQuality({
      requestedPose: 'front',
      detectedPose: 'back',
      personDetected: true,
      landmarks: {
        noseVisible: false,
        leftShoulderVisible: false,
        rightShoulderVisible: false,
        leftHipVisible: false,
        rightHipVisible: false,
        leftAnkleVisible: false,
        rightAnkleVisible: false,
        averageVisibility: 0,
      },
      tiltDeg: 45,
      contrastScore: 0.05,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.pass).toBe(false);
    expect(result.issues.length).toBeGreaterThan(2);
  });

  it('keeps score exactly at 1.0 for a perfect capture', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      tiltDeg: 0,
      contrastScore: 1.0,
    });

    expect(result.score).toBe(1.0);
    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('score is in [0, 1] for many randomised inputs', () => {
    // Verify the invariant across a range of inputs without relying on exact values.
    const poses: Array<'front' | 'back' | 'left' | 'right'> = ['front', 'back', 'left', 'right'];
    for (let i = 0; i < 20; i++) {
      const tilt = i * 4;
      const contrast = i / 20;
      const result = assessCaptureQuality({
        requestedPose: poses[i % 4],
        detectedPose: i % 5 === 0 ? null : poses[(i + 1) % 4],
        personDetected: i % 3 !== 0,
        landmarks: {
          noseVisible: i % 2 === 0,
          leftShoulderVisible: true,
          rightShoulderVisible: i % 4 !== 0,
          leftHipVisible: true,
          rightHipVisible: true,
          leftAnkleVisible: i % 6 !== 0,
          rightAnkleVisible: true,
          averageVisibility: contrast,
        },
        tiltDeg: tilt,
        contrastScore: contrast,
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  });

  // ------------------------------------------------------------------
  // pass / score relationship
  // ------------------------------------------------------------------
  it('returns pass false with a reduced score when any single blocking issue exists', () => {
    // Blocking via orientation alone; all other inputs are ideal
    const result = assessCaptureQuality({ ...CLEAN_FRONT, detectedPose: 'right' });
    expect(result.pass).toBe(false);
    expect(result.score).toBeLessThan(1.0);
  });

  it('returns pass true with score < 1 when only soft issues are present', () => {
    const result = assessCaptureQuality({
      ...CLEAN_FRONT,
      tiltDeg: TILT_WARN_DEG + 1,
      contrastScore: CONTRAST_WARN_MIN - 0.01,
    });
    expect(result.pass).toBe(true);
    expect(result.score).toBeLessThan(1.0);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
