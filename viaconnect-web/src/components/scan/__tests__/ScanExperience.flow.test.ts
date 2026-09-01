/**
 * Bare state-driven coverage for the flow ScanExperience drives.
 *
 * ScanExperience itself wires React hooks to real DOM APIs (getUserMedia,
 * canvas, speechSynthesis, requestAnimationFrame) that do not exist under
 * vitest's node environment (no jsdom in this repo; see the other
 * __tests__/*.bare.test.tsx files for the established renderToStaticMarkup
 * convention). So this suite drives the same pure pieces ScanExperience
 * calls from its event handlers and effects directly:
 *   - scanReducer / initialScanState (the state machine ScanExperience
 *     dispatches into)
 *   - qaResultToAction (how a QA verdict becomes a dispatched action)
 *   - revokeFrame / revokeAllFrames (the object URL lifecycle contract)
 *
 * A scripted QA-result sequence is fed through the reducer exactly the way
 * ScanExperience's CAPTURE effect would (CAPTURED, then QA_PASS/QA_FAIL),
 * asserting the resulting phase transitions match spec Section 7. Real DOM
 * wiring (camera acquisition, canvas grabStill, speech, countdown timers,
 * button click handlers) is NOT covered here; it is deferred to Playwright
 * and the manual device matrix per the plan's Task 10/15 split. That gap is
 * intentional, not an oversight: see the Task 10 report for the full list.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { scanReducer, initialScanState, type ScanState } from '@/hooks/scan/useScanSession';
import { SCAN_ORIENTATION_UNAVAILABLE_MS, SCAN_POSE_TITLE_MS } from '@/lib/scan/scanTimeouts';
import { evaluateWeakFrame, evaluatePose } from '@/lib/scan/qa';
import { evaluateCapturedStill } from '@/lib/scan/evaluateCapturedStill';
import { noteCountdownAbortSample, createCountdownAbortTracker } from '@/lib/scan/countdownAbort';
import { revokeFrame, revokeAllFrames, qaResultToAction, capturedStillVerdictToAction } from '@/lib/scan/scanFlowDriver';
import type { Landmark, ScanFrame } from '@/lib/scan/types';
import type { PoseId } from '@/lib/scan/poses';

function makeFrame(pose: PoseId, objectUrl: string, pass: boolean, retryCount = 0): ScanFrame {
  const qa = pass
    ? evaluateWeakFrame({ luminanceVariance: 500, exposure: 0.5, blurScore: 500 })
    : evaluateWeakFrame({ luminanceVariance: 0, exposure: 0.5, blurScore: 500 });
  return {
    pose,
    blob: new Blob(['x'], { type: 'image/jpeg' }),
    objectUrl,
    capturedAt: new Date('2026-08-29T00:00:00Z').toISOString(),
    qa,
    retryCount,
    capturedWidth: 1080,
    capturedHeight: 1920,
  };
}

// Monotonic counter so every captured frame in this suite gets a distinct
// objectUrl, independent of retryCount (which the reducer legitimately
// resets to the same value across a retake).
let captureSeq = 0;

/** Drive one pose attempt (PROMPT -> ARMED -> COUNT(5..0) -> CAPTURE -> QA)
 * through the reducer exactly as ScanExperience's effects would, using the
 * scripted `pass` outcome for the captured still. */
function driveOnePose(state: ScanState, pose: PoseId, pass: boolean): ScanState {
  let s = state;
  expect(s.phase).toBe('PROMPT');
  s = scanReducer(s, { type: 'PROMPT_DONE' });
  expect(s.phase).toBe('ARMED');
  s = scanReducer(s, { type: 'PRECHECK_PASS' }); // weak precheck always passes pre-Task-11
  expect(s.phase).toBe('COUNT');
  expect(s.count).toBe(5);
  // Prompt 231: COUNT_SET tracks the displayed digit; only COUNT_DONE
  // (time-based onComplete) flips the phase to CAPTURE.
  s = scanReducer(s, { type: 'COUNT_SET', display: 1 });
  expect(s.phase).toBe('COUNT');
  expect(s.count).toBe(1);
  s = scanReducer(s, { type: 'COUNT_DONE' });
  expect(s.phase).toBe('CAPTURE');
  expect(s.count).toBe(0);

  const frame = makeFrame(pose, `blob:${pose}-attempt-${captureSeq++}`, pass, s.retryCount);
  s = scanReducer(s, { type: 'CAPTURED', frame });
  expect(s.phase).toBe('QA');

  s = scanReducer(s, qaResultToAction(frame.qa));
  return s;
}

