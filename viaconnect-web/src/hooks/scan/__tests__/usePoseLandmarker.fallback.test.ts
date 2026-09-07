// Prompt 231 Task 11b: usePoseLandmarker fallback-decision coverage.
//
// No jsdom in this repo (vitest runs environment: 'node', see
// vitest.config.ts and useCamera.contract.test.ts's header for the
// established convention), so the actual usePoseLandmarker() hook (React
// state/refs/effects driving a real <video>/<canvas> and the real WASM
// runtime) cannot be rendered or exercised here. Real MediaPipe inference
// against real video/canvas frames is NOT covered by this suite; that is
// deferred to Playwright and the manual device matrix (see the Task 11b
// report).
//
// What IS unit-tested, honestly and without a DOM: the pure fallback
// decision loadPoseLandmarkerWithFallback (GPU-throws-then-CPU, both throw,
// and INIT timeout, all via an injected `create` function so no real
// @mediapipe/tasks-vision code runs), plus the pure throttle and
// landmark-conversion helpers the hook wires the real DOM calls through.
// createPoseLandmarker's own asset-path wiring (condition 12: self-hosted
// /mediapipe/* only, never a CDN) is covered separately below via
// vi.mock('@mediapipe/tasks-vision', ...), which Vitest also intercepts for
// dynamic import() calls.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadPoseLandmarkerWithFallback,
  shouldThrottleDetect,
  toQaLandmarks,
  DETECT_VIDEO_MIN_INTERVAL_MS,
  POSE_LANDMARKER_INIT_TIMEOUT_MS,
  type PoseLandmarkerLike,
} from '../usePoseLandmarker';
import { MEDIAPIPE_ASSET_VERSION } from '@/lib/scan/mediapipeVersion';

function fakeInstance(): PoseLandmarkerLike {
  return {
    detectForVideo: vi.fn(() => ({ landmarks: [] })),
    close: vi.fn(),
  };
}

