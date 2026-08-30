'use client';

/**
 * Prompt 231: the capture flow orchestrator. Wires ConsentNotice,
 * CameraPreview, the Task 8 overlays, useScanSession, useCountdown,
 * useCamera, and usePoseLandmarker into the end-to-end flow (spec Section
 * 6). The real MediaPipe pose landmarker gates the ARMED/COUNT live
 * pre-check and the CAPTURE shot QA; evaluateWeakFrame is the fallback path
 * when the landmarker fails to load (mode 'weak'), so the flow stays
 * exercisable end to end either way. "Use these scans" runs the real
 * prepare/upload/finalize persist flow (submitFlow.runSubmit over
 * persist.ts) and only ever reports success after a server-confirmed
 * ok:true - never optimistically.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COMPOSITION_PATH } from '@/lib/body-tracker/compositionNav';
import { useScanSession } from '@/hooks/scan/useScanSession';
import { useCountdown } from '@/hooks/scan/useCountdown';
import { useCamera } from '@/hooks/scan/useCamera';
import { usePoseLandmarker } from '@/hooks/scan/usePoseLandmarker';
import { ConsentNotice } from './ConsentNotice';
import { CameraPreview } from './CameraPreview';
import { CountdownOverlay } from './CountdownOverlay';
import { PoseTitleCard } from './PoseTitleCard';
import { LevelBubble } from './LevelBubble';
import { ScanReview } from './ScanReview';
import { SkeletonOverlay } from './SkeletonOverlay';
import { POSE_ORDER, INTERSTITIAL } from '@/lib/scan/poses';
import { evaluatePose, evaluateWeakFrame, messageForCode } from '@/lib/scan/qa';
import { computeWeakQaInputFromBlob, blobToCanvas } from '@/lib/scan/captureStillMetrics';
import { revokeFrame, revokeAllFrames, qaResultToAction } from '@/lib/scan/scanFlowDriver';
import { runSubmit } from '@/lib/scan/submitFlow';
import { scanResultPath } from '@/lib/scan/routes';
import { readVoicePreference, writeVoicePreference } from '@/lib/scan/voicePreference';
import { primeScanVoices, speakScanCountdown as speak } from '@/lib/scan/scanSpeech';
import { POSE_CONNECTIONS } from '@/lib/scan/landmarks';
import {
  WALK_IN_COACHING,
  ARMED_COACHING,
  CHECKING_POSE,
  POSE_GUIDE_UNAVAILABLE,
  CAMERA_BLOCKED_MESSAGE,
  CAMERA_LOST_MESSAGE,
  coachingForCount,
} from '@/lib/scan/scanCopy';
import {
  SCAN_OPEN_CAMERA_TIMEOUT_MS,
  SCAN_PRECHECK_TIMEOUT_MS,
  SCAN_CHECKING_POSE_TIMEOUT_MS,
  SCAN_POSE_TITLE_MS,
  SCAN_SUBMIT_WATCHDOG_MS,
} from '@/lib/scan/scanTimeouts';
import { withTimeout } from '@/lib/utils/with-timeout';
import type { Landmark, ScanFrame } from '@/lib/scan/types';

const WALK_IN_SECONDS = 10;
const COUNT_SECONDS = 5;

// Prompt 231: haptic gradation for the COUNT tick (spec: light on 5-2,
// heavier on 1-0). The shutter buzz at CAPTURE (count 0) keeps its own,
// more prominent duration below - it is already the heaviest pulse in the
// sequence, so it needs no separate constant here.
const HAPTIC_TICK_LIGHT_MS = 15;
const HAPTIC_TICK_HEAVY_MS = 40;

const DEBUG_SKELETON_STORAGE_KEY = 'formavision.debug';

function readDebugSkeletonEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'skeleton') return true;
  } catch {
    // malformed query string: fall through to the localStorage check
  }
  try {
    return Boolean(window.localStorage.getItem(DEBUG_SKELETON_STORAGE_KEY));
  } catch {
    return false;
  }
}

// Blur is a still-only signal. The live ARMED/COUNT pre-check runs
// evaluatePose() on every video frame at ~12fps to gate the countdown;
// running the Laplacian-variance blur pass that often would burn cycles on
// a signal that is only authoritative on the captured still anyway (the
// trust-the-still rule below re-evaluates blur for real at CAPTURE via
// computeWeakQaInputFromBlob). Passing a value that can never fail BLURRY
// here waives that one gate for the live check only.
const LIVE_PRECHECK_BLUR_SCORE = Number.POSITIVE_INFINITY;

export interface ScanExperienceProps {
  /** clinical_assessments.height_cm, read server side. Null means UNKNOWN
   * and must be prompted, never defaulted to 0. */
  heightCm: number | null;
  hasConsent: boolean;
}