describe('ScanExperience flow driver: happy path with one three-fail skip', () => {
  it('walks SETUP through REVIEW, skipping the pose that fails QA three times', () => {
    let s = initialScanState();
    expect(s.phase).toBe('SETUP');

    s = scanReducer(s, { type: 'START' });
    expect(s.phase).toBe('WALK_IN');
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    expect(s.phase).toBe('PROMPT');

    // front: passes first try
    s = driveOnePose(s, 'front', true);
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(1);
    expect(s.frames[0]?.qa.pass).toBe(true);

    // right: fails three times, subject chooses Skip
    s = driveOnePose(s, 'right', false);
    expect(s.phase).toBe('PROMPT'); // retry 1
    expect(s.retryCount).toBe(1);
    s = driveOnePose(s, 'right', false);
    expect(s.phase).toBe('PROMPT'); // retry 2
    expect(s.retryCount).toBe(2);
    s = driveOnePose(s, 'right', false);
    expect(s.phase).toBe('CHOICE'); // third failure
    expect(s.retryCount).toBe(3);

    s = scanReducer(s, { type: 'CHOOSE_SKIP' });
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(2);
    expect(s.frames[1]?.skipped).toBe(true);
    expect(s.frames[1]?.objectUrl).toBe('');

    // back: passes first try
    s = driveOnePose(s, 'back', true);
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(3);

    // left: passes first try -> last pose -> REVIEW
    s = driveOnePose(s, 'left', true);
    expect(s.phase).toBe('REVIEW');

    expect(s.frames.map((f) => f?.pose)).toEqual(['front', 'right', 'back', 'left']);
    expect(s.frames.map((f) => f?.skipped ?? false)).toEqual([false, true, false, false]);
  });
});

describe('ScanExperience flow driver: COUNT abort hysteresis', () => {
  it('a single mid-count fail sample does not abort; a sustained streak does', () => {
    const first = noteCountdownAbortSample(createCountdownAbortTracker(), false, 0);
    expect(first.shouldAbort).toBe(false);
    let tracker = first.tracker;
    let shouldAbort = false;
    for (let i = 1; i < 4; i += 1) {
      const noted = noteCountdownAbortSample(tracker, false, i * 80);
      tracker = noted.tracker;
      shouldAbort = noted.shouldAbort;
    }
    expect(shouldAbort).toBe(true);
  });
});

describe('ScanExperience flow driver: live pre-check failure mid count resets to ARMED', () => {
  it('PRECHECK_FAIL during COUNT discards the in-flight count and reads Hold still', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    expect(s.phase).toBe('COUNT');
    s = scanReducer(s, { type: 'COUNT_SET', display: 4 }); // count 5 -> 4
    expect(s.count).toBe(4);

    s = scanReducer(s, { type: 'PRECHECK_FAIL' });
    expect(s.phase).toBe('ARMED');
    expect(s.count).toBe(5);
    expect(s.error).toBe('Hold still.');
  });
});

