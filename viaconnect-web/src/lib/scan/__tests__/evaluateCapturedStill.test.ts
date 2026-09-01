import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  evaluateCapturedStill,
  isNearBlackStill,
  NEAR_BLACK_EXPOSURE_MAX,
  NEAR_BLACK_LUMINANCE_VARIANCE_MAX,
} from '../evaluateCapturedStill';
import { evaluatePose } from '../qa';
import type { Landmark } from '../types';
import type { FrameMetrics } from '../frameMetrics';

function loadFixture(name: string): { landmarks: Landmark[]; pose: 'front' } {
  return JSON.parse(readFileSync(join(__dirname, '..', '__fixtures__', name), 'utf8')) as {
    landmarks: Landmark[];
    pose: 'front';
  };
}

const frontPass = loadFixture('front_pass.json');
const armsIn = loadFixture('any_arms_in.json');

const usableMetrics: FrameMetrics = { luminanceVariance: 500, exposure: 0.5, blurScore: 500 };
const blackMetrics: FrameMetrics = { luminanceVariance: 0, exposure: 0, blurScore: 0 };
const nearBlackMetrics: FrameMetrics = { luminanceVariance: 1, exposure: 0.01, blurScore: 0 };
const dimTexturedMetrics: FrameMetrics = { luminanceVariance: 200, exposure: 0.1, blurScore: 200 };

const base = {
  pose: 'front' as const,
  frameWidth: 1080,
  frameHeight: 1920,
};

describe('isNearBlackStill', () => {
  it('flags a dead/black grab, not a dim-but-textured room', () => {
    expect(isNearBlackStill(blackMetrics)).toBe(true);
    expect(isNearBlackStill(nearBlackMetrics)).toBe(true);
    expect(isNearBlackStill(usableMetrics)).toBe(false);
    expect(isNearBlackStill(dimTexturedMetrics)).toBe(false);
  });

  it('uses tight thresholds so evaluateWeakFrame NO_BODY is not CAMERA_LOST', () => {
    expect(NEAR_BLACK_EXPOSURE_MAX).toBeLessThan(0.15);
    expect(NEAR_BLACK_LUMINANCE_VARIANCE_MAX).toBeLessThan(50);
  });
});

describe('evaluateCapturedStill', () => {
  it('trusts still landmarks when detectStill returns a body', () => {
    const verdict = evaluateCapturedStill({
      ...base,
      stillLandmarks: frontPass.landmarks,
      liveLandmarks: null,
      metrics: usableMetrics,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind === 'qa') {
      expect(verdict.qa.pass).toBe(true);
      expect(verdict.qa.mode).toBe('landmarker');
      expect(verdict.landmarks).toBe(frontPass.landmarks);
    }
  });

  it('does not hard-NO_BODY when detectStill is null and live-video landmarks would pass', () => {
    const hardNoBody = evaluatePose({
      landmarks: null,
      pose: 'front',
      frameWidth: 1080,
      frameHeight: 1920,
      blurScore: usableMetrics.blurScore,
    });
    expect(hardNoBody.code).toBe('NO_BODY');

    const verdict = evaluateCapturedStill({
      ...base,
      stillLandmarks: null,
      liveLandmarks: frontPass.landmarks,
      metrics: usableMetrics,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind === 'qa') {
      expect(verdict.qa.pass).toBe(true);
      expect(verdict.qa.code).toBe('PASS');
      expect(verdict.qa.mode).toBe('landmarker');
      expect(verdict.landmarks).toEqual(frontPass.landmarks);
    }
  });

  it('falls back to evaluateWeakFrame when both detects are null on a usable still', () => {
    const verdict = evaluateCapturedStill({
      ...base,
      stillLandmarks: null,
      liveLandmarks: null,
      metrics: usableMetrics,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind === 'qa') {
      expect(verdict.qa.pass).toBe(true);
      expect(verdict.qa.mode).toBe('weak');
      expect(verdict.landmarks).toBeUndefined();
    }
  });

  it('keeps a real still-QA fail (does not weak-PASS over a bad pose)', () => {
    const verdict = evaluateCapturedStill({
      ...base,
      stillLandmarks: armsIn.landmarks,
      liveLandmarks: frontPass.landmarks,
      metrics: usableMetrics,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind === 'qa') {
      expect(verdict.qa.pass).toBe(false);
      expect(verdict.qa.code).toBe('ARMS_IN');
    }
  });

  it('routes a black still to camera_lost, not NO_BODY', () => {
    const verdict = evaluateCapturedStill({
      ...base,
      stillLandmarks: null,
      liveLandmarks: frontPass.landmarks,
      metrics: blackMetrics,
    });
    expect(verdict).toEqual({ kind: 'camera_lost' });
  });

  it('routes a near-black still to camera_lost even if weak metrics would be NO_BODY', () => {
    const verdict = evaluateCapturedStill({
      ...base,
      stillLandmarks: null,
      liveLandmarks: null,
      metrics: nearBlackMetrics,
    });
    expect(verdict).toEqual({ kind: 'camera_lost' });
  });

  it('does not treat a dim textured frame as camera_lost', () => {
    const verdict = evaluateCapturedStill({
      ...base,
      stillLandmarks: null,
      liveLandmarks: null,
      metrics: dimTexturedMetrics,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind === 'qa') {
      expect(verdict.qa.pass).toBe(false);
      expect(verdict.qa.code).toBe('NO_BODY');
      expect(verdict.qa.mode).toBe('weak');
    }
  });
});
