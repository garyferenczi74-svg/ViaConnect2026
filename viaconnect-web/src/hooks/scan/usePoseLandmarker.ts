'use client';

/**
 * Prompt 231 Task 11b: MediaPipe PoseLandmarker hook for the FormaVision
 * capture flow (spec Section 10). Wraps the self-hosted @mediapipe/tasks-vision
 * PoseLandmarker (assets checked into public/mediapipe/ by Task 11a; NEVER a
 * CDN or runtime fetch outside /mediapipe/*, condition 12) behind a
 * DOM-free, unit-testable fallback decision, so a real device's WASM /
 * WebGL failure modes (missing GPU, blocked asset fetch, unsupported
 * environment) degrade to weak-QA mode rather than crashing the scan flow.
 *
 * This module is imported dynamically by ScanExperience (already a
 * client-only, ssr:false island); the @mediapipe/tasks-vision import
 * itself is ALSO dynamic (inside createPoseLandmarker), so no MediaPipe
 * code ships in the initial bundle or runs on the server.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Landmark } from '@/lib/scan/types';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { MEDIAPIPE_ASSET_VERSION } from '@/lib/scan/mediapipeVersion';

const LOG_SCOPE = 'scan.usePoseLandmarker';

// Condition 12: FilesetResolver targets /mediapipe/* only, no CDN, no
// runtime fetch elsewhere. These two paths are the ONLY asset locations
// this module ever requests. Prompt 231a (R1): the version segment comes
// from the single MEDIAPIPE_ASSET_VERSION constant, so the runtime path
// and the version contract test read the same source.
const MEDIAPIPE_WASM_BASE_PATH = `/mediapipe/${MEDIAPIPE_ASSET_VERSION}/wasm`;
const MEDIAPIPE_MODEL_ASSET_PATH = `/mediapipe/${MEDIAPIPE_ASSET_VERSION}/pose_landmarker_lite.task`;

// Prompt 231a (R1): minimal WASM module using the v128 result type, the
// same shape FilesetResolver itself validates internally to pick a SIMD
// vs non-SIMD asset pair. WebAssembly.validate never executes the module,
// it only checks the engine recognizes the encoding, so this is a cheap
// synchronous capability probe.
const SIMD_TEST_MODULE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1,
  8, 0, 65, 0, 253, 15, 253, 98, 11,
]);

/**
 * Prompt 231a (R1): pure, unit-testable SIMD feature-detect used only to
 * annotate the landmarker load-failure log (simdSupported below). Never
 * throws; any unsupported environment (no WebAssembly, no validate) reads
 * as false rather than crashing the flow.
 */
export function detectWasmSimd(): boolean {
  try {
    return (
      typeof WebAssembly !== 'undefined' &&
      typeof WebAssembly.validate === 'function' &&
      WebAssembly.validate(SIMD_TEST_MODULE)
    );
  } catch {
    return false;
  }
}

/** Shared budget for the whole GPU-then-CPU init sequence (see
 * loadPoseLandmarkerWithFallback's header comment for why this is one
 * shared window rather than one timeout per attempt). */
export const POSE_LANDMARKER_INIT_TIMEOUT_MS = 8000;

/** detectForVideo throttle floor: 1000ms / 12fps = 83.3ms, rounded down to
 * 80ms per the spec's "about 12fps, throttled to 80ms between calls". */
export const DETECT_VIDEO_MIN_INTERVAL_MS = 80;

export type PoseLandmarkerDelegate = 'GPU' | 'CPU';
export type PoseLandmarkerMode = 'landmarker' | 'weak';

/**
 * The narrow structural surface of a real @mediapipe/tasks-vision
 * PoseLandmarker this module depends on. Deliberately minimal (not the
 * full PoseLandmarker class) so tests can satisfy it with a plain object,
 * no real WASM involved.
 */
export interface PoseLandmarkerLike {
  detectForVideo(image: unknown, timestampMs: number): { landmarks: MediaPipeNormalizedLandmark[][] };
  close(): void;
}

/** Matches @mediapipe/tasks-vision's NormalizedLandmark. Note: this
 * package version has no `presence` field on NormalizedLandmark (only
 * Landmark, the world-coordinates variant, does not either); toQaLandmarks
 * below mirrors visibility into qa.ts's `presence` slot rather than
 * fabricating an unrelated number, since qa.ts only ever reads
 * `visibility` (see src/lib/scan/landmarks.ts's vis()). */
export interface MediaPipeNormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export function toQaLandmarks(mpLandmarks: readonly MediaPipeNormalizedLandmark[]): Landmark[] {
  return mpLandmarks.map((lm) => {
    const visibility = lm.visibility ?? 0;
    return { x: lm.x, y: lm.y, z: lm.z, visibility, presence: visibility };
  });
}