describe('ScanExperience flow driver: countdown zero cannot reset to pose 1 without a capture outcome', () => {
  function toFrontCount(): ScanState {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    expect(s.phase).toBe('COUNT');
    expect(s.poseIndex).toBe(0);
    return s;
  }

  it('alignment fail at count 0 does not return to Front COUNT; COUNT_DONE still captures and QA_PASS advances to Right', () => {
    let s = toFrontCount();
    s = scanReducer(s, { type: 'COUNT_SET', display: 0 });
    expect(s.phase).toBe('COUNT');
    expect(s.count).toBe(0);

    // "Step onto the mark" / live abort at shutter: guidance only.
    s = scanReducer(s, { type: 'PRECHECK_FAIL' });
    expect(s.phase).toBe('COUNT');
    expect(s.poseIndex).toBe(0);
    expect(s.frames[0]).toBeNull();

    s = scanReducer(s, { type: 'COUNT_DONE' });
    expect(s.phase).toBe('CAPTURE');
    expect(s.poseIndex).toBe(0);

    const frame = makeFrame('front', `blob:front-held-${captureSeq++}`, true, s.retryCount);
    s = scanReducer(s, { type: 'CAPTURED', frame });
    expect(s.phase).toBe('QA');
    expect(s.frames[0]?.objectUrl).toBe(frame.objectUrl);

    s = scanReducer(s, qaResultToAction(frame.qa));
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(1);
    expect(s.frames[0]?.qa.pass).toBe(true);
  });

  it('COUNT_DONE then CAMERA_LOST is a capture-attempt outcome; poseIndex does not silently return to a new Front COUNT', () => {
    let s = toFrontCount();
    s = scanReducer(s, { type: 'COUNT_DONE' });
    expect(s.phase).toBe('CAPTURE');

    s = scanReducer(s, { type: 'CAMERA_LOST' });
    expect(s.phase).toBe('CAMERA_LOST');
    expect(s.poseIndex).toBe(0);
    expect(s.frames[0]).toBeNull();

    // Recovery is explicit RESET to SETUP, not a silent Front countdown restart.
    s = scanReducer(s, { type: 'RESET' });
    expect(s.phase).toBe('SETUP');
    expect(s.poseIndex).toBe(0);
  });
});

