'use client';

/**
 * Prompt 231: the capture flow orchestrator. Wires ConsentNotice,
 * CameraPreview, the Task 8 overlays, useScanSession, useCountdown, and
 * useCamera into the end-to-end flow (spec Section 6). MediaPipe is not
 * wired here (a later task); QA runs on evaluateWeakFrame so the flow is
 * exercisable end to end. The submit route does not exist yet either
 * (also a later task): the Review "Use these scans" button stays disabled
 * with a visible note rather than faking a success.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COMPOSITION_PATH } from '@/lib/body-tracker/compositionNav';
import { useScanSession } from '@/hooks/scan/useScanSession';
import { useCountdown } from '@/hooks/scan/useCountdown';
import { useCamera } from '@/hooks/scan/useCamera';
import { ConsentNotice } from './ConsentNotice';
import { CameraPreview } from './CameraPreview';
import { CountdownOverlay } from './CountdownOverlay';
import { PoseTitleCard } from './PoseTitleCard';
import { LevelBubble } from './LevelBubble';
import { ScanReview } from './ScanReview';
import { POSE_ORDER, INTERSTITIAL } from '@/lib/scan/poses';
import { evaluateWeakFrame, messageForCode } from '@/lib/scan/qa';
import { computeWeakQaInputFromBlob } from '@/lib/scan/captureStillMetrics';
import { revokeFrame, revokeAllFrames, qaResultToAction } from '@/lib/scan/scanFlowDriver';
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
} from '@/lib/scan/scanTimeouts';
import { withTimeout } from '@/lib/utils/with-timeout';
import type { ScanFrame } from '@/lib/scan/types';

const VOICE_STORAGE_KEY = 'formavision.scan.voice';
const WALK_IN_SECONDS = 10;
const COUNT_SECONDS = 5;

function readVoicePreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(VOICE_STORAGE_KEY);
    if (stored === null) return true; // default ON for first scan
    return stored === '1';
  } catch {
    return true;
  }
}

function writeVoicePreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // benign: private browsing / storage blocked
  }
}

function speak(text: string, enabled: boolean): void {
  if (!enabled) return;
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(text));
  } catch {
    // fail silently, never blocks capture
  }
}

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

  const [consentAcknowledged, setConsentAcknowledged] = useState(hasConsent);
  const [localHeightCm, setLocalHeightCm] = useState<number | null>(heightCm);
  const [heightDraft, setHeightDraft] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [walkInDisplay, setWalkInDisplay] = useState(WALK_IN_SECONDS);
  const [flashActive, setFlashActive] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [cameraOpenTimedOut, setCameraOpenTimedOut] = useState(false);

  const framesRef = useRef(state.frames);
  framesRef.current = state.frames;
  const cameraOpenWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVoiceEnabled(readVoicePreference());
    setVoiceAvailable(typeof window !== 'undefined' && 'speechSynthesis' in window);
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

  // ---- ARMED: live pre-check gates the count start. Until Task 11 wires
  // MediaPipe, the weak pre-check always passes; the timeout still bounds
  // the wait so ARMED never hangs (228 Rule 1). ----
  useEffect(() => {
    if (state.phase !== 'ARMED') return;
    const timer = setTimeout(() => dispatch({ type: 'PRECHECK_PASS' }), SCAN_PRECHECK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state.phase, state.poseIndex, state.retryCount, dispatch]);

  // ---- COUNT: 5..1 ticks dispatch TICK; the reducer owns count and the
  // CAPTURE flip at 0. Speech fires from the count-change effect below so
  // the digit is spoken at the start of that second. ----
  useCountdown({
    totalSeconds: COUNT_SECONDS,
    active: state.phase === 'COUNT',
    onTick: () => dispatch({ type: 'TICK' }),
  });

  useEffect(() => {
    if (state.phase !== 'COUNT') return;
    speak(String(state.count), voiceEnabled);
  }, [state.phase, state.count, voiceEnabled]);

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
      const qa = evaluateWeakFrame(metrics);
      return {
        pose,
        blob: still.blob,
        objectUrl,
        capturedAt: new Date().toISOString(),
        qa,
        retryCount: state.retryCount,
        capturedWidth: still.width,
        capturedHeight: still.height,
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

  // TODO for Task 13: wire the real submit route (POST body_photo_sessions +
  // body_photo_session_frames per the converge migration, condition 26).
  // That route does not exist yet, so "Use these scans" stays disabled with
  // a visible note rather than claiming a success this build cannot back up.
  const submitDisabledReason = 'Saving is not available yet. This ships in a later prompt.';

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
          <CountdownOverlay value={walkInDisplay} coaching={WALK_IN_COACHING} />
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
          <p className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-sm text-white/80" aria-live="assertive">
            {ARMED_COACHING}
          </p>
        </CameraPreview>
      )}

      {state.phase === 'COUNT' && currentPose && (
        <CameraPreview videoRef={camera.videoRef} pose={currentPose} showFootMark={false} mirrored={false}>
          <CountdownOverlay value={state.count} coaching={coachingForCount(state.count)} />
        </CameraPreview>
      )}

      {state.phase === 'CAPTURE' && currentPose && (
        <CameraPreview videoRef={camera.videoRef} pose={currentPose} showFootMark={false} mirrored={false}>
          <CountdownOverlay value={0} coaching={coachingForCount(0)} />
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
            onSubmit={() => undefined}
            submitDisabled
            submitDisabledReason={submitDisabledReason}
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
        <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-2 p-6 text-center" data-testid="scan-done">
          <p className="text-sm text-white/80">Scan saved.</p>
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