/**
 * Dynamically imports @mediapipe/tasks-vision and creates a VIDEO-mode
 * PoseLandmarker per spec Section 10. Self-hosted assets ONLY
 * (MEDIAPIPE_WASM_BASE_PATH / MEDIAPIPE_MODEL_ASSET_PATH above); this
 * function never constructs a URL outside /mediapipe/*.
 */
export async function createPoseLandmarker(
  delegate: PoseLandmarkerDelegate = 'GPU',
): Promise<PoseLandmarkerLike> {
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE_PATH);
  const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: MEDIAPIPE_MODEL_ASSET_PATH,
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
  });
  return landmarker as unknown as PoseLandmarkerLike;
}

export type PoseLandmarkerLoadResult =
  | { ok: true; instance: PoseLandmarkerLike; delegate: PoseLandmarkerDelegate }
  | { ok: false; reason: string };

async function attemptGpuThenCpu(
  create: (delegate: PoseLandmarkerDelegate) => Promise<PoseLandmarkerLike>,
): Promise<{ instance: PoseLandmarkerLike; delegate: PoseLandmarkerDelegate }> {
  try {
    const instance = await create('GPU');
    return { instance, delegate: 'GPU' };
  } catch (gpuError) {
    safeLog.warn(LOG_SCOPE, 'GPU delegate init failed, falling back to CPU', { error: gpuError });
    const instance = await create('CPU');
    return { instance, delegate: 'CPU' };
  }
}

/**
 * Pure, injectable fallback decision: tries GPU, falls back to CPU on a
 * GPU throw, and NEVER throws itself, resolving to weak mode ({ ok: false })
 * for any failure shape (asset 404, unsupported WASM, GPU and CPU both
 * failing, or a timeout).
 *
 * The whole GPU-then-CPU sequence shares ONE timeout window
 * (POSE_LANDMARKER_INIT_TIMEOUT_MS by default), not one timeout per
 * attempt. That is a deliberate tradeoff: a hung (never-throwing) GPU init
 * would otherwise burn a second full timeout window before the CPU
 * fallback even started, more than doubling the worst-case wait before the
 * flow degrades to weak QA. A hung GPU init here still correctly resolves
 * to weak mode within the single bound; the CPU delegate is simply never
 * attempted in that specific case (see the "hangs past the timeout" test
 * in usePoseLandmarker.fallback.test.ts).
 *
 * `create` defaults to the real createPoseLandmarker; tests inject a fake
 * so no real @mediapipe/tasks-vision / WASM code runs under vitest's node
 * environment.
 */
export async function loadPoseLandmarkerWithFallback(
  create: (delegate: PoseLandmarkerDelegate) => Promise<PoseLandmarkerLike> = createPoseLandmarker,
  timeoutMs: number = POSE_LANDMARKER_INIT_TIMEOUT_MS,
): Promise<PoseLandmarkerLoadResult> {
  try {
    const { instance, delegate } = await withTimeout(
      attemptGpuThenCpu(create),
      timeoutMs,
      'scan.usePoseLandmarker.init',
    );
    return { ok: true, instance, delegate };
  } catch (error) {
    safeLog.error(LOG_SCOPE, 'PoseLandmarker init failed (GPU and CPU, or timed out); falling back to weak QA mode', {
      error,
      simdSupported: detectWasmSimd(),
    });
    return { ok: false, reason: error instanceof Error ? error.message : 'unknown init failure' };
  }
}

/** Pure throttle decision for detectVideo: true means "skip this call, too
 * soon since the last one". lastCallMs === null means no prior call, so
 * never throttled. */
export function shouldThrottleDetect(
  lastCallMs: number | null,
  nowMs: number,
  minIntervalMs: number = DETECT_VIDEO_MIN_INTERVAL_MS,
): boolean {
  if (lastCallMs === null) return false;
  return nowMs - lastCallMs < minIntervalMs;
}

export interface UsePoseLandmarkerResult {
  /** True once the load attempt has settled, whichever way (landmarker or weak). */
  ready: boolean;
  mode: PoseLandmarkerMode;
  /** ARMED/COUNT live pre-check only, per the caller's phase gating; this
   * hook does not itself know the capture phase. Throttled internally to
   * about 12fps (>= DETECT_VIDEO_MIN_INTERVAL_MS between calls); a call
   * inside the throttle window returns null without touching the WASM
   * runtime. Returns null (never throws) when not ready, in weak mode, or
   * on any detectForVideo error. */
  detectVideo(video: HTMLVideoElement, timestampMs: number): Landmark[] | null;
  /** CAPTURE shot QA only. Never throttled (one call per captured still).
   * Returns null (never throws) when not ready, in weak mode, or on any
   * detection error. */
  detectStill(canvas: HTMLCanvasElement): Landmark[] | null;
  dispose(): void;
}

