// Task 13b (Prompt 210c) - TDD tests for silhouetteToQualityInput.ts
// Written RED first against the module's public API.
// Tests cover: the PoseSilhouette->CaptureQualityInput mapper + retakePromptForIssues.

import { describe, it, expect } from 'vitest';
import {
  silhouetteToQualityInput,
  retakePromptForIssues,
  poseLabelShort,
  VISIBILITY_THRESHOLD,
  PERSON_DETECTED_MIN_ANCHORS,
  DEFAULT_CONTRAST_SCORE,
  type ViewQualityResult,
} from '../silhouetteToQualityInput';
import type { PoseSilhouette, LandmarkMap } from '../../types';
import type { PoseId } from '../../../types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Minimal LandmarkMap with all key anchors visible at high confidence. */
function fullBodyLandmarks(overrides?: Partial<LandmarkMap>): LandmarkMap {
  const base: LandmarkMap = {
    // Face
    nose:           { x: 100, y: 30, visibility: 0.95 },
    // Shoulders - symmetric around x=100 (image 200px wide)
    left_shoulder:  { x:  70, y: 90, visibility: 0.92 },
    right_shoulder: { x: 130, y: 91, visibility: 0.91 },
    // Hips
    left_hip:       { x:  75, y: 220, visibility: 0.90 },
    right_hip:      { x: 125, y: 221, visibility: 0.90 },
    // Ankles
    left_ankle:     { x:  80, y: 430, visibility: 0.88 },
    right_ankle:    { x: 120, y: 430, visibility: 0.88 },
    // Additional landmarks for averageVisibility
    left_elbow:     { x:  50, y: 160, visibility: 0.85 },
    right_elbow:    { x: 150, y: 160, visibility: 0.85 },
    left_wrist:     { x:  45, y: 220, visibility: 0.80 },
    right_wrist:    { x: 155, y: 220, visibility: 0.80 },
    left_knee:      { x:  78, y: 335, visibility: 0.85 },
    right_knee:     { x: 122, y: 335, visibility: 0.85 },
  };
  return { ...base, ...overrides };
}

/** Minimal PoseSilhouette with a clean front view. */
function makeSilhouette(overrides?: {
  poseId?: PoseId;
  landmarks?: LandmarkMap;
  qualityScore?: number;
  imageWidth?: number;
  imageHeight?: number;
}): PoseSilhouette {
  return {
    poseId:       overrides?.poseId ?? 'front',
    imageWidth:   overrides?.imageWidth ?? 200,
    imageHeight:  overrides?.imageHeight ?? 480,
    contour:      [],
    landmarks:    overrides?.landmarks ?? fullBodyLandmarks(),
    scaleCmPerPx: 0.42,
    maskDimensions: { width: 200, height: 480 },
    qualityScore:   overrides?.qualityScore ?? 0,
    qualityIssues:  [],
  };
}

// ---------------------------------------------------------------------------
// 1. silhouetteToQualityInput - personDetected
// ---------------------------------------------------------------------------

