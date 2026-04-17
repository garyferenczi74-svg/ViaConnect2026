'use client';

// Pose landmark detection using MediaPipe Pose.
// Returns 33 anatomical landmarks, spec-named to LandmarkKey.
// NOTE: the original Prompt #86C referenced "68+ landmarks" but that figure
// came from facial landmark models (dlib). MediaPipe Pose provides 33 body
// landmarks, which is what we use here.

import type { LandmarkMap, LandmarkKey, Point2D } from './types';

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

interface PoseModule {
  Pose: new (config: { locateFile?: (file: string) => string }) => {
    setOptions: (opts: unknown) => void;
    onResults: (cb: (r: {
      poseLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
    }) => void) => void;
    send: (input: { image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | OffscreenCanvas | ImageBitmap }) => Promise<void>;
    close: () => void;
  };
}

let poseModulePromise: Promise<PoseModule> | null = null;
function loadPoseModule(): Promise<PoseModule> {
  if (!poseModulePromise) {
    poseModulePromise = import('@mediapipe/pose') as unknown as Promise<PoseModule>;
  }
  return poseModulePromise;
}

/** Detect 33 MediaPipe pose landmarks from an image blob. Coordinates are
 *  returned in image pixel space (origin at top left). */
export async function detectLandmarks(blob: Blob): Promise<LandmarkMap> {
  const { Pose } = await loadPoseModule();
  const bitmap = await createImageBitmap(blob);
  const w = bitmap.width;
  const h = bitmap.height;

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  if (canvas instanceof HTMLCanvasElement) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0);

  const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: false,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    staticImageMode: true,
  });

  const map: LandmarkMap = {};
  const done = new Promise<LandmarkMap>((resolve) => {
    pose.onResults((results) => {
      const pts = results.poseLandmarks ?? [];
      pts.forEach((pt, i) => {
        const key = MP_INDEX[i];
        if (!key) return;
        const point: Point2D & { visibility?: number } = {
          x: pt.x * w,
          y: pt.y * h,
          visibility: pt.visibility,
        };
        map[key] = point;
      });
      resolve(map);
    });
  });

  try {
    await pose.send({ image: canvas as unknown as HTMLCanvasElement });
    const result = await Promise.race([
      done,
      new Promise<LandmarkMap>((_, rej) => setTimeout(() => rej(new Error('Pose detection timeout')), 15000)),
    ]);
    return result;
  } finally {
    try { pose.close(); } catch { /* ignore */ }
    if ('close' in bitmap) bitmap.close();
  }
}