export function ScanExperience({ heightCm, hasConsent }: ScanExperienceProps) {
  const router = useRouter();
  const { state, dispatch } = useScanSession();
  const camera = useCamera({ facingMode: 'environment' });
  // Lazily loads only once the camera stream is live (never before), and
  // never throws; on any failure it settles to mode 'weak' (see
  // usePoseLandmarker.ts). detectVideo/detectStill below are guarded on
  // mode/ready everywhere they are called, so a still-loading or failed
  // landmarker is always harmless, never a hang.
  const poseLandmarker = usePoseLandmarker({ enabled: Boolean(camera.stream) });
  const landmarkerLive = poseLandmarker.ready && poseLandmarker.mode === 'landmarker';

  const [consentAcknowledged, setConsentAcknowledged] = useState(hasConsent);
  const [localHeightCm, setLocalHeightCm] = useState<number | null>(heightCm);
  const [heightDraft, setHeightDraft] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [walkInDisplay, setWalkInDisplay] = useState(WALK_IN_SECONDS);
  const [flashActive, setFlashActive] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [cameraOpenTimedOut, setCameraOpenTimedOut] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Debug-only, never on by default: ?debug=skeleton or
  // localStorage.formavision.debug. debugLandmarks is only ever populated
  // while debugSkeletonEnabled is true (see the ARMED/COUNT live-check
  // effects below), so it stays inert for every normal user.
  const [debugSkeletonEnabled, setDebugSkeletonEnabled] = useState(false);
  const [debugLandmarks, setDebugLandmarks] = useState<Landmark[] | null>(null);

  const framesRef = useRef(state.frames);
  framesRef.current = state.frames;
  const cameraOpenWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One scanId per scan ATTEMPT (spans retries), so a retried Submit reuses
  // the same id and prepare/finalize stay idempotent (persist.ts's
  // contract). Regenerated only when a new scan begins - i.e. whenever the
  // reducer
  // re-enters SETUP, which DISCARD and RESET (CAMERA_LOST recovery) both do
  // via initialScanState(). A retry from REVIEW never touches SETUP, so the
  // id is preserved across SUBMIT_FAIL -> Submit again.
  const scanIdRef = useRef<string>(crypto.randomUUID());
  useEffect(() => {
    if (state.phase === 'SETUP') {
      scanIdRef.current = crypto.randomUUID();
    }
  }, [state.phase]);
  const submitAttemptRef = useRef(0);

  useEffect(() => {
    setVoiceEnabled(readVoicePreference());
    setVoiceAvailable(typeof window !== 'undefined' && 'speechSynthesis' in window);
    setDebugSkeletonEnabled(readDebugSkeletonEnabled());
    primeScanVoices();
  }, []);

  // ---- prefers-reduced-motion: read once on mount and keep in sync with
  // live OS-level changes, so CountdownOverlay's tick animation is
  // suppressed the moment the user's system preference says so. ----
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  // Revoke every real object URL on unmount, from the ref so this always
  // sees the latest frames (not the empty array captured at mount).
  useEffect(() => {
    return () => {
      revokeAllFrames(framesRef.current);
    };
  }, []);

  useEffect(() => {
    setPermissionBlocked(camera.permission === 'denied');
  }, [camera.permission]);

  // ---- "Opening camera..." watchdog (228 Rule 1: no transitional state
  // without a timeout + named next action). The watchdog is armed by
  // startCameraOpenWatchdog (called from handleStart, AFTER camera.open()
  // has already been invoked as the first statement so it never delays or
  // precedes that call per condition 21) and cleared the moment the stream
  // attaches or camera.open() reports an error. If neither happens within
  // SCAN_OPEN_CAMERA_TIMEOUT_MS, cameraOpenTimedOut surfaces a retry
  // affordance rather than leaving the flow spinning forever. ----
  const clearCameraOpenWatchdog = useCallback(() => {
    if (cameraOpenWatchdogRef.current !== null) {
      clearTimeout(cameraOpenWatchdogRef.current);
      cameraOpenWatchdogRef.current = null;
    }
  }, []);

  const startCameraOpenWatchdog = useCallback(() => {
    clearCameraOpenWatchdog();
    setCameraOpenTimedOut(false);
    cameraOpenWatchdogRef.current = setTimeout(() => {
      setCameraOpenTimedOut(true);
    }, SCAN_OPEN_CAMERA_TIMEOUT_MS);
  }, [clearCameraOpenWatchdog]);

  useEffect(() => {
    if (camera.stream || camera.error) {
      clearCameraOpenWatchdog();
      setCameraOpenTimedOut(false);
    }
  }, [camera.stream, camera.error, clearCameraOpenWatchdog]);

  useEffect(() => {
    if (state.phase === 'SETUP') {
      clearCameraOpenWatchdog();
      setCameraOpenTimedOut(false);
    }
  }, [state.phase, clearCameraOpenWatchdog]);

  useEffect(() => clearCameraOpenWatchdog, [clearCameraOpenWatchdog]);

  const handleRetryCameraOpen = useCallback(() => {
    startCameraOpenWatchdog();
    void camera.open();
  }, [camera, startCameraOpenWatchdog]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      writeVoicePreference(next);
      return next;
    });
  }, []);

  // ---- Start tap: the single user gesture that unlocks camera, voice,
  // device orientation, and haptics (condition 21). camera.open() must be
  // the first statement in this handler, no prior await. ----
  const handleStart = useCallback(() => {
    if (state.phase !== 'SETUP') return;
    void camera.open();
    startCameraOpenWatchdog();
    speak('', voiceEnabled); // warms speechSynthesis inside the gesture
    const OrientationCtor = (
      window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }
    ).DeviceOrientationEvent;
    if (OrientationCtor && typeof OrientationCtor.requestPermission === 'function') {
      void OrientationCtor.requestPermission().catch(() => undefined);
    }
    dispatch({ type: 'START' });
  }, [state.phase, camera, dispatch, voiceEnabled, startCameraOpenWatchdog]);

  // ---- WALK_IN: 10 -> 1 "Walk to the mark" ----
  useEffect(() => {
    if (state.phase === 'WALK_IN') setWalkInDisplay(WALK_IN_SECONDS);
  }, [state.phase]);

  useCountdown({
    totalSeconds: WALK_IN_SECONDS,
    active: state.phase === 'WALK_IN',
    onTick: (display) => {
      setWalkInDisplay(display);
      speak(String(display), voiceEnabled);
    },
    onComplete: () => dispatch({ type: 'WALK_IN_DONE' }),
  });

  // ---- PROMPT: title card for 2s, then ARMED ----
  useEffect(() => {
    if (state.phase !== 'PROMPT') return;
    const timer = setTimeout(() => dispatch({ type: 'PROMPT_DONE' }), SCAN_POSE_TITLE_MS);
    return () => clearTimeout(timer);
  }, [state.phase, state.poseIndex, dispatch]);

  // ---- ARMED: live pre-check gates the count start. In landmarker mode,
  // poll the video frame at ~12fps (usePoseLandmarker.detectVideo throttles
  // internally to >= 80ms between calls) and run evaluatePose; PRECHECK_PASS
  // fires the moment a frame passes. A bounded watchdog (SCAN_PRECHECK_TIMEOUT_MS)
  // still fires PRECHECK_PASS on its own if nothing passes in time (228 Rule
  // 1: ARMED never hangs) - the COUNT live-abort effect below keeps
  // enforcing the pose after that, so passing through on the watchdog here
  // is not the only gate. In weak mode (landmarker failed to load, no live
  // geometry signal), this is unchanged from pre-Task-11: wait out the
  // timeout and pass through. ----
  useEffect(() => {
    if (state.phase !== 'ARMED') return;
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      dispatch({ type: 'PRECHECK_PASS' });
    }, SCAN_PRECHECK_TIMEOUT_MS);

    if (!landmarkerLive) {
      return () => clearTimeout(timer);
    }

    const pose = POSE_ORDER[state.poseIndex];
    let rafId: number;
    const tick = () => {
      if (settled) return;
      const video = camera.videoRef.current;
      const landmarks = video ? poseLandmarker.detectVideo(video, performance.now()) : null;
      if (debugSkeletonEnabled && landmarks) setDebugLandmarks(landmarks);
      if (landmarks) {
        const result = evaluatePose({
          landmarks,
          pose,
          frameWidth: video!.videoWidth,
          frameHeight: video!.videoHeight,
          blurScore: LIVE_PRECHECK_BLUR_SCORE,
        });
        if (result.pass) {
          settled = true;
          clearTimeout(timer);
          dispatch({ type: 'PRECHECK_PASS' });
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      settled = true;
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [state.phase, state.poseIndex, state.retryCount, dispatch, camera.videoRef, landmarkerLive, poseLandmarker.detectVideo, debugSkeletonEnabled]);

  // ---- COUNT: Prompt 231. onTick sets the displayed digit from real
  // elapsed seconds (COUNT_SET, idempotent, never drives phase); onComplete
  // fires the one time-based CAPTURE transition (COUNT_DONE) at the real 5
  // second mark, mirroring WALK_IN's onComplete -> WALK_IN_DONE. Speech
  // fires from the count-change effect below so the digit is spoken at the
  // start of that second. ----
  useCountdown({
    totalSeconds: COUNT_SECONDS,
    active: state.phase === 'COUNT',
    onTick: (display) => dispatch({ type: 'COUNT_SET', display }),
    onComplete: () => dispatch({ type: 'COUNT_DONE' }),
  });

  useEffect(() => {
    if (state.phase !== 'COUNT') return;
    speak(String(state.count), voiceEnabled);
  }, [state.phase, state.count, voiceEnabled]);

  // ---- COUNT haptics: light pulse on 5-2, heavier on 1 (spec gradation).
  // The 0/CAPTURE shutter buzz below is already heavier still. Fires from
  // the same count-change dependency as the speech effect above so the two
  // stay in lockstep. ----
  useEffect(() => {
    if (state.phase !== 'COUNT') return;
    try {
      navigator.vibrate?.(state.count <= 1 ? HAPTIC_TICK_HEAVY_MS : HAPTIC_TICK_LIGHT_MS);
    } catch {
      // fail silently, never blocks capture
    }
  }, [state.phase, state.count]);

  // ---- COUNT live abort: keep polling the video frame through the
  // countdown; if the pose breaks mid-count in landmarker mode, dispatch
  // PRECHECK_FAIL (reducer: COUNT -> ARMED, count resets to 5). Weak mode
  // has no live geometry signal, so this effect is a no-op there - the
  // countdown simply runs to completion as it did pre-Task-11. ----
  useEffect(() => {
    if (state.phase !== 'COUNT' || !landmarkerLive) return;
    let cancelled = false;
    const pose = POSE_ORDER[state.poseIndex];
    let rafId: number;
    const tick = () => {
      if (cancelled) return;
      const video = camera.videoRef.current;
      const landmarks = video ? poseLandmarker.detectVideo(video, performance.now()) : null;
      if (debugSkeletonEnabled && landmarks) setDebugLandmarks(landmarks);
      if (landmarks) {
        const result = evaluatePose({
          landmarks,
          pose,
          frameWidth: video!.videoWidth,
          frameHeight: video!.videoHeight,
          blurScore: LIVE_PRECHECK_BLUR_SCORE,
        });
        if (!result.pass) {
          cancelled = true;
          dispatch({ type: 'PRECHECK_FAIL' });
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [state.phase, state.poseIndex, dispatch, camera.videoRef, landmarkerLive, poseLandmarker.detectVideo, debugSkeletonEnabled]);

  // ---- CAPTURE: grab the still, flash + haptic, run weak QA, dispatch
  // CAPTURED then QA_PASS/QA_FAIL. A hung grab/QA pipeline is a camera
  // problem, not a pose problem, so a timeout here routes to CAMERA_LOST
  // (its own named next action) rather than burning a QA retry. ----
  useEffect(() => {
    if (state.phase !== 'CAPTURE') return;
    let cancelled = false;
    setFlashActive(true);
    const flashTimer = setTimeout(() => setFlashActive(false), 300);
    try {
      navigator.vibrate?.(200);
    } catch {
      // fail silently, never blocks capture
    }

    // Defensive: revoke whatever might still be sitting in this pose's
    // frame slot before a fresh attempt overwrites it (the reducer already
    // nulls a failed frame out of state on QA_FAIL, so this is normally a
    // no-op, but it stays correct if that ever changes, and it is the real
    // fix for a retake, where the prior passed frame's slot is still live
    // right up until CAPTURED overwrites it).
    revokeFrame(framesRef.current[state.poseIndex]);

    const pose = POSE_ORDER[state.poseIndex];

    // Kept as a named reference (not inlined into withTimeout) so a
    // continuation can still be attached after the race settles: withTimeout
    // discards the loser but does not cancel it, so a still-running capture
    // that finishes after a CAMERA_LOST timeout would otherwise mint an
    // object URL nobody ever revokes.
    const capturePromise = (async (): Promise<ScanFrame> => {
      const still = await camera.grabStill();
      const objectUrl = URL.createObjectURL(still.blob);
      const metrics = await computeWeakQaInputFromBlob(still.blob);

      // Trust-the-still: qa below is ALWAYS computed fresh against this
      // captured still, never inherited from the ARMED/COUNT live
      // pre-check's verdict (that verdict only ever gated whether COUNT
      // started/kept running, above). So a live pass followed by a
      // failing still correctly fails the shot, per spec.
      let qa;
      let landmarks: Landmark[] | undefined;
      if (landmarkerLive) {
        const stillCanvas = await blobToCanvas(still.blob);
        const detected = poseLandmarker.detectStill(stillCanvas);
        landmarks = detected ?? undefined;
        qa = evaluatePose({
          landmarks: detected,
          pose,
          frameWidth: still.width,
          frameHeight: still.height,
          blurScore: metrics.blurScore,
        });
      } else {
        qa = evaluateWeakFrame(metrics);
      }

      return {
        pose,
        blob: still.blob,
        objectUrl,
        capturedAt: new Date().toISOString(),
        qa,
        retryCount: state.retryCount,
        capturedWidth: still.width,
        capturedHeight: still.height,
        // Collected for this pose's QA only (G81). Never sent anywhere:
        // this component has no upload/storage call, and Task 13's submit
        // whitelist + the DB REVOKE are the enforcement layer for the
        // route that eventually will exist.
        landmarks,
      };
    })();

    void withTimeout(capturePromise, SCAN_CHECKING_POSE_TIMEOUT_MS, 'scan.capture.grabAndQa')
      .then((frame) => {
        if (cancelled) {
          // Unmounted, or the phase moved on, before this attempt landed;
          // this frame will never reach state, so it is the only remaining
          // reference to its object URL. Revoke it here or it leaks.
          revokeFrame(frame);
          return;
        }
        dispatch({ type: 'CAPTURED', frame });
        dispatch(qaResultToAction(frame.qa));
        if (!frame.qa.pass) {
          // The reducer nulls frames[poseIndex] out of state synchronously
          // on QA_FAIL above; this local `frame` is the only remaining
          // reference to that failed attempt's object URL.
          revokeFrame(frame);
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'CAMERA_LOST' });
        // If the timeout (not the capture itself) lost the race, the
        // capture may still resolve later in the background. Attach a
        // trailing revoke so that eventual frame never leaks its URL.
        void capturePromise.then((frame) => revokeFrame(frame)).catch(() => undefined);
      });

    return () => {
      cancelled = true;
      clearTimeout(flashTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on phase entry only; camera/dispatch are stable
  }, [state.phase]);

  const handleRetake = useCallback(
    (poseIndex: number) => {
      revokeFrame(state.frames[poseIndex]);
      dispatch({ type: 'RETAKE', poseIndex });
    },
    [state.frames, dispatch],
  );

  const handleChooseRetry = useCallback(() => {
    revokeFrame(framesRef.current[state.poseIndex]);
    dispatch({ type: 'CHOOSE_RETRY' });
  }, [state.poseIndex, dispatch]);

  const handleChooseSkip = useCallback(() => {
    revokeFrame(framesRef.current[state.poseIndex]);
    dispatch({ type: 'CHOOSE_SKIP' });
  }, [state.poseIndex, dispatch]);

  const handleDiscard = useCallback(() => {
    revokeAllFrames(framesRef.current);
    dispatch({ type: 'DISCARD' });
    router.push(COMPOSITION_PATH);
  }, [dispatch, router]);

  const handleCameraLostReset = useCallback(() => {
    revokeAllFrames(framesRef.current);
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  // ---- Submit ("Use these scans"): runs the prepare -> upload -> finalize
  // flow (persist.ts, wired via submitFlow.runSubmit) and only ever reports
  // success after a server-confirmed ok:true (condition 24c - never before,
  // never optimistically). A retry from REVIEW after SUBMIT_FAIL reuses the
  // same scanIdRef, so it lands on the same session rather than minting a
  // new one. The outer withTimeout is a backstop against a hang somewhere
  // in that chain, not the normal path - see SCAN_SUBMIT_WATCHDOG_MS. ----
  const handleSubmit = useCallback(() => {
    if (state.phase !== 'REVIEW') return;
    const attempt = ++submitAttemptRef.current;
    const scanId = scanIdRef.current;
    void (async () => {
      try {
        await withTimeout(
          runSubmit(dispatch, scanId, framesRef.current),
          SCAN_SUBMIT_WATCHDOG_MS,
          'scan.persist.submit',
        );
      } catch {
        // Backstop only: runSubmit itself already dispatches SUBMIT_FAIL on
        // every normal (non-hang) failure well before this could fire. The
        // attempt check avoids stomping a phase a later retry has already
        // moved past; the reducer's UPLOADING-only guard on SUBMIT_FAIL
        // makes a duplicate dispatch harmless either way.
        if (submitAttemptRef.current === attempt) {
          dispatch({ type: 'SUBMIT_FAIL', error: 'Saving is taking longer than expected. Retry.' });
        }
      }
    })();
  }, [state.phase, dispatch]);

  if (!consentAcknowledged) {
    return <ConsentNotice onAcknowledged={() => setConsentAcknowledged(true)} />;
  }

  const currentPose = POSE_ORDER[state.poseIndex] ?? null;

  return (
    <div className="font-instrument relative h-full min-h-[70vh] w-full overflow-hidden rounded-2xl bg-navy-700 text-white" data-testid="scan-experience" data-phase={state.phase}>
      {cameraOpenTimedOut && state.phase !== 'SETUP' && state.phase !== 'CAMERA_LOST' && (
        <div
          className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-black/80 px-4 py-2 text-xs text-white"
          data-testid="scan-camera-open-timeout"
        >
          <span>{CAMERA_BLOCKED_MESSAGE}</span>
          <button
            type="button"
            data-testid="scan-camera-open-retry"
            onClick={handleRetryCameraOpen}
            className="shrink-0 rounded-md border border-white/30 px-2 py-1 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {state.phase === 'SETUP' && (
        <div className="relative flex h-full min-h-[70vh] flex-col justify-between p-4">
          <CameraPreview videoRef={camera.videoRef} pose="front" showFootMark mirrored={false} />
          <div className="relative z-10 mt-auto space-y-3 rounded-2xl bg-[var(--card)]/90 p-4">
            {permissionBlocked && (
              <p className="text-xs text-red-300" data-testid="scan-camera-blocked">
                {CAMERA_BLOCKED_MESSAGE}
              </p>
            )}
            <p className="text-xs text-white/60" data-testid="scan-pose-guide-notice">
              {POSE_GUIDE_UNAVAILABLE}
            </p>
            {localHeightCm !== null ? (
              <p className="text-sm text-white/80" data-testid="scan-height-chip">
                Height on file: {localHeightCm} cm
              </p>
            ) : (
              <div className="flex items-center gap-2" data-testid="scan-height-prompt">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Height in cm"
                  value={heightDraft}
                  onChange={(e) => setHeightDraft(e.target.value)}
                  className="w-28 rounded-lg border border-white/20 bg-transparent px-2 py-1.5 text-sm text-white"
                />
                <button
                  type="button"
                  data-testid="scan-height-save"
                  onClick={() => {
                    const parsed = Number(heightDraft);
                    if (Number.isFinite(parsed) && parsed > 0) setLocalHeightCm(parsed);
                  }}
                  className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-white/80"
                >
                  Save
                </button>
              </div>
            )}
            {voiceAvailable && (
              <button
                type="button"
                data-testid="scan-setup-voice-toggle"
                aria-pressed={voiceEnabled}
                onClick={toggleVoice}
                className="text-xs text-white/60 underline"
              >
                Voice countdown: {voiceEnabled ? 'On' : 'Off'}
              </button>
            )}
            <button
              type="button"
              data-testid="scan-start-button"
              onClick={handleStart}
              className="w-full rounded-xl bg-[var(--teal)] py-3 text-sm font-semibold text-white"
            >
              Start scan
            </button>
          </div>
        </div>
      )}

      {state.phase === 'WALK_IN' && (
        <CameraPreview videoRef={camera.videoRef} pose={null} showFootMark mirrored={false}>
          <CountdownOverlay value={walkInDisplay} coaching={WALK_IN_COACHING} reducedMotion={reducedMotion} />
        </CameraPreview>
      )}

      {state.phase === 'PROMPT' && currentPose && (
        <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 p-6">
          {state.poseIndex > 0 && (
            <p className="text-xs text-white/60" data-testid="scan-interstitial">
              {INTERSTITIAL[POSE_ORDER[state.poseIndex - 1]]}
            </p>
          )}
          <PoseTitleCard pose={currentPose} index={state.poseIndex} />
        </div>
      )}

      {state.phase === 'ARMED' && currentPose && (
        <CameraPreview videoRef={camera.videoRef} pose={currentPose} showFootMark={false} mirrored={false}>
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <LevelBubble beta={0} gamma={0} available={false} />
          </div>
          <p
            className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-sm text-white/80"
            aria-live="assertive"
            data-testid={poseLandmarker.ready && poseLandmarker.mode === 'weak' ? 'scan-pose-guide-unavailable' : undefined}
          >
            {poseLandmarker.ready && poseLandmarker.mode === 'weak' ? POSE_GUIDE_UNAVAILABLE : ARMED_COACHING}
          </p>
          {debugSkeletonEnabled && (
            <SkeletonOverlay landmarks={debugLandmarks} connections={POSE_CONNECTIONS} />
          )}
        </CameraPreview>
      )}

      {state.phase === 'COUNT' && currentPose && (
        <CameraPreview videoRef={camera.videoRef} pose={currentPose} showFootMark={false} mirrored={false}>
          <CountdownOverlay value={state.count} coaching={coachingForCount(state.count)} reducedMotion={reducedMotion} />
          {debugSkeletonEnabled && (
            <SkeletonOverlay landmarks={debugLandmarks} connections={POSE_CONNECTIONS} />
          )}
        </CameraPreview>
      )}

      {state.phase === 'CAPTURE' && currentPose && (
        <CameraPreview videoRef={camera.videoRef} pose={currentPose} showFootMark={false} mirrored={false}>
          <CountdownOverlay value={0} coaching={coachingForCount(0)} reducedMotion={reducedMotion} />
          {flashActive && <div className="pointer-events-none absolute inset-0 bg-white" data-testid="scan-shutter-flash" />}
        </CameraPreview>
      )}

      {state.phase === 'QA' && currentPose && (
        <CameraPreview videoRef={camera.videoRef} pose={currentPose} showFootMark={false} mirrored={false}>
          <p className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-sm text-white/80" aria-live="assertive" data-testid="scan-checking-pose">
            {CHECKING_POSE}
          </p>
        </CameraPreview>
      )}

      {state.phase === 'CHOICE' && currentPose && (
        <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-white/80" data-testid="scan-choice-message">
            {messageForCode(state.frames[state.poseIndex]?.qa.code ?? 'NO_BODY') || 'That pose is not passing QA yet.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              data-testid="scan-choice-retry"
              onClick={handleChooseRetry}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white"
            >
              Retry
            </button>
            <button
              type="button"
              data-testid="scan-choice-skip"
              onClick={handleChooseSkip}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white"
            >
              Skip pose
            </button>
          </div>
        </div>
      )}

      {state.phase === 'REVIEW' && (
        <div className="p-4">
          <ScanReview
            frames={state.frames}
            voiceEnabled={voiceEnabled}
            voiceAvailable={voiceAvailable}
            onToggleVoice={toggleVoice}
            onRetake={handleRetake}
            onDiscard={handleDiscard}
            onSubmit={handleSubmit}
            submitDisabled={false}
            submitError={state.error}
          />
        </div>
      )}

      {state.phase === 'UPLOADING' && (
        <div className="flex h-full min-h-[70vh] items-center justify-center" data-testid="scan-uploading">
          <p className="text-sm text-white/70">Saving...</p>
        </div>
      )}

      {state.phase === 'DONE' && (
        <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center" data-testid="scan-done">
          <p className="text-sm text-white/80">Scan saved.</p>
          {state.scanId && (
            // Prompt 231: no visible raw scan id on this consumer surface.
            // The id is only the link target, never displayed copy.
            <Link
              href={scanResultPath(state.scanId)}
              data-testid="scan-done-view-link"
              className="rounded-xl bg-[var(--teal)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              View scan
            </Link>
          )}
        </div>
      )}

      {state.phase === 'CAMERA_LOST' && (
        <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center" data-testid="scan-camera-lost">
          <p className="text-sm text-white/80">{state.error ?? CAMERA_LOST_MESSAGE}</p>
          <button
            type="button"
            data-testid="scan-camera-lost-retry"
            onClick={handleCameraLostReset}
            className="rounded-xl bg-[var(--teal)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Tap Start scan to try again
          </button>
        </div>
      )}
    </div>
  );
}