describe('loadPoseLandmarkerWithFallback', () => {
  it('resolves with the GPU instance when GPU init succeeds, and never attempts CPU', async () => {
    const gpuInstance = fakeInstance();
    const create = vi.fn(async (delegate: 'GPU' | 'CPU') => {
      expect(delegate).toBe('GPU');
      return gpuInstance;
    });

    const result = await loadPoseLandmarkerWithFallback(create, 1000);

    expect(result).toEqual({ ok: true, instance: gpuInstance, delegate: 'GPU' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith('GPU');
  });

  it('falls back to CPU when GPU init throws, and resolves with the CPU instance', async () => {
    const cpuInstance = fakeInstance();
    const calls: Array<'GPU' | 'CPU'> = [];
    const create = vi.fn(async (delegate: 'GPU' | 'CPU') => {
      calls.push(delegate);
      if (delegate === 'GPU') throw new Error('WebGL context creation failed');
      return cpuInstance;
    });

    const result = await loadPoseLandmarkerWithFallback(create, 1000);

    expect(result).toEqual({ ok: true, instance: cpuInstance, delegate: 'CPU' });
    expect(calls).toEqual(['GPU', 'CPU']);
  });

  it('resolves to weak mode (ok: false) without throwing when both GPU and CPU init throw', async () => {
    const create = vi.fn(async (delegate: 'GPU' | 'CPU') => {
      throw new Error(`${delegate} init failed`);
    });

    const result = await loadPoseLandmarkerWithFallback(create, 1000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('CPU init failed');
    }
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('resolves to weak mode (ok: false) without throwing when an asset load throws before any delegate branch (e.g. a 404 on /mediapipe/wasm)', async () => {
    const create = vi.fn(async () => {
      throw new Error('Failed to fetch /mediapipe/wasm/vision_wasm_internal.wasm: 404');
    });

    await expect(loadPoseLandmarkerWithFallback(create, 1000)).resolves.toMatchObject({ ok: false });
  });

  it('resolves to weak mode (ok: false) without throwing when init hangs past the timeout, and never reaches the CPU attempt', async () => {
    vi.useFakeTimers();
    try {
      const create = vi.fn(() => new Promise<PoseLandmarkerLike>(() => {})); // never settles

      const pending = loadPoseLandmarkerWithFallback(create, 50);
      await vi.advanceTimersByTimeAsync(50);
      const result = await pending;

      expect(result.ok).toBe(false);
      // The shared 8s-style budget bounds the whole GPU+CPU sequence, not
      // each attempt individually: a hung GPU init exhausts the timeout
      // before the CPU fallback is ever attempted, so this only ever calls
      // create() once. See the file header comment on
      // loadPoseLandmarkerWithFallback for why that tradeoff was chosen.
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never throws, for any failure shape', async () => {
    const throwers = [
      () => Promise.reject(new Error('sync-ish rejection')),
      () => {
        throw new TypeError('WASM SIMD unsupported');
      },
    ];
    for (const thrower of throwers) {
      const create = vi.fn(async () => {
        return thrower() as unknown as Promise<PoseLandmarkerLike>;
      });
      await expect(loadPoseLandmarkerWithFallback(create, 1000)).resolves.toMatchObject({ ok: false });
    }
  });

  it('uses the exported 8 second default init timeout constant', () => {
    expect(POSE_LANDMARKER_INIT_TIMEOUT_MS).toBe(8000);
  });
});

describe('shouldThrottleDetect', () => {
  it('does not throttle the first call (no prior timestamp)', () => {
    expect(shouldThrottleDetect(null, 1000, DETECT_VIDEO_MIN_INTERVAL_MS)).toBe(false);
  });

  it('throttles a call less than 80ms after the last one', () => {
    expect(shouldThrottleDetect(1000, 1050, DETECT_VIDEO_MIN_INTERVAL_MS)).toBe(true);
  });

  it('allows a call exactly 80ms after the last one (about 12fps)', () => {
    expect(shouldThrottleDetect(1000, 1080, DETECT_VIDEO_MIN_INTERVAL_MS)).toBe(false);
  });

  it('allows a call well past the 80ms floor', () => {
    expect(shouldThrottleDetect(1000, 1500, DETECT_VIDEO_MIN_INTERVAL_MS)).toBe(false);
  });

  it('exports the throttle floor as 80ms (about 12fps)', () => {
    expect(DETECT_VIDEO_MIN_INTERVAL_MS).toBe(80);
  });
});

describe('toQaLandmarks', () => {
  it('maps MediaPipe NormalizedLandmark[] (x, y, z, visibility) to the qa.ts Landmark shape, mirroring presence from visibility', () => {
    const mpLandmarks = [
      { x: 0.5, y: 0.4, z: -0.1, visibility: 0.9 },
      { x: 0.6, y: 0.3, z: 0.05, visibility: 0.2 },
    ];

    const result = toQaLandmarks(mpLandmarks);

    expect(result).toEqual([
      { x: 0.5, y: 0.4, z: -0.1, visibility: 0.9, presence: 0.9 },
      { x: 0.6, y: 0.3, z: 0.05, visibility: 0.2, presence: 0.2 },
    ]);
  });

  it('defaults a missing visibility to 0 rather than throwing', () => {
    const mpLandmarks = [{ x: 0, y: 0, z: 0, visibility: undefined as unknown as number }];
    const result = toQaLandmarks(mpLandmarks);
    expect(result[0]).toEqual({ x: 0, y: 0, z: 0, visibility: 0, presence: 0 });
  });

  it('returns an empty array for an empty input', () => {
    expect(toQaLandmarks([])).toEqual([]);
  });
});

describe('createPoseLandmarker asset paths (condition 12: self-hosted /mediapipe/* only, never a CDN)', () => {
  const forVisionTasks = vi.fn(async (basePath: string) => ({ basePath }));
  const createFromOptions = vi.fn(async (_fileset: unknown, options: Record<string, unknown>) => ({
    options,
    detectForVideo: vi.fn(),
    close: vi.fn(),
  }));

  beforeEach(() => {
    forVisionTasks.mockClear();
    createFromOptions.mockClear();
    vi.doMock('@mediapipe/tasks-vision', () => ({
      FilesetResolver: { forVisionTasks },
      PoseLandmarker: { createFromOptions },
    }));
  });

  afterEach(() => {
    vi.doUnmock('@mediapipe/tasks-vision');
    vi.resetModules();
  });

  it('points FilesetResolver at the versioned /mediapipe/<version>/wasm and model paths, with no CDN URL anywhere', async () => {
    vi.resetModules();
    const { createPoseLandmarker } = await import('../usePoseLandmarker');

    await createPoseLandmarker('GPU');

    expect(forVisionTasks).toHaveBeenCalledWith(`/mediapipe/${MEDIAPIPE_ASSET_VERSION}/wasm`);
    const optionsArg = createFromOptions.mock.calls[0]?.[1] as {
      baseOptions: { modelAssetPath: string; delegate: string };
      runningMode: string;
      numPoses: number;
      minPoseDetectionConfidence: number;
      minTrackingConfidence: number;
      minPosePresenceConfidence: number;
    };
    expect(optionsArg.baseOptions.modelAssetPath).toBe(
      `/mediapipe/${MEDIAPIPE_ASSET_VERSION}/pose_landmarker_lite.task`,
    );
    expect(optionsArg.baseOptions.delegate).toBe('GPU');
    expect(optionsArg.runningMode).toBe('VIDEO');
    expect(optionsArg.numPoses).toBe(1);
    expect(optionsArg.minPoseDetectionConfidence).toBe(0.5);
    expect(optionsArg.minTrackingConfidence).toBe(0.5);
    expect(optionsArg.minPosePresenceConfidence).toBe(0.5);

    const serialized = JSON.stringify([forVisionTasks.mock.calls, createFromOptions.mock.calls]);
    expect(serialized).not.toMatch(/https?:\/\//i);
    expect(serialized.toLowerCase()).not.toContain('cdn');
  });

  it('passes CPU delegate through when requested', async () => {
    vi.resetModules();
    const { createPoseLandmarker } = await import('../usePoseLandmarker');

    await createPoseLandmarker('CPU');

    const optionsArg = createFromOptions.mock.calls[0]?.[1] as { baseOptions: { delegate: string } };
    expect(optionsArg.baseOptions.delegate).toBe('CPU');
  });
});

describe('createImagePoseLandmarker asset paths (IMAGE mode, same self-hosted /mediapipe/*)', () => {
  const forVisionTasks = vi.fn(async (basePath: string) => ({ basePath }));
  const createFromOptions = vi.fn(async (_fileset: unknown, options: Record<string, unknown>) => ({
    options,
    detect: vi.fn(),
    close: vi.fn(),
  }));

  beforeEach(() => {
    forVisionTasks.mockClear();
    createFromOptions.mockClear();
    vi.doMock('@mediapipe/tasks-vision', () => ({
      FilesetResolver: { forVisionTasks },
      PoseLandmarker: { createFromOptions },
    }));
  });

  afterEach(() => {
    vi.doUnmock('@mediapipe/tasks-vision');
    vi.resetModules();
  });

  it('uses IMAGE runningMode and the same versioned wasm/model paths as VIDEO, never a CDN', async () => {
    vi.resetModules();
    const { createImagePoseLandmarker } = await import('../usePoseLandmarker');

    await createImagePoseLandmarker('GPU');

    expect(forVisionTasks).toHaveBeenCalledWith(`/mediapipe/${MEDIAPIPE_ASSET_VERSION}/wasm`);
    const optionsArg = createFromOptions.mock.calls[0]?.[1] as {
      baseOptions: { modelAssetPath: string; delegate: string };
      runningMode: string;
      numPoses: number;
    };
    expect(optionsArg.baseOptions.modelAssetPath).toBe(
      `/mediapipe/${MEDIAPIPE_ASSET_VERSION}/pose_landmarker_lite.task`,
    );
    expect(optionsArg.baseOptions.delegate).toBe('GPU');
    expect(optionsArg.runningMode).toBe('IMAGE');
    expect(optionsArg.numPoses).toBe(1);

    const serialized = JSON.stringify([forVisionTasks.mock.calls, createFromOptions.mock.calls]);
    expect(serialized).not.toMatch(/https?:\/\//i);
    expect(serialized.toLowerCase()).not.toContain('cdn');
  });
});