/**
 * Lazily creates the landmarker once `enabled` goes true (ScanExperience
 * passes `enabled: Boolean(camera.stream)`, so loading only starts once the
 * camera stream is live, never before). Load failure of any kind degrades
 * to weak mode; this hook never throws into the render tree.
 */
export function usePoseLandmarker({ enabled = false }: { enabled?: boolean } = {}): UsePoseLandmarkerResult {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<PoseLandmarkerMode>('weak');
  const instanceRef = useRef<PoseLandmarkerLike | null>(null);
  const loadStartedRef = useRef(false);
  const lastDetectWallClockRef = useRef<number | null>(null);

  // MediaPipe VIDEO mode requires a strictly monotonically increasing
  // timestamp across every detectForVideo call made on the SAME instance.
  // Live detectVideo() calls and the shot-QA detectStill() call below both
  // run against this one shared instance (see the IMAGE-vs-VIDEO choice
  // comment on detectStill), and the caller may reasonably use different
  // clock sources across the two (a rAF loop's frame timestamp vs.
  // Date.now() at capture time). Rather than trust the caller's raw value,
  // every call here goes through nextTimestamp(), which bumps it forward
  // past whatever was last used. This is the single source of truth for
  // monotonicity, independent of which clock the caller sampled from.
  const lastMpTimestampRef = useRef(0);
  const nextTimestamp = useCallback((candidateMs: number): number => {
    const next = Math.max(Math.floor(candidateMs), lastMpTimestampRef.current + 1);
    lastMpTimestampRef.current = next;
    return next;
  }, []);

  useEffect(() => {
    if (!enabled || loadStartedRef.current) return;
    loadStartedRef.current = true;
    let cancelled = false;

    void loadPoseLandmarkerWithFallback().then((result) => {
      if (cancelled) {
        if (result.ok) result.instance.close();
        return;
      }
      if (result.ok) {
        instanceRef.current = result.instance;
        setMode('landmarker');
      } else {
        setMode('weak');
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Release the WASM instance on unmount even if the caller never calls
  // dispose() itself.
  useEffect(() => {
    return () => {
      instanceRef.current?.close();
      instanceRef.current = null;
    };
  }, []);

  const detectVideo = useCallback(
    (video: HTMLVideoElement, timestampMs: number): Landmark[] | null => {
      const instance = instanceRef.current;
      if (!instance) return null;
      const now = Date.now();
      if (shouldThrottleDetect(lastDetectWallClockRef.current, now)) return null;
      lastDetectWallClockRef.current = now;
      try {
        const result = instance.detectForVideo(video, nextTimestamp(timestampMs));
        const first = result.landmarks[0];
        return first ? toQaLandmarks(first) : null;
      } catch (error) {
        safeLog.error(LOG_SCOPE, 'detectVideo failed; treating this frame as no detection', { error });
        return null;
      }
    },
    [nextTimestamp],
  );

  const detectStill = useCallback(
    (canvas: HTMLCanvasElement): Landmark[] | null => {
      const instance = instanceRef.current;
      if (!instance) return null;
      try {
        // IMAGE-vs-VIDEO choice for shot QA: this reuses the single
        // VIDEO-mode instance (via detectForVideo with a fresh monotonic
        // timestamp from nextTimestamp()) rather than standing up a second
        // IMAGE-mode PoseLandmarker. A second instance would double the
        // WASM + model memory footprint and pay its own multi-second init
        // cost for what is a single one-shot call per captured pose; on a
        // resource-constrained mobile device that cost is not worth paying
        // twice. nextTimestamp() guarantees the value passed here is
        // strictly greater than any prior detectVideo() call regardless of
        // clock source, satisfying VIDEO mode's monotonicity requirement.
        const result = instance.detectForVideo(canvas, nextTimestamp(Date.now()));
        const first = result.landmarks[0];
        return first ? toQaLandmarks(first) : null;
      } catch (error) {
        safeLog.error(LOG_SCOPE, 'detectStill failed; treating this still as no detection', { error });
        return null;
      }
    },
    [nextTimestamp],
  );

  const dispose = useCallback(() => {
    instanceRef.current?.close();
    instanceRef.current = null;
    setReady(false);
    setMode('weak');
  }, []);

  return { ready, mode, detectVideo, detectStill, dispose };
}
