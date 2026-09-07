// Arnold PASS OBRA B: IMAGE-mode PoseLandmarker mapping + fail-open.
// No real WASM / tasks-vision runtime — inject detect + bitmap.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  detectLandmarks,
  mapNormalizedLandmarksToPixelSpace,
  resetImagePoseLandmarkerCacheForTests,
  type ImageBitmapLike,
} from '../landmarkDetector';
import type { LandmarkKey } from '../types';
import type { ImagePoseLandmarkerLike } from '@/hooks/scan/usePoseLandmarker';

const LANDMARK_KEYS: LandmarkKey[] = [
  'nose',
  'left_eye_inner', 'left_eye', 'left_eye_outer',
  'right_eye_inner', 'right_eye', 'right_eye_outer',
  'left_ear', 'right_ear',
  'mouth_left', 'mouth_right',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_pinky', 'right_pinky',
  'left_index', 'right_index',
  'left_thumb', 'right_thumb',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle',
  'left_heel', 'right_heel',
  'left_foot_index', 'right_foot_index',
];

function makeNormalizedPose(count = 33) {
  return Array.from({ length: count }, (_, i) => ({
    x: (i + 1) / 100,
    y: (i + 1) / 200,
    z: 0,
    visibility: 0.75,
  }));
}

function fakeLandmarker(
  landmarks: Array<Array<{ x: number; y: number; z: number; visibility: number }>>,
): ImagePoseLandmarkerLike {
  return {
    detect: vi.fn(() => ({ landmarks })),
    close: vi.fn(),
  };
}

const bitmap: ImageBitmapLike = { width: 200, height: 400, close: vi.fn() };

afterEach(() => {
  resetImagePoseLandmarkerCacheForTests();
  vi.useRealTimers();
});

describe('mapNormalizedLandmarksToPixelSpace', () => {
  it('maps all 33 MediaPipe indices onto LandmarkKey pixel coordinates', () => {
    const pts = makeNormalizedPose(33);
    const map = mapNormalizedLandmarksToPixelSpace(pts, 200, 400);

    expect(Object.keys(map)).toHaveLength(33);
    expect(map.nose).toEqual({ x: 2, y: 2, visibility: 0.75 });
    expect(map.left_shoulder).toEqual({ x: 24, y: 24, visibility: 0.75 });
    expect(map.right_foot_index).toEqual({ x: 66, y: 66, visibility: 0.75 });
    for (const key of LANDMARK_KEYS) {
      expect(map[key]).toBeDefined();
      expect(Number.isFinite(map[key]?.x)).toBe(true);
      expect(Number.isFinite(map[key]?.y)).toBe(true);
    }
  });

  it('ignores indices past the 33-landmark BlazePose set', () => {
    const pts = makeNormalizedPose(40);
    const map = mapNormalizedLandmarksToPixelSpace(pts, 100, 100);
    expect(Object.keys(map)).toHaveLength(33);
  });

  it('returns an empty map for an empty pose (never invents keys)', () => {
    expect(mapNormalizedLandmarksToPixelSpace([], 200, 400)).toEqual({});
  });
});

describe('detectLandmarks IMAGE landmarker path', () => {
  it('returns finite pixel-space landmarks from a successful IMAGE detect', async () => {
    const landmarker = fakeLandmarker([makeNormalizedPose(33)]);
    const blob = new Blob(['pose'], { type: 'image/jpeg' });

    const map = await detectLandmarks(blob, {
      loadLandmarker: async () => landmarker,
      createBitmap: async () => bitmap,
    });

    expect(landmarker.detect).toHaveBeenCalledWith(bitmap);
    expect(map.nose).toEqual({ x: 2, y: 2, visibility: 0.75 });
    expect(map.left_hip).toEqual({ x: 48, y: 48, visibility: 0.75 });
    expect(Object.keys(map)).toHaveLength(33);
  });

  it('fail-open: empty landmarks → empty map, never invents height/cm/Muscle', async () => {
    const map = await detectLandmarks(new Blob(['empty']), {
      loadLandmarker: async () => fakeLandmarker([]),
      createBitmap: async () => bitmap,
    });

    expect(map).toEqual({});
    expect(JSON.stringify(map)).not.toMatch(/height|cm|muscle|lbs/i);
  });

  it('fail-open: missing first pose → empty map', async () => {
    const map = await detectLandmarks(new Blob(['none']), {
      loadLandmarker: async () => fakeLandmarker([[]]),
      createBitmap: async () => bitmap,
    });
    expect(map).toEqual({});
  });

  it('fail-open: landmarker init null → empty map (no fabricated girths)', async () => {
    const map = await detectLandmarks(new Blob(['init-fail']), {
      loadLandmarker: async () => null,
      createBitmap: async () => bitmap,
    });
    expect(map).toEqual({});
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('timeout throws Pose detection timeout (upstream UNKNOWN), never invents', async () => {
    vi.useFakeTimers();
    const pending = detectLandmarks(new Blob(['slow']), {
      timeoutMs: 40,
      loadLandmarker: () => new Promise(() => {}),
      createBitmap: async () => bitmap,
    });
    const expectation = expect(pending).rejects.toThrow('Pose detection timeout');
    await vi.advanceTimersByTimeAsync(40);
    await expectation;
  });
});

describe('landmarkDetector source contract (PASS OBRA B)', () => {
  it('does not import @mediapipe/pose or a CDN locateFile', () => {
    const src = readFileSync(join(__dirname, '..', 'landmarkDetector.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"]@mediapipe\/pose['"]/);
    expect(src).not.toMatch(/import\(\s*[^)]*@mediapipe\/pose/);
    expect(src).not.toMatch(/cdn\.jsdelivr/);
    expect(src).toMatch(/createImagePoseLandmarker/);
    expect(src).toMatch(/IMAGE/);
    expect(src).toMatch(/reason: 'timeout'/);
    expect(src).toMatch(/reason: 'empty_landmarks'/);
    expect(src).toMatch(/reason: 'extract_throw'/);
    expect(src).toMatch(/no invented cm/);
  });

  it('next.config no longer aliases @mediapipe/pose to the no-op shim', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', '..', '..', 'next.config.mjs'), 'utf8');
    expect(src).not.toMatch(/"@mediapipe\/pose"/);
    expect(src).toMatch(/@mediapipe\/selfie_segmentation/);
  });
});