describe('ScanExperience flow driver: CAPTURE still QA must not silently re-COUNT the same pose', () => {
  const frontPassLandmarks = (
    JSON.parse(
      readFileSync(join(__dirname, '../../../lib/scan/__fixtures__/front_pass.json'), 'utf8'),
    ) as { landmarks: Landmark[] }
  ).landmarks;

  const usableMetrics = { luminanceVariance: 500, exposure: 0.5, blurScore: 500 };
  const blackMetrics = { luminanceVariance: 0, exposure: 0, blurScore: 0 };

  function toFrontCapture(): ScanState {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'COUNT_DONE' });
    expect(s.phase).toBe('CAPTURE');
    expect(s.poseIndex).toBe(0);
    return s;
  }

  function frameFromVerdict(pose: PoseId, objectUrl: string, qa: ScanFrame['qa'], retryCount: number): ScanFrame {
    return {
      pose,
      blob: new Blob(['x'], { type: 'image/jpeg' }),
      objectUrl,
      capturedAt: new Date('2026-08-29T00:00:00Z').toISOString(),
      qa,
      retryCount,
      capturedWidth: 1080,
      capturedHeight: 1920,
    };
  }

  it('legacy evaluatePose(null) would re-PROMPT Front; live-video fallback advances to Right', () => {
    const legacy = evaluatePose({
      landmarks: null,
      pose: 'front',
      frameWidth: 1080,
      frameHeight: 1920,
      blurScore: usableMetrics.blurScore,
    });
    expect(legacy.code).toBe('NO_BODY');

    let looped = toFrontCapture();
    looped = scanReducer(looped, {
      type: 'CAPTURED',
      frame: frameFromVerdict('front', `blob:legacy-${captureSeq++}`, legacy, looped.retryCount),
    });
    looped = scanReducer(looped, qaResultToAction(legacy));
    expect(looped.phase).toBe('PROMPT');
    expect(looped.poseIndex).toBe(0);
    expect(looped.frames[0]).toBeNull();

    const verdict = evaluateCapturedStill({
      stillLandmarks: null,
      liveLandmarks: frontPassLandmarks,
      metrics: usableMetrics,
      pose: 'front',
      frameWidth: 1080,
      frameHeight: 1920,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind !== 'qa') throw new Error('expected qa verdict');
    expect(verdict.qa.pass).toBe(true);

    let s = toFrontCapture();
    s = scanReducer(s, {
      type: 'CAPTURED',
      frame: frameFromVerdict('front', `blob:live-fallback-${captureSeq++}`, verdict.qa, s.retryCount),
    });
    s = scanReducer(s, capturedStillVerdictToAction(verdict));
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(1);
    expect(s.frames[0]?.qa.pass).toBe(true);
  });

  it('null detectStill + passing weak-frame metrics keeps the still and advances Front → Right', () => {
    const verdict = evaluateCapturedStill({
      stillLandmarks: null,
      liveLandmarks: null,
      metrics: usableMetrics,
      pose: 'front',
      frameWidth: 1080,
      frameHeight: 1920,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind !== 'qa') throw new Error('expected qa verdict');
    expect(verdict.qa.pass).toBe(true);
    expect(verdict.qa.mode).toBe('weak');

    let s = toFrontCapture();
    s = scanReducer(s, {
      type: 'CAPTURED',
      frame: frameFromVerdict('front', `blob:weak-fallback-${captureSeq++}`, verdict.qa, s.retryCount),
    });
    s = scanReducer(s, capturedStillVerdictToAction(verdict));
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(1);
    expect(s.frames[0]?.qa.pass).toBe(true);
    expect(s.retryCount).toBe(0);
  });

  it('still-only BLURRY after shutter keeps the frame and advances Front → Right', () => {
    const blurryMetrics = { luminanceVariance: 500, exposure: 0.5, blurScore: 1 };
    const verdict = evaluateCapturedStill({
      stillLandmarks: frontPassLandmarks,
      liveLandmarks: null,
      metrics: blurryMetrics,
      pose: 'front',
      frameWidth: 1080,
      frameHeight: 1920,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind !== 'qa') throw new Error('expected qa verdict');
    expect(verdict.qa.pass).toBe(true);

    let s = toFrontCapture();
    s = scanReducer(s, {
      type: 'CAPTURED',
      frame: frameFromVerdict('front', `blob:blur-keep-${captureSeq++}`, verdict.qa, s.retryCount),
    });
    s = scanReducer(s, capturedStillVerdictToAction(verdict));
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(1);
    expect(s.frames[0]?.qa.pass).toBe(true);
    expect(s.retryCount).toBe(0);
    expect(s.phase).not.toBe('COUNT');
  });

  it('hard still fail (ARMS_IN) shows a fail beat on PROMPT, not a silent same-pose COUNT', () => {
    const armsInLandmarks = (
      JSON.parse(
        readFileSync(join(__dirname, '../../../lib/scan/__fixtures__/any_arms_in.json'), 'utf8'),
      ) as { landmarks: Landmark[] }
    ).landmarks;
    const verdict = evaluateCapturedStill({
      stillLandmarks: armsInLandmarks,
      liveLandmarks: frontPassLandmarks,
      metrics: usableMetrics,
      pose: 'front',
      frameWidth: 1080,
      frameHeight: 1920,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind !== 'qa') throw new Error('expected qa verdict');
    expect(verdict.qa.pass).toBe(false);
    expect(verdict.qa.code).toBe('ARMS_IN');

    let s = toFrontCapture();
    s = scanReducer(s, {
      type: 'CAPTURED',
      frame: frameFromVerdict('front', `blob:arms-fail-${captureSeq++}`, verdict.qa, s.retryCount),
    });
    s = scanReducer(s, capturedStillVerdictToAction(verdict));
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(0);
    expect(s.lastQaCode).toBe('ARMS_IN');
    expect(s.frames[0]).toBeNull();
    expect(s.retryCount).toBe(1);
    expect(s.phase).not.toBe('COUNT');
    expect(s.phase).not.toBe('ARMED');

    // Fail beat waits for Retry (PROMPT_DONE). No silent re-COUNT.
    expect(s.phase).toBe('PROMPT');
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    expect(s.phase).toBe('ARMED');
    expect(s.lastQaCode).toBe('ARMS_IN');
  });

  it('a third hard still fail lands on CHOICE with Retry/Skip, not another COUNT', () => {
    const armsInLandmarks = (
      JSON.parse(
        readFileSync(join(__dirname, '../../../lib/scan/__fixtures__/any_arms_in.json'), 'utf8'),
      ) as { landmarks: Landmark[] }
    ).landmarks;
    const verdict = evaluateCapturedStill({
      stillLandmarks: armsInLandmarks,
      liveLandmarks: null,
      metrics: usableMetrics,
      pose: 'front',
      frameWidth: 1080,
      frameHeight: 1920,
    });
    expect(verdict.kind).toBe('qa');
    if (verdict.kind !== 'qa') throw new Error('expected qa verdict');

    function failOnce(state: ScanState): ScanState {
      let next = state;
      if (next.phase === 'PROMPT') next = scanReducer(next, { type: 'PROMPT_DONE' });
      if (next.phase === 'ARMED') next = scanReducer(next, { type: 'PRECHECK_PASS' });
      if (next.phase === 'COUNT') next = scanReducer(next, { type: 'COUNT_DONE' });
      next = scanReducer(next, {
        type: 'CAPTURED',
        frame: frameFromVerdict('front', `blob:hard-${captureSeq++}`, verdict.qa, next.retryCount),
      });
      return scanReducer(next, capturedStillVerdictToAction(verdict));
    }

    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = failOnce(s);
    expect(s.phase).toBe('PROMPT');
    expect(s.retryCount).toBe(1);
    s = failOnce(s);
    expect(s.phase).toBe('PROMPT');
    expect(s.retryCount).toBe(2);
    s = failOnce(s);
    expect(s.phase).toBe('CHOICE');
    expect(s.retryCount).toBe(3);
    expect(s.lastQaCode).toBe('ARMS_IN');
    expect(s.phase).not.toBe('COUNT');
  });

  it('black still after shutter is CAMERA_LOST, not QA_FAIL → same-pose PROMPT', () => {
    const verdict = evaluateCapturedStill({
      stillLandmarks: null,
      liveLandmarks: frontPassLandmarks,
      metrics: blackMetrics,
      pose: 'front',
      frameWidth: 1080,
      frameHeight: 1920,
    });
    expect(verdict.kind).toBe('camera_lost');

    let s = toFrontCapture();
    s = scanReducer(s, capturedStillVerdictToAction(verdict));
    expect(s.phase).toBe('CAMERA_LOST');
    expect(s.poseIndex).toBe(0);
    expect(s.frames[0]).toBeNull();
    expect(s.phase).not.toBe('PROMPT');
    expect(s.phase).not.toBe('COUNT');
  });
});

describe('ScanExperience wiring: capture overlay must not remount the video per phase', () => {
  const src = readFileSync(resolve(__dirname, '../ScanExperience.tsx'), 'utf8');

  it('passes the live stream into CameraPreview so a remount rebinds instead of drawing a dead frame', () => {
    expect(src).toContain('stream={camera.stream}');
    expect(src).toContain('canAbortCountdown');
  });

  it('renders one shared CameraPreview for WALK_IN through QA instead of a new video per phase', () => {
    const previewOpens = src.match(/<CameraPreview/g) ?? [];
    // SETUP keeps its own pre-start preview; the live scan uses one shared preview.
    expect(previewOpens.length).toBe(2);
    expect(src).toContain("state.phase === 'WALK_IN'");
    expect(src).toContain("state.phase === 'PROMPT'");
    expect(src).toContain("state.phase === 'ARMED'");
    expect(src).toContain("state.phase === 'COUNT'");
    expect(src).toContain("state.phase === 'CAPTURE'");
    expect(src).toContain("state.phase === 'QA'");
  });

  it('keeps pose how-to until Continue / tap-through, with an 8s hands-free fallback not a 1s yank', () => {
    expect(src).toContain('scan-pose-title-continue');
    expect(src).toContain('scan-pose-instructions');
    expect(src).toContain('SCAN_POSE_TITLE_MS');
    expect(src).toContain('handlePromptDone');
    expect(src).not.toMatch(/PROMPT_DONE' \), 2000\)/);
    expect(SCAN_POSE_TITLE_MS).toBeGreaterThanOrEqual(8000);
  });

  it('still QA uses evaluateCapturedStill so a null detectStill cannot hard-NO_BODY the same pose', () => {
    expect(src).toContain('evaluateCapturedStill');
    expect(src).toContain('isNearBlackStill');
    expect(src).toContain('detectStill(stillCanvas)');
    expect(src).toContain('detectStill(video)');
    expect(src).toContain("verdict.kind === 'camera_lost'");
    expect(src).not.toMatch(/evaluatePose\(\{\s*landmarks:\s*detected/);
  });

  it('COUNT abort uses hysteresis and does not resubscribe the poller on every digit tick', () => {
    expect(src).toContain('noteCountdownAbortSample');
    expect(src).toContain('createCountdownAbortTracker');
    expect(src).toContain('canAbortCountdown(countRef.current)');
    expect(src).toContain('DETECT_VIDEO_MIN_INTERVAL_MS');
    expect(src).not.toMatch(/if \(state\.phase !== 'COUNT' \|\| !landmarkerLive \|\| !canAbortCountdown\(state\.count\)\)/);
    expect(src).not.toMatch(/state\.count, dispatch, camera\.videoRef/);
  });

  it('still-QA fail beat shows Retry and does not auto-advance the pose title timer', () => {
    expect(src).toContain('scan-qa-fail-beat');
    expect(src).toContain('scan-qa-fail-reason');
    expect(src).toContain('scan-qa-fail-retry');
    expect(src).toContain('if (state.lastQaCode) return;');
  });

  it('keeps Orientation unavailable until Continue / tap-through, not ARMED-only 600ms yank', () => {
    expect(src).toContain('scan-orientation-unavailable');
    expect(src).toContain('handleOrientationGateDone');
    expect(src).toContain('SCAN_ORIENTATION_UNAVAILABLE_MS');
    expect(src).toContain('showOrientationUnavailable');
    expect(src).toContain("state.phase === 'COUNT'");
    expect(src).toContain("state.phase === 'CAPTURE'");
    expect(src).toContain("state.phase === 'QA'");
    expect(src).toContain('onDismiss={handleOrientationGateDone}');
    expect(src).not.toContain('pointer-events-none absolute inset-x-0 top-4 flex justify-center');
    expect(SCAN_ORIENTATION_UNAVAILABLE_MS).toBeGreaterThanOrEqual(8000);
    expect(SCAN_ORIENTATION_UNAVAILABLE_MS).toBe(SCAN_POSE_TITLE_MS);
  });
});

describe('ScanExperience flow driver: retake from Review returns to Review', () => {
  it('RETAKE re-runs walk-in for one pose and QA_PASS lands back on Review', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = driveOnePose(s, 'front', true);
    s = driveOnePose(s, 'right', true);
    s = driveOnePose(s, 'back', true);
    s = driveOnePose(s, 'left', true);
    expect(s.phase).toBe('REVIEW');
    const originalRightUrl = s.frames[1]?.objectUrl;

    s = scanReducer(s, { type: 'RETAKE', poseIndex: 1 });
    expect(s.phase).toBe('WALK_IN');
    expect(s.poseIndex).toBe(1);
    expect(s.retakeMode).toBe(true);

    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = driveOnePose(s, 'right', true);
    expect(s.phase).toBe('REVIEW');
    expect(s.retakeMode).toBe(false);
    expect(s.frames[1]?.objectUrl).not.toBe(originalRightUrl);
  });
});

describe('ScanExperience flow driver: a QA-fail retry never orphans the superseded attempt URL', () => {
  // Mirrors ScanExperience's CAPTURE effect exactly: the reducer nulls a
  // failed frame out of state on QA_FAIL synchronously, so the component
  // revokes the local `frame` reference itself, right after dispatching,
  // whenever qa.pass is false. This suite exercises that same sequence
  // (dispatch CAPTURED, dispatch the QA action, revoke on fail) so a
  // three-fail-then-skip run is asserted to leave zero orphaned URLs.
  let revokeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    revokeSpy = vi.fn();
    vi.stubGlobal('URL', { revokeObjectURL: revokeSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function driveAttemptMirroringComponentRevoke(
    state: ScanState,
    pose: PoseId,
    pass: boolean,
    urlsUsed: string[],
  ): ScanState {
    let s = state;
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'COUNT_DONE' });
    expect(s.phase).toBe('CAPTURE');

    const objectUrl = `blob:${pose}-attempt-${captureSeq++}`;
    urlsUsed.push(objectUrl);
    const frame = makeFrame(pose, objectUrl, pass, s.retryCount);
    s = scanReducer(s, { type: 'CAPTURED', frame });
    s = scanReducer(s, qaResultToAction(frame.qa));
    if (!frame.qa.pass) revokeFrame(frame); // the component's post-dispatch revoke-on-fail
    return s;
  }

  it('revokes each of three failed attempts, then the CHOOSE_SKIP placeholder never needs revoking', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });

    const failedUrls: string[] = [];
    s = driveAttemptMirroringComponentRevoke(s, 'right', false, failedUrls);
    expect(s.phase).toBe('PROMPT');
    expect(s.retryCount).toBe(1);

    s = driveAttemptMirroringComponentRevoke(s, 'right', false, failedUrls);
    expect(s.phase).toBe('PROMPT');
    expect(s.retryCount).toBe(2);

    s = driveAttemptMirroringComponentRevoke(s, 'right', false, failedUrls);
    expect(s.phase).toBe('CHOICE');
    expect(s.retryCount).toBe(3);

    // All three superseded attempts were revoked, by their exact URLs.
    expect(failedUrls).toHaveLength(3);
    expect(revokeSpy).toHaveBeenCalledTimes(3);
    for (const url of failedUrls) {
      expect(revokeSpy).toHaveBeenCalledWith(url);
    }

    // handleChooseSkip revokes framesRef.current[poseIndex] before
    // dispatching; at CHOICE that slot is already null (the reducer nulled
    // it on the third QA_FAIL), so this is correctly a no-op: no 4th call.
    revokeFrame(s.frames[s.poseIndex]);
    s = scanReducer(s, { type: 'CHOOSE_SKIP' });
    expect(revokeSpy).toHaveBeenCalledTimes(3);
    expect(s.frames[0]?.skipped).toBe(true);
    expect(s.frames[0]?.objectUrl).toBe('');
    expect(revokeSpy).not.toHaveBeenCalledWith('');
  });
});

describe('ScanExperience flow driver: Discard revokes real object URLs, never the skipped placeholder', () => {
  let revokeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    revokeSpy = vi.fn();
    // scanFlowDriver only calls URL.revokeObjectURL; stub just that surface
    // rather than the full URL constructor (spreading a class copies no
    // static methods reliably across environments).
    vi.stubGlobal('URL', { revokeObjectURL: revokeSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('revokes every non-skipped frame URL before DISCARD resets state', () => {
    const frames: ScanFrame[] = [
      makeFrame('front', 'blob:front', true),
      { ...makeFrame('right', '', false), skipped: true },
      makeFrame('back', 'blob:back', true),
      makeFrame('left', 'blob:left', true),
    ];
    const reviewState: ScanState = { ...initialScanState(), phase: 'REVIEW', frames };

    revokeAllFrames(reviewState.frames);

    expect(revokeSpy).toHaveBeenCalledTimes(3);
    expect(revokeSpy).toHaveBeenCalledWith('blob:front');
    expect(revokeSpy).toHaveBeenCalledWith('blob:back');
    expect(revokeSpy).toHaveBeenCalledWith('blob:left');
    expect(revokeSpy).not.toHaveBeenCalledWith('');

    const next = scanReducer(reviewState, { type: 'DISCARD' });
    expect(next).toEqual(initialScanState());
  });

  it('revokeFrame is a no-op for a skipped frame even if it somehow carried a URL', () => {
    const skipped = { ...makeFrame('right', 'blob:should-not-revoke', true), skipped: true };
    revokeFrame(skipped);
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('revokeFrame is a no-op for null/undefined', () => {
    revokeFrame(null);
    revokeFrame(undefined);
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('RESET (camera lost recovery) also revokes any real frame URLs before resetting', () => {
    const frames: ScanFrame[] = [
      makeFrame('front', 'blob:front-2', true),
      null as unknown as ScanFrame,
      null as unknown as ScanFrame,
      null as unknown as ScanFrame,
    ];
    let s: ScanState = { ...initialScanState(), phase: 'COUNT', count: 3, frames };
    s = scanReducer(s, { type: 'CAMERA_LOST' });
    expect(s.phase).toBe('CAMERA_LOST');

    revokeAllFrames(s.frames);
    expect(revokeSpy).toHaveBeenCalledWith('blob:front-2');

    const next = scanReducer(s, { type: 'RESET' });
    expect(next.phase).toBe('SETUP');
    expect(next.error).toBe('Camera disconnected. Tap Start scan to try again.');
    expect(next.frames.every((f) => f === null)).toBe(true);
  });
});

describe('ScanExperience wiring: live DONE converges onto the shared analyzer', () => {
  const src = readFileSync(resolve(__dirname, '../ScanExperience.tsx'), 'utf8');

  it('handleSubmit calls the dedicated converge helper after session persist ok', () => {
    expect(src).toContain('convergeLiveScanToFormaVisionSpine');
    expect(src).toContain('submitResult.ok && submitResult.sessionId');
    expect(src).toContain('persistCompositionScan');
    expect(src).not.toMatch(/Analysis coming soon/i);
  });

  it('DONE offers retry when composition persist failed and does not claim 3D until ok', () => {
    expect(src).toContain('scan-done-retry-composition');
    expect(src).toContain('analyzeLiveFramesOnFormaVisionSpine');
    expect(src).toContain("compositionPhase === 'ok' ? 'View 3D composition' : 'Open FormaVision'");
    expect(src).toContain('formavisionAfterScanHref');
  });
});

describe('ScanExperience wiring: Live | Upload images tabs on SETUP', () => {
  const src = readFileSync(resolve(__dirname, '../ScanExperience.tsx'), 'utf8');
  const page = readFileSync(
    resolve(__dirname, '../../../app/(app)/(consumer)/body-tracker/formavision/scan/page.tsx'),
    'utf8',
  );
  const landing = readFileSync(
    resolve(__dirname, '../../../app/(app)/(consumer)/body-tracker/formavision/page.tsx'),
    'utf8',
  );

  it('SETUP mounts Live | Upload images tabs and BodyScanUploader in-place', () => {
    expect(src).toContain('scan-setup-mode');
    expect(src).toContain('liveLabel="Live"');
    expect(src).toContain('uploadLabel="Upload images"');
    expect(src).toContain('scan-setup-upload-panel');
    expect(src).toContain('BodyScanUploader');
    expect(src).toContain('persistCompositionScan');
    expect(src).toContain('scan-start-button');
    expect(src).toContain('handleStart');
    expect(src).not.toContain('FormaVisionUploadEscapeLink');
    expect(src).not.toMatch(/from '@\/lib\/body-tracker\/composition\/runFormaVisionAnalyze'/);
  });

  it('fail and disconnect beats switch to the Upload images tab without leaving /scan', () => {
    expect(src).toContain('scan-qa-fail-upload-tab');
    expect(src).toContain('scan-choice-upload-tab');
    expect(src).toContain('scan-camera-lost-upload-tab');
    expect(src).toContain("handleSetupModeChange('upload')");
    expect(src).toContain('RETURN_SETUP');
  });

  it('scan header goes back to FormaVision and does not off-link Upload to ?mode=upload', () => {
    expect(page).toContain('scan-capture-header');
    expect(page).toContain('scan-back-formavision');
    expect(page).toContain('Back to FormaVision');
    expect(page).not.toContain('formavisionUploadHref');
    expect(page).not.toContain('scan-header-upload-escape');
  });

  it('does not add an Upload requirement to the FormaVision landing page', () => {
    expect(landing).toContain('formavision-open-scan');
    expect(landing).toContain('Scan My Body');
    expect(landing).not.toContain('scan-history-upload-escape');
  });
});
