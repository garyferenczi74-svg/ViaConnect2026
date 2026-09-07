'use client';

// Pose landmark detection using tasks-vision PoseLandmarker in IMAGE mode.
// Returns 33 anatomical landmarks, spec-named to LandmarkKey, in pixel space.
// NOTE: the original Prompt #86C referenced "68+ landmarks" but that figure
// came from facial landmark models (dlib). MediaPipe Pose provides 33 body
// landmarks, which is what we use here.
//
// Arnold PASS OBRA B: do NOT use @mediapipe/pose — Turbopack aliased that
// package to a no-op shim, so geometric girths were all-UNKNOWN. IMAGE-mode
// PoseLandmarker reuses the same self-hosted /mediapipe/<version>/ assets as
// live VIDEO capture. Fail-open: timeout throws (upstream UNKNOWN), empty
// detect returns {}. Never invents height, cm, or Muscle lbs.

import type { LandmarkMap, LandmarkKey, Point2D } from './types';
import {
  createImagePoseLandmarker,
  loadPoseLandmarkerWithFallback,
  type ImagePoseLandmarkerLike,
  type MediaPipeNormalizedLandmark,
} from '@/hooks/scan/usePoseLandmarker';
import { isTimeoutError, withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const LOG_SCOPE = 'arnold.scanning.landmarkDetector';

/** Still-photo detect budget (init is separately bounded by load fallback). */
export const POSE_DETECT_TIMEOUT_MS = 15000;

// MediaPipe Pose landmark indices (0-32)
// https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
const MP_INDEX: Record<number, LandmarkKey> = {
  0: 'nose',
  1: 'left_eye_inner', 2: 'left_eye', 3: 'left_eye_outer',
  4: 'right_eye_inner', 5: 'right_eye', 6: 'right_eye_outer',
  7: 'left_ear', 8: 'right_ear',
  9: 'mouth_left', 10: 'mouth_right',
  11: 'left_shoulder', 12: 'right_shoulder',
  13: 'left_elbow', 14: 'right_elbow',
  15: 'left_wrist', 16: 'right_wrist',
  17: 'left_pinky', 18: 'right_pinky',
  19: 'left_index', 20: 'right_index',
  21: 'left_thumb', 22: 'right_thumb',
  23: 'left_hip', 24: 'right_hip',
  25: 'left_knee', 26: 'right_knee',
  27: 'left_ankle', 28: 'right_ankle',
  29: 'left_heel', 30: 'right_heel',
  31: 'left_foot_index', 32: 'right_foot_index',
};

export interface ImageBitmapLike {
  width: number;
  height: number;
  close?: () => void;
}

export interface DetectLandmarksDeps {
  loadLandmarker?: () => Promise<ImagePoseLandmarkerLike | null>;
  createBitmap?: (blob: Blob) => Promise<ImageBitmapLike>;
  timeoutMs?: number;
}

let cachedLandmarkerPromise: Promise<ImagePoseLandmarkerLike | null> | null = null;

export function resetImagePoseLandmarkerCacheForTests(): void {
  cachedLandmarkerPromise = null;
}

async function loadDefaultImageLandmarker(): Promise<ImagePoseLandmarkerLike | null> {
  if (!cachedLandmarkerPromise) {
    cachedLandmarkerPromise = loadPoseLandmarkerWithFallback(createImagePoseLandmarker).then((result) => {
      if (!result.ok) {
        safeLog.warn(LOG_SCOPE, 'IMAGE PoseLandmarker init failed; landmarks empty (fail-open)', {
          reason: result.reason,
        });
        return null;
      }
      return result.instance;
    });
  }
  return cachedLandmarkerPromise;
}

/** Pre-warm the cached IMAGE landmarker so the first view is not init-bound. */
export async function ensureImagePoseLandmarker(): Promise<boolean> {
  const instance = await loadDefaultImageLandmarker();
  return instance !== null;
}

/** Map 33 normalized MediaPipe landmarks into image pixel space (origin top-left). */
export function mapNormalizedLandmarksToPixelSpace(
  pts: ReadonlyArray<Pick<MediaPipeNormalizedLandmark, 'x' | 'y'> & { visibility?: number }>,
  width: number,
  height: number,
): LandmarkMap {
  const map: LandmarkMap = {};
  pts.forEach((pt, i) => {
    const key = MP_INDEX[i];
    if (!key) return;
    const point: Point2D & { visibility?: number } = {
      x: pt.x * width,
      y: pt.y * height,
      visibility: pt.visibility,
    };
    map[key] = point;
  });
  return map;
}

/** Detect 33 MediaPipe pose landmarks from an image blob. Coordinates are
 *  returned in image pixel space (origin at top left). Empty / failed detect
 *  returns {}. Timeout throws (handled upstream as UNKNOWN girths). */
export async function detectLandmarks(
  blob: Blob,
  deps: DetectLandmarksDeps = {},
): Promise<LandmarkMap> {
  const timeoutMs = deps.timeoutMs ?? POSE_DETECT_TIMEOUT_MS;
  const loadLandmarker = deps.loadLandmarker ?? loadDefaultImageLandmarker;
  const createBitmap =
    deps.createBitmap ??
    (async (source: Blob): Promise<ImageBitmapLike> => createImageBitmap(source));

  try {
    return await withTimeout(
      (async () => {
        const landmarker = await loadLandmarker();
        if (!landmarker) {
          safeLog.warn(LOG_SCOPE, 'IMAGE Pose empty landmarks (fail-open, no invented cm)', {
            reason: 'empty_landmarks',
            detail: 'init_failed',
          });
          return {};
        }

        const bitmap = await createBitmap(blob);
        try {
          const result = landmarker.detect(bitmap);
          const pts = result.landmarks[0] ?? [];
          if (pts.length === 0) {
            safeLog.warn(LOG_SCOPE, 'IMAGE Pose empty landmarks (fail-open, no invented cm)', {
              reason: 'empty_landmarks',
            });
            return {};
          }
          return mapNormalizedLandmarksToPixelSpace(pts, bitmap.width, bitmap.height);
        } finally {
          bitmap.close?.();
        }
      })(),
      timeoutMs,
      'arnold.scanning.detectLandmarks',
    );
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(LOG_SCOPE, 'IMAGE Pose detect timeout (fail-open, no invented cm)', {
        reason: 'timeout',
      });
      throw new Error('Pose detection timeout');
    }
    safeLog.warn(LOG_SCOPE, 'IMAGE Pose detect threw (fail-open, no invented cm)', {
      reason: 'extract_throw',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