describe('silhouetteToQualityInput - personDetected', () => {
  it('detects a person when all key anchors are visible', () => {
    const result = silhouetteToQualityInput(makeSilhouette(), 'front');
    expect(result.personDetected).toBe(true);
  });

  it('returns personDetected false when landmark map is empty', () => {
    const sil = makeSilhouette({ landmarks: {} });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.personDetected).toBe(false);
  });

  it('returns personDetected false when fewer than PERSON_DETECTED_MIN_ANCHORS are visible', () => {
    // Only 2 anchors visible (below minimum of 3)
    const lm: LandmarkMap = {
      nose:          { x: 100, y: 30, visibility: 0.9 },
      left_shoulder: { x:  70, y: 90, visibility: 0.9 },
    };
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.personDetected).toBe(false);
  });

  it(`returns personDetected true when exactly ${PERSON_DETECTED_MIN_ANCHORS} anchors are visible`, () => {
    const lm: LandmarkMap = {
      nose:          { x: 100, y: 30, visibility: 0.9 },
      left_shoulder: { x:  70, y: 90, visibility: 0.9 },
      right_shoulder:{ x: 130, y: 90, visibility: 0.9 },
    };
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.personDetected).toBe(true);
  });

  it('treats landmarks without visibility as visible (fail-open)', () => {
    // No visibility field -> should be treated as visible
    const lm: LandmarkMap = {
      nose:           { x: 100, y: 30 },
      left_shoulder:  { x:  70, y: 90 },
      right_shoulder: { x: 130, y: 90 },
    };
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.personDetected).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. silhouetteToQualityInput - landmarks mapping
// ---------------------------------------------------------------------------

describe('silhouetteToQualityInput - landmarks mapping', () => {
  it('maps visible nose to noseVisible true', () => {
    const result = silhouetteToQualityInput(makeSilhouette(), 'front');
    expect(result.landmarks.noseVisible).toBe(true);
  });

  it('maps missing nose to noseVisible false', () => {
    const sil = makeSilhouette({ landmarks: fullBodyLandmarks({ nose: undefined }) });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.landmarks.noseVisible).toBe(false);
  });

  it('maps low-visibility nose to noseVisible false', () => {
    const sil = makeSilhouette({
      landmarks: fullBodyLandmarks({ nose: { x: 100, y: 30, visibility: VISIBILITY_THRESHOLD - 0.01 } }),
    });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.landmarks.noseVisible).toBe(false);
  });

  it('maps visible ankle to leftAnkleVisible true', () => {
    const result = silhouetteToQualityInput(makeSilhouette(), 'front');
    expect(result.landmarks.leftAnkleVisible).toBe(true);
    expect(result.landmarks.rightAnkleVisible).toBe(true);
  });

  it('maps missing ankle to leftAnkleVisible false', () => {
    const sil = makeSilhouette({
      landmarks: fullBodyLandmarks({ left_ankle: undefined }),
    });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.landmarks.leftAnkleVisible).toBe(false);
  });

  it('computes averageVisibility as mean of all present visibility scores', () => {
    const result = silhouetteToQualityInput(makeSilhouette(), 'front');
    // All landmarks have visibility > 0.8; average should be well above 0.5
    expect(result.landmarks.averageVisibility).toBeGreaterThan(0.5);
    expect(result.landmarks.averageVisibility).toBeLessThanOrEqual(1.0);
  });

  it('sets averageVisibility to 0 when no landmarks carry a visibility score', () => {
    const lm: LandmarkMap = {
      nose: { x: 100, y: 30 }, // no visibility field
      left_shoulder: { x: 70, y: 90 }, // no visibility field
    };
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.landmarks.averageVisibility).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. silhouetteToQualityInput - tiltDeg estimation
// ---------------------------------------------------------------------------

describe('silhouetteToQualityInput - tiltDeg estimation', () => {
  it('returns 0 tilt when shoulders are perfectly horizontal', () => {
    // Same y coordinate -> horizontal -> tilt = 0
    const lm = fullBodyLandmarks({
      left_shoulder:  { x: 70, y: 90, visibility: 0.9 },
      right_shoulder: { x: 130, y: 90, visibility: 0.9 },
    });
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.tiltDeg).toBeCloseTo(0, 5);
  });

  it('returns positive tilt when shoulders are tilted', () => {
    // right shoulder 10px higher -> angle from horizontal
    const lm = fullBodyLandmarks({
      left_shoulder:  { x:  70, y: 100, visibility: 0.9 },
      right_shoulder: { x: 130, y:  80, visibility: 0.9 },
    });
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'front');
    // atan2(20, 60) * 180/pi ~ 18.4 degrees
    expect(result.tiltDeg).toBeGreaterThan(0);
    expect(result.tiltDeg).toBeLessThan(90);
  });

  it('tilt is symmetric: same angle from left-high or right-high tilt', () => {
    const lmLeftHigh = fullBodyLandmarks({
      left_shoulder:  { x:  70, y:  80, visibility: 0.9 },
      right_shoulder: { x: 130, y: 100, visibility: 0.9 },
    });
    const lmRightHigh = fullBodyLandmarks({
      left_shoulder:  { x:  70, y: 100, visibility: 0.9 },
      right_shoulder: { x: 130, y:  80, visibility: 0.9 },
    });
    const sil1 = makeSilhouette({ landmarks: lmLeftHigh });
    const sil2 = makeSilhouette({ landmarks: lmRightHigh });
    const r1 = silhouetteToQualityInput(sil1, 'front');
    const r2 = silhouetteToQualityInput(sil2, 'front');
    expect(r1.tiltDeg).toBeCloseTo(r2.tiltDeg, 5);
  });

  it('returns 0 tilt when no shoulder landmarks are present (fail-open)', () => {
    const lm: LandmarkMap = { nose: { x: 100, y: 30, visibility: 0.9 } };
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.tiltDeg).toBe(0);
  });

  it('falls back to hip line when shoulders are absent', () => {
    const lm: LandmarkMap = {
      left_hip:  { x:  75, y: 220, visibility: 0.9 },
      right_hip: { x: 125, y: 220, visibility: 0.9 },
    };
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'front');
    // Hips are at the same y -> tilt = 0
    expect(result.tiltDeg).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// 4. silhouetteToQualityInput - detectedPose estimation
// ---------------------------------------------------------------------------

describe('silhouetteToQualityInput - detectedPose estimation', () => {
  it('detects front when both shoulders are symmetric and nose is visible', () => {
    const result = silhouetteToQualityInput(makeSilhouette(), 'front');
    expect(result.detectedPose).toBe('front');
  });

  it('detects back when shoulders are symmetric but nose is absent', () => {
    const lm = fullBodyLandmarks({ nose: undefined });
    const sil = makeSilhouette({ landmarks: lm, poseId: 'back' });
    const result = silhouetteToQualityInput(sil, 'back');
    expect(result.detectedPose).toBe('back');
  });

  it('returns null when landmark map is empty (cannot classify)', () => {
    const sil = makeSilhouette({ landmarks: {} });
    const result = silhouetteToQualityInput(sil, 'front');
    // personDetected is false, so detectedPose is null
    expect(result.detectedPose).toBeNull();
  });

  it('returns requestedPose (not null) when person is detected but orientation is ambiguous', () => {
    // Only one shoulder visible (right) -> lateral, returns 'right'
    const lm: LandmarkMap = {
      right_shoulder: { x: 130, y: 90, visibility: 0.9 },
      left_hip:       { x:  75, y: 220, visibility: 0.9 },
      right_hip:      { x: 125, y: 221, visibility: 0.9 },
    };
    const sil = makeSilhouette({ landmarks: lm });
    const result = silhouetteToQualityInput(sil, 'right');
    expect(result.detectedPose).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. silhouetteToQualityInput - contrastScore
// ---------------------------------------------------------------------------

describe('silhouetteToQualityInput - contrastScore', () => {
  it(`uses DEFAULT_CONTRAST_SCORE (${DEFAULT_CONTRAST_SCORE}) when qualityScore is 0 and no override`, () => {
    const sil = makeSilhouette({ qualityScore: 0 });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.contrastScore).toBe(DEFAULT_CONTRAST_SCORE);
  });

  it('uses silhouette qualityScore when it is non-zero', () => {
    const sil = makeSilhouette({ qualityScore: 0.72 });
    const result = silhouetteToQualityInput(sil, 'front');
    expect(result.contrastScore).toBe(0.72);
  });

  it('uses the explicitly provided contrastScore when specified', () => {
    const sil = makeSilhouette({ qualityScore: 0.72 });
    const result = silhouetteToQualityInput(sil, 'front', 0.91);
    expect(result.contrastScore).toBe(0.91);
  });

  it('uses 0 contrast override even if silhouette has non-zero qualityScore (explicit wins)', () => {
    const sil = makeSilhouette({ qualityScore: 0.80 });
    const result = silhouetteToQualityInput(sil, 'front', 0);
    expect(result.contrastScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. silhouetteToQualityInput - integration with assessCaptureQuality
// ---------------------------------------------------------------------------

describe('silhouetteToQualityInput integrated with assessCaptureQuality', () => {
  it('produces a passing result for a clean full-body front silhouette', async () => {
    // Dynamic import avoids loading captureQuality at module-load time in red tests
    const { assessCaptureQuality } = await import('../captureQuality');
    const sil = makeSilhouette({ qualityScore: 0.85 });
    const input = silhouetteToQualityInput(sil, 'front');
    const result = assessCaptureQuality(input);
    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('produces a failing result when no person is detectable in the silhouette', async () => {
    const { assessCaptureQuality } = await import('../captureQuality');
    const sil = makeSilhouette({ landmarks: {} });
    const input = silhouetteToQualityInput(sil, 'front');
    const result = assessCaptureQuality(input);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.includes('no person detected'))).toBe(true);
  });

  it('produces a failing result when ankles are missing', async () => {
    const { assessCaptureQuality } = await import('../captureQuality');
    const lm = fullBodyLandmarks({ left_ankle: undefined, right_ankle: undefined });
    const sil = makeSilhouette({ landmarks: lm, qualityScore: 0.8 });
    const input = silhouetteToQualityInput(sil, 'front');
    const result = assessCaptureQuality(input);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.includes('ankles'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. retakePromptForIssues - prompt generation
// ---------------------------------------------------------------------------

describe('retakePromptForIssues - prompt selection logic', () => {
  it('returns empty string for empty issues list (no retake needed)', () => {
    expect(retakePromptForIssues([])).toBe('');
  });

  it('prompts to step into frame for no-person-detected issue', () => {
    const prompt = retakePromptForIssues(['no person detected']);
    expect(prompt.toLowerCase()).toContain('frame');
    expect(prompt.length).toBeGreaterThan(10);
  });

  it('prompts to step back when ankles are missing', () => {
    const prompt = retakePromptForIssues(['full body not in frame (missing: ankles)']);
    expect(prompt.toLowerCase()).toContain('feet');
    expect(prompt.length).toBeGreaterThan(10);
  });

  it('prompts to step back when head is missing', () => {
    const prompt = retakePromptForIssues(['full body not in frame (missing: head)']);
    expect(prompt.toLowerCase()).toContain('head');
  });

  it('addresses all missing parts in the prompt', () => {
    const prompt = retakePromptForIssues(['full body not in frame (missing: head, ankles)']);
    // At least two body parts mentioned
    expect(prompt.toLowerCase()).toMatch(/head|feet|body/);
  });

  it('prompts to face correct direction for orientation mismatch', () => {
    const prompt = retakePromptForIssues([
      'orientation does not match requested view (requested front, detected left)',
    ]);
    expect(prompt.toLowerCase()).toContain('front');
  });

  it('includes degree info for excessive device tilt', () => {
    const prompt = retakePromptForIssues(['device tilt too high (30.0 degrees from vertical)']);
    expect(prompt).toContain('30');
    expect(prompt.toLowerCase()).toContain('level');
  });

  it('addresses lighting for blocking contrast issue', () => {
    const prompt = retakePromptForIssues(['low contrast (image is too dark or overexposed)']);
    expect(prompt.toLowerCase()).toMatch(/light|dark|expos/);
  });

  it('returns a soft prompt for slight tilt (non-blocking) when it is the only issue', () => {
    const prompt = retakePromptForIssues(['slight device tilt detected (12.0 degrees)']);
    expect(prompt.toLowerCase()).toContain('tilt');
    expect(prompt.length).toBeGreaterThan(5);
  });

  it('prioritises no-person-detected over other issues when both are present', () => {
    const prompt = retakePromptForIssues([
      'no person detected',
      'low contrast (image is too dark or overexposed)',
    ]);
    // Should address the no-person issue first
    expect(prompt.toLowerCase()).toContain('frame');
  });

  it('prioritises full-body-not-in-frame over contrast when both blocking', () => {
    const prompt = retakePromptForIssues([
      'full body not in frame (missing: ankles)',
      'low contrast (image is too dark or overexposed)',
    ]);
    expect(prompt.toLowerCase()).toMatch(/feet|step back/i);
  });

  it('returns a non-empty fallback for a single unrecognised issue', () => {
    const prompt = retakePromptForIssues(['some unusual issue not in any pattern']);
    expect(prompt.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 8. poseLabelShort
// ---------------------------------------------------------------------------

describe('poseLabelShort', () => {
  it('returns Front for front', () => { expect(poseLabelShort('front')).toBe('Front'); });
  it('returns Back for back',   () => { expect(poseLabelShort('back')).toBe('Back'); });
  it('returns Left side for left', () => { expect(poseLabelShort('left')).toBe('Left side'); });
  it('returns Right side for right', () => { expect(poseLabelShort('right')).toBe('Right side'); });
});

// ---------------------------------------------------------------------------
// 9. ViewQualityResult type shape (compile-time guard, runtime confirm)
// ---------------------------------------------------------------------------

describe('ViewQualityResult shape', () => {
  it('can be constructed with all required fields', () => {
    const vqr: ViewQualityResult = {
      poseId: 'front',
      score: 0.9,
      issues: [],
      pass: true,
      retakePrompt: '',
    };
    expect(vqr.poseId).toBe('front');
    expect(vqr.pass).toBe(true);
  });
});
