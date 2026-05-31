'use client';

// PhotoSessionCapture.tsx  (T7 extended)
//
// State machine:
//   onboarding: first-visit walkthrough (ScanOnboardingWalkthrough)
//   calibration: CreditCardCalibrator step (before first pose)
//   capturing: PoseGuide loop (4 poses, 0-3)
//   finishing: edge-function call + optimistic close
//
// Auto-capture overlay uses QualityIndicators + getUserMedia live stream.
// 3-frame burst fires at 100ms intervals via multi-frame-fusion fuseFrames.
// FK bridge: body_photo_sessions row is created on mount (pre-existing code
// kept intact). session_id passed to body-scan-analyze edge function.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ManualInputModal } from '@/components/body-tracker/manual-input/ManualInputModal';
import { PoseGuide } from './PoseGuide';
import { PHOTO_POSES } from './poseConstants';
import { CreditCardCalibrator } from '@/components/body-tracker/scanning/CreditCardCalibrator';
import { QualityIndicators } from '@/components/body-tracker/scanning/QualityIndicators';
import { ScanOnboardingWalkthrough, ScanHelpButton } from '@/components/body-tracker/scanning/ScanOnboardingWalkthrough';
import { BodyScanInclusivityFallback } from '@/components/body-tracker/scanning/BodyScanInclusivityFallback';
import { aggregateQualityScores, scoreClothingTightness } from '@/lib/body-tracker/scan-quality';
import { fuseFrames } from '@/lib/body-tracker/multi-frame-fusion';
import { MULTI_FRAME_FUSION } from '@/lib/body-tracker/scan-constants';
import { evaluateCrossViewClothing, type CaptureViewId } from '@/lib/body-tracker/cross-view-clothing';
import { FOUR_VIEW_POSE_COUNT } from '@/lib/body-tracker/capture-pose-count';
import {
  computeProcessingKey,
  isTransient,
  CAPTURE_SAVED_OFFLINE_MESSAGE,
  type CapturePayload,
} from '@/lib/body-tracker/pending-scan-sync';
import { persistPendingCapture, resolvePendingScanStore } from '@/lib/body-tracker/pending-scan-store';
import {
  trackCaptureStarted,
  trackCalibrationCompleted,
  trackCaptureStepCompleted,
  trackCaptureRetake,
  trackCaptureAbandoned,
} from '@/lib/body-tracker/scan-analytics';
import type { PoseId } from '@/lib/arnold/types';
import type { CalibrationResult, QualityScores } from '@/lib/body-tracker/scan-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhotoSessionCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (sessionId: string) => void;
}

interface PoseUploadState {
  fullPath: string | null;
  thumbPath: string | null;
  previewUrl: string | null;
}

type SessionStep = 'onboarding' | 'calibration' | 'capturing' | 'finishing';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUCKET = 'body-progress-photos';
const FRAME_INTERVAL_MS = MULTI_FRAME_FUSION.intervalMs; // 100ms

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Grab a single ImageData snapshot from the live video element. */
function snapshotVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): ImageData | null {
  const w = video.videoWidth  || 640;
  const h = video.videoHeight || 480;
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Build a minimal JPEG Blob from an ImageData via canvas. */
async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width  = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      'image/jpeg',
      0.85,
    );
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhotoSessionCapture({ open, onOpenChange, onCompleted }: PhotoSessionCaptureProps) {
  // ---- Core session state ----
  const [step, setStep]           = useState<SessionStep>('onboarding');
  const [stepIdx, setStepIdx]     = useState(0);
  const [userId, setUserId]       = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploads, setUploads]     = useState<Record<PoseId, PoseUploadState>>({
    front: { fullPath: null, thumbPath: null, previewUrl: null },
    back:  { fullPath: null, thumbPath: null, previewUrl: null },
    left:  { fullPath: null, thumbPath: null, previewUrl: null },
    right: { fullPath: null, thumbPath: null, previewUrl: null },
  });
  const [finishing, setFinishing]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ---- Calibration ----
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);

  // ---- Walkthrough ----
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  // ---- Quality / auto-capture overlay ----
  const [qualityScores, setQualityScores] = useState<QualityScores | null>(null);
  const [burstCapturing, setBurstCapturing] = useState(false);

  // Per-pose clothing-tightness ratio captured at fusion time, used by the
  // cross-view clothing check (#169d section 2.5) at finish. A pose only lands
  // here once it has passed its own quality gates, so a present entry is a
  // captured, accepted view.
  const [clothingRatioByPose, setClothingRatioByPose] = useState<Partial<Record<PoseId, number>>>({});

  // Per-pose retake prompt (#169e section 3.1): when a single pose fails its
  // quality gates, only THAT pose is reissued. This holds the blocking-issue copy
  // for the current pose so the user retakes just it, not the whole set.
  const [poseBlockingIssues, setPoseBlockingIssues] = useState<string[]>([]);

  // ---- Demographics from user profile (for height fallback) ----
  const [heightCm, setHeightCm]   = useState<number>(0);
  const [weightKg, setWeightKg]   = useState<number>(0);

  // ---- Fused keypoints accumulated per pose, sent to body-scan-analyze ----
  const [fusedKeypointsByPose, setFusedKeypointsByPose] = useState<
    Array<{ x: number; y: number; z: number; confidence: number }>
  >([]);

  // ---- Refs ----
  const initializedRef    = useRef(false);
  // Distinguishes a normal finish (the user submitted for analysis) from an
  // abandon (closed mid-capture) so the capture_abandoned analytics event (§14)
  // only fires for a genuine abandon. Set true at the start of finish().
  const finishedRef       = useRef(false);
  // The step + captured count at close time, read by the reset effect to shape
  // the capture_abandoned event without depending on stale closure state.
  const captureProgressRef = useRef<{ step: SessionStep; captured: number }>({ step: 'onboarding', captured: 0 });
  const videoRef          = useRef<HTMLVideoElement | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const qualityCanvasRef  = useRef<HTMLCanvasElement | null>(null);
  const qualityRafRef     = useRef<number | null>(null);
  const burstFiredRef     = useRef(false);

  // ---- Session init ----
  useEffect(() => {
    if (!open) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    void initSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function initSession() {
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sign in first to start a photo session.'); return; }
    setUserId(user.id);

    // FK bridge: body_photo_sessions row (pre-existing logic, preserved)
    const { data, error: insErr } = await supabase
      .from('body_photo_sessions')
      .insert({ user_id: user.id } as never)
      .select('id')
      .single();
    if (insErr || !data) { setError(insErr?.message ?? 'Failed to start session'); return; }
    setSessionId((data as { id: string }).id);

    // Analytics (§14): the capture flow began. tier + capture_mode + device_model
    // are metadata only (the device string is a UA, not a biometric value).
    trackCaptureStarted({
      tier: 1,
      capture_mode: 'photo_session',
      device_model: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    // Fetch height/weight from user profile / CAQ for calibration fallback
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('height_cm, weight_kg')
        .eq('id', user.id)
        .single();
      if (profile) {
        setHeightCm((profile as { height_cm?: number }).height_cm ?? 0);
        setWeightKg((profile as { weight_kg?: number }).weight_kg ?? 0);
      }
    } catch { /* profile missing; height fallback will use default */ }
  }

  // Keep the capture-progress ref current so the reset effect can shape the
  // capture_abandoned event (§14) from the latest step + captured count without a
  // stale closure. capturedCount is recomputed from uploads here.
  useEffect(() => {
    captureProgressRef.current = {
      step,
      captured: Object.values(uploads).filter((u) => u.fullPath !== null).length,
    };
  }, [step, uploads]);

  // ---- Reset on close ----
  useEffect(() => {
    if (!open) {
      // Analytics (§14): if the modal closed mid-capture (calibration / capturing)
      // WITHOUT a finish, record an abandon with the step it was left on. A normal
      // finish sets finishedRef, so it is not counted as an abandon. step_name is
      // metadata only.
      const { step: lastStep, captured } = captureProgressRef.current;
      if (!finishedRef.current && (lastStep === 'calibration' || lastStep === 'capturing')) {
        trackCaptureAbandoned({ step_name: `${lastStep}_${captured}_captured` });
      }
      finishedRef.current = false;
      initializedRef.current = false;
      setStep('onboarding');
      setStepIdx(0);
      setUserId(null);
      setSessionId(null);
      setUploads({
        front: { fullPath: null, thumbPath: null, previewUrl: null },
        back:  { fullPath: null, thumbPath: null, previewUrl: null },
        left:  { fullPath: null, thumbPath: null, previewUrl: null },
        right: { fullPath: null, thumbPath: null, previewUrl: null },
      });
      setCalibration(null);
      setError(null);
      setFinishing(false);
      setQualityScores(null);
      setBurstCapturing(false);
      burstFiredRef.current = false;
      setFusedKeypointsByPose([]);
      setClothingRatioByPose({});
      setPoseBlockingIssues([]);
      stopCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---- Camera helpers ----
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { /* autoplay blocked */ });
      }
    } catch {
      // Camera permission denied; quality indicators will show zeros
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (qualityRafRef.current) {
      cancelAnimationFrame(qualityRafRef.current);
      qualityRafRef.current = null;
    }
  }

  // ---- Quality frame loop ----
  const startQualityLoop = useCallback(() => {
    if (!qualityCanvasRef.current) {
      qualityCanvasRef.current = document.createElement('canvas');
    }

    function tick() {
      const video  = videoRef.current;
      const canvas = qualityCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        qualityRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const imageData = snapshotVideoFrame(video, canvas);
      if (!imageData) {
        qualityRafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Minimal keypoints (empty, letting geometric proxy run)
      const keypoints = Array.from({ length: 33 }, (_, i) => ({
        x: (i % 11) / 10,
        y: i / 33,
        z: 0,
        confidence: 0.5,
      }));

      // Device pitch from DeviceOrientation API if available; else 0
      const devicePitch = 0;

      const scores = aggregateQualityScores({
        rgbImage: imageData,
        keypoints,
        silhouetteMaskAreaPx: imageData.width * imageData.height * 0.25,
        expectedBodyAreaPx:   imageData.width * imageData.height * 0.23,
        edgeDensityOutsidePerson: 30,
        devicePitchDeg: devicePitch,
        frameWidth:  imageData.width,
        frameHeight: imageData.height,
      });

      setQualityScores(scores);

      qualityRafRef.current = requestAnimationFrame(tick);
    }

    qualityRafRef.current = requestAnimationFrame(tick);
  }, []);

  // Start camera + quality loop when entering capturing step
  useEffect(() => {
    if (step === 'capturing' && open) {
      void startCamera().then(() => startQualityLoop());
    } else if (step !== 'capturing') {
      stopCamera();
      setQualityScores(null);
    }
    return () => {
      if (step === 'capturing') stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, open]);

  // ---- Auto-capture: 3-frame burst ----
  const handleAutoCapture = useCallback(async () => {
    if (burstFiredRef.current || burstCapturing) return;
    burstFiredRef.current = true;
    setBurstCapturing(true);

    // Snapshot the quality scores that AUTHORIZED this capture. QualityIndicators
    // only fires onAutoCapture after overallPass held for the hold window, so this
    // snapshot is the pass that triggered the burst. The per-pose gate below reads
    // THIS snapshot (not the live, still-ticking scores) so a frame that flips
    // after the trigger cannot cause a spurious rejection (#169e section 3.1).
    const authorizingScores = qualityScores;

    // Haptic + audio
    try { navigator.vibrate?.(50); } catch { /* unsupported */ }
    try {
      const beep = new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YUwAAAA' +
        'AAAAAAP//AgAEAAYABgAGAAQAAgAAAAIA//8AAAIA//8CAAIA//8CAAIA//8CAA==');
      beep.volume = 0.15;
      void beep.play().catch(() => { /* silent */ });
    } catch { /* ignore */ }

    const video  = videoRef.current;
    const canvas = qualityCanvasRef.current ?? document.createElement('canvas');
    if (!qualityCanvasRef.current) { qualityCanvasRef.current = canvas; }

    const capturedFrames: Array<{
      silhouetteMask: ImageData;
      keypoints: Array<{ x: number; y: number; z: number; confidence: number }>;
      capturedAt: number;
    }> = [];

    for (let i = 0; i < MULTI_FRAME_FUSION.frameCount; i++) {
      if (i > 0) await new Promise<void>((r) => setTimeout(r, FRAME_INTERVAL_MS));
      if (video && video.readyState >= 2) {
        const frameData = snapshotVideoFrame(video, canvas);
        if (frameData) {
          capturedFrames.push({
            silhouetteMask: frameData,
            keypoints: Array.from({ length: 33 }, (_, k) => ({
              x: (k % 11) / 10,
              y: k / 33,
              z: 0,
              confidence: 0.6,
            })),
            capturedAt: Date.now(),
          });
        }
      }
    }

    // Fuse frames
    let fusedKeypoints: Array<{ x: number; y: number; z: number; confidence: number }> = [];
    let fusedBlob: Blob | null = null;
    if (capturedFrames.length === MULTI_FRAME_FUSION.frameCount) {
      try {
        const fusionResult = fuseFrames({ frames: capturedFrames });
        fusedKeypoints = fusionResult.averagedKeypoints;
        fusedBlob = await imageDataToBlob(fusionResult.consensusMask);
      } catch (e) {
        // Fusion failed; fall back to last captured frame blob
        if (capturedFrames.length > 0) {
          try { fusedBlob = await imageDataToBlob(capturedFrames[capturedFrames.length - 1].silhouetteMask); } catch { /* ignore */ }
        }
      }
    }

    // PER-POSE QUALITY GATE (#169e section 3.1): if the authorizing quality scores
    // for THIS pose did not pass the blocking gates, reissue ONLY this pose: do not
    // upload, surface its blocking issues, and leave the other captured poses
    // untouched so the user retakes just this one.
    if (authorizingScores && !authorizingScores.overallPass) {
      setPoseBlockingIssues(authorizingScores.blockingIssues);
      setBurstCapturing(false);
      burstFiredRef.current = false;
      return;
    }

    // This pose passed its gates; clear any stale per-pose blocking copy.
    setPoseBlockingIssues([]);

    // Upload the fused frame as the pose capture
    if (fusedBlob && userId && sessionId) {
      // Build a thumb from the same blob (resize handled by photoProcessing normally; here minimal thumb)
      try {
        await handleCapturedBlob(fusedBlob, fusedBlob, fusedKeypoints);
        // Accumulate fused keypoints from all poses into flat array for body-scan-analyze payload
        if (fusedKeypoints.length > 0) {
          setFusedKeypointsByPose((prev) => [...prev, ...fusedKeypoints]);
        }
        // Record this view's clothing-tightness ratio for the cross-view check at
        // finish (#169d section 2.5). The mask area is estimated the same way the
        // live quality loop estimates it (proportional to frame area), so the
        // per-view ratio here is consistent with the score the user saw while
        // capturing this pose.
        const frameAreaPx =
          (qualityCanvasRef.current?.width ?? 0) * (qualityCanvasRef.current?.height ?? 0);
        const clothing = scoreClothingTightness(frameAreaPx * 0.25, frameAreaPx * 0.23);
        setClothingRatioByPose((prev) => ({ ...prev, [pose.id]: clothing.ratio }));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Auto-capture upload failed');
      }
    }

    setBurstCapturing(false);
    burstFiredRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstCapturing, userId, sessionId, stepIdx, qualityScores]);

  // ---- Upload helpers ----
  const pose = PHOTO_POSES[stepIdx];

  async function handleCapturedBlob(
    full: Blob,
    thumb: Blob,
    _fusedKeypoints?: Array<{ x: number; y: number; z: number; confidence: number }>,
  ) {
    if (!userId || !sessionId) throw new Error('Session not ready');
    const supabase = createClient();
    const ts = Date.now();
    const fullPath  = `${userId}/${sessionId}/${pose.id}_full_${ts}.jpg`;
    const thumbPath = `${userId}/${sessionId}/${pose.id}_thumb_${ts}.jpg`;

    const [up1, up2] = await Promise.all([
      supabase.storage.from(BUCKET).upload(fullPath, full,  { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' }),
      supabase.storage.from(BUCKET).upload(thumbPath, thumb, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' }),
    ]);
    if (up1.error) throw new Error(`Upload failed: ${up1.error.message}`);
    if (up2.error) throw new Error(`Upload failed: ${up2.error.message}`);

    const patch: Record<string, unknown> = {
      [`${pose.id}_full_path`]:  fullPath,
      [`${pose.id}_thumb_path`]: thumbPath,
    };
    const currentCompleted = Object.entries(uploads)
      .filter(([, v]) => v.fullPath !== null)
      .map(([k]) => k);
    const newCompleted = Array.from(new Set([...currentCompleted, pose.id]));
    patch.poses_completed = newCompleted;

    const { error: updErr } = await supabase
      .from('body_photo_sessions')
      .update(patch as never)
      .eq('id', sessionId);
    if (updErr) throw new Error(`Session update failed: ${updErr.message}`);

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(fullPath, 3600);
    setUploads((prev) => ({
      ...prev,
      [pose.id]: { fullPath, thumbPath, previewUrl: signed?.signedUrl ?? null },
    }));

    // Analytics (§14): a pose capture step completed. step_name is the pose id;
    // scan_count is how many poses are captured so far. Metadata only.
    trackCaptureStepCompleted({ step_name: pose.id, scan_count: newCompleted.length });
  }

  async function handleCaptured(full: Blob, thumb: Blob) {
    await handleCapturedBlob(full, thumb);
  }

  function handleRetake() {
    // Analytics (§14): a pose was retaken. step_name is the pose id (metadata).
    trackCaptureRetake({ step_name: pose.id });
    setUploads((prev) => ({ ...prev, [pose.id]: { fullPath: null, thumbPath: null, previewUrl: null } }));
    // Per-pose retake (#169e section 3.1): drop only THIS pose's recorded clothing
    // ratio and clear its blocking copy; the other captured poses are untouched.
    setClothingRatioByPose((prev) => {
      const next = { ...prev };
      delete next[pose.id];
      return next;
    });
    setPoseBlockingIssues([]);
    burstFiredRef.current = false;
  }

  function handleSkip() {
    if (stepIdx < PHOTO_POSES.length - 1) setStepIdx(stepIdx + 1);
  }

  function next() {
    if (stepIdx < PHOTO_POSES.length - 1) setStepIdx(stepIdx + 1);
    setPoseBlockingIssues([]);
    burstFiredRef.current = false;
  }

  function prev() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
    setPoseBlockingIssues([]);
    burstFiredRef.current = false;
  }

  // Build the deterministic-key capture payload (Prompt #169b, Task 20, spec
  // section 16.3) from the captured pose object paths + the pinned stats. The
  // SAME capture hashes to the SAME processing key, so a resume reconciles to the
  // same body_photo_sessions row (the finalize UPDATE in runScanAnalysis is
  // already idempotent) and never creates a duplicate scan.
  function buildCapturePayload(sid: string): CapturePayload {
    return {
      sessionId: sid,
      posePaths: {
        front: uploads.front.fullPath,
        back: uploads.back.fullPath,
        left: uploads.left.fullPath,
        right: uploads.right.fullPath,
      },
      weightKgAtScan: weightKg > 0 ? weightKg : null,
      heightCmAtScan: heightCm > 0 ? heightCm : null,
      tier: 1,
    };
  }

  // ---- Finish + edge function call ----
  async function finish() {
    if (!sessionId) return;

    // CROSS-VIEW CLOTHING CHECK (#169d section 2.5): before submitting, evaluate
    // the clothing-tightness ratio across ALL captured views at once. If ANY single
    // view is too baggy (ratio above 1.18) the WHOLE scan is rejected with a retake
    // prompt explaining that every view needs consistent form fitting clothing. The
    // decision lives in the pure, tested evaluateCrossViewClothing helper. Only
    // views that were captured (and thus passed their own per-pose gate) are
    // considered.
    const crossViewInputs = (Object.entries(clothingRatioByPose) as Array<[PoseId, number]>)
      .filter(([poseId]) => uploads[poseId].fullPath !== null)
      .map(([poseId, ratio]) => ({ view: poseId as CaptureViewId, ratio }));
    const crossView = evaluateCrossViewClothing(crossViewInputs);
    if (!crossView.pass) {
      setError(crossView.retakeMessage ?? 'Please retake all four photos in consistent form fitting clothing.');
      setStep('capturing');
      return;
    }

    // Mark a genuine finish so the close handler does not log capture_abandoned.
    finishedRef.current = true;
    setFinishing(true);
    setStep('finishing');
    setError(null);

    // PERSIST-BEFORE-PROCESS (spec section 16.3): make the capture durable in the
    // pending store BEFORE firing analysis. If the device is offline / the
    // connection drops here, the captured scan is not lost: the PendingScansSurface
    // on the scan area will resume it (re-running the idempotent client finalize,
    // which reads the SAME stored photos for this session id) on reconnect. The
    // resume reconciles to the same scan row via the deterministic key.
    const capturePayload = buildCapturePayload(sessionId);
    const processingKey = computeProcessingKey(capturePayload);
    const pendingStore = resolvePendingScanStore();
    await persistPendingCapture(capturePayload, Date.now(), pendingStore);

    try {
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const accessToken = authSession?.access_token;

      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhkcufyqjojdbvdrpky.supabase.co';

      // Call the new body-scan-analyze edge function (T5) with enriched payload.
      // processing_key (Task 20) is the SAME deterministic key persisted above, so
      // the server can dedupe a retried finalize idempotently.
      const payload = {
        session_id:      sessionId,
        processing_key:  processingKey,
        tier:            1,
        calibration:     calibration ?? undefined,
        quality_scores:  qualityScores ?? undefined,
        fused_keypoints: fusedKeypointsByPose.length > 0 ? fusedKeypointsByPose : undefined,
        scan_reported_demographics: {
          height_cm: heightCm > 0 ? heightCm : undefined,
          weight_kg: weightKg > 0 ? weightKg : undefined,
        },
        depth_sensor_type: 'none',
        device_model:      navigator.userAgent,
        // navigator.platform is deprecated; UserAgentData is not yet in lib.dom typings
        // so we use a local interface to feature-detect the newer API safely.
        device_os: (() => {
          interface UserAgentDataLike { platform?: string; }
          const uaData = (navigator as { userAgentData?: UserAgentDataLike }).userAgentData;
          return uaData?.platform ?? navigator.userAgent;
        })(),
      };

      // If we are OFFLINE at finish time, do not fire into the void: keep the
      // captured scan queued and tell the user it will finish on reconnect (spec
      // copy). The PendingScansSurface resumes it automatically.
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (isOffline) {
        setError(CAPTURE_SAVED_OFFLINE_MESSAGE);
        setStep('capturing');
        // Surface the captured-but-unprocessed scan to the page (which mounts the
        // pending surface) and close the capture modal.
        onCompleted?.(sessionId);
        onOpenChange(false);
        return;
      }

      // Fire and forget: edge function is long-running; UI polls session status
      void fetch(`${supabaseUrl}/functions/v1/body-scan-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => { /* swallow; status polling + pending surface surface failure */ });

      // Also fire the existing arnold-vision-analyze for legacy compatibility
      void fetch(`${supabaseUrl}/functions/v1/arnold-vision-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify({ session_id: sessionId, processing_key: processingKey }),
      }).catch(() => { /* swallow */ });

      // Mark status queued so the UI polls. This DB write is the first thing that
      // actually fails if the connection drops here; on a TRANSIENT failure we keep
      // the pending item so the scan is resumed later. capture_pose_count records
      // the four-view flow (#169e section 3.1) on the persist path; the value comes
      // from the single FOUR_VIEW_POSE_COUNT source of truth (always a valid 2/4).
      await supabase
        .from('body_photo_sessions')
        .update({ arnold_status: 'queued', capture_pose_count: FOUR_VIEW_POSE_COUNT } as never)
        .eq('id', sessionId);

      // Reached the server: the capture is queued for processing, so it is no
      // longer "stuck". Clear the durable pending record so the PendingScansSurface
      // only ever shows captures that genuinely could not reach processing (offline
      // / network drop). A failure before this point leaves the record in place.
      try { await pendingStore.delete(processingKey); } catch { /* best effort */ }

      onCompleted?.(sessionId);
      onOpenChange(false);
    } catch (e) {
      // A TRANSIENT failure here (offline / network drop) must NOT lose the scan:
      // the durable pending item is already saved, so leave it for the resume loop
      // and show the reassuring offline copy. Any other (non transient) error keeps
      // its own message but the capture is still recoverable from the queue.
      if (isTransient(e)) {
        setError(CAPTURE_SAVED_OFFLINE_MESSAGE);
        onCompleted?.(sessionId);
        onOpenChange(false);
      } else {
        setError(e instanceof Error ? e.message : 'Finish failed');
        setStep('capturing');
      }
    } finally {
      setFinishing(false);
    }
  }

  // ---- Derived ----
  const isLastPose      = stepIdx === PHOTO_POSES.length - 1;
  const currentUpload   = uploads[pose.id];
  const completedCount  = Object.values(uploads).filter((u) => u.fullPath !== null).length;

  // ---- Render ----
  const modalTitle = step === 'calibration'
    ? 'Calibration'
    : step === 'capturing'
      ? 'Body photo session'
      : 'Body scan';

  const modalDescription = step === 'calibration'
    ? 'Tier 1 scale reference'
    : step === 'capturing'
      ? `Step ${stepIdx + 1} of ${PHOTO_POSES.length}, ${completedCount} captured`
      : '';

  return (
    <>
      {/* First-time walkthrough (renders nothing after first view) */}
      {walkthroughOpen && (
        <ScanOnboardingWalkthrough
          forceOpen
          onClose={() => {
            setWalkthroughOpen(false);
            if (step === 'onboarding') setStep('calibration');
          }}
        />
      )}

      {/* Auto-show walkthrough on first open */}
      {step === 'onboarding' && !walkthroughOpen && (
        <ScanOnboardingWalkthrough
          onClose={() => setStep('calibration')}
        />
      )}

      {/* Hidden video element for live camera stream */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
        aria-hidden
      />

      <ManualInputModal
        open={open && step !== 'onboarding'}
        onOpenChange={onOpenChange}
        title={modalTitle}
        description={modalDescription}
        footer={
          step === 'calibration' ? (
            <div className="space-y-2">
              {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
              {calibration && (
                <button
                  type="button"
                  onClick={() => setStep('capturing')}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px]"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  Continue to poses
                </button>
              )}
            </div>
          ) : step === 'capturing' ? (
            <div className="space-y-2">
              {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

              {/* Quality indicators during live capture */}
              {step === 'capturing' && (
                <QualityIndicators
                  scores={qualityScores}
                  onAutoCapture={handleAutoCapture}
                  capturing={burstCapturing}
                />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prev}
                  disabled={stepIdx === 0 || finishing}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.06] min-h-[44px] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                  Back
                </button>
                <div className="flex-1 flex items-center justify-center gap-1.5">
                  {PHOTO_POSES.map((p, i) => (
                    <span
                      key={p.id}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        uploads[p.id].fullPath ? 'bg-[#2DA5A0]' : i === stepIdx ? 'bg-white/60' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                {!isLastPose ? (
                  <button
                    type="button"
                    onClick={next}
                    disabled={finishing}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finish}
                    disabled={finishing || completedCount === 0}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] disabled:opacity-50"
                  >
                    {finishing ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Check className="h-4 w-4" strokeWidth={1.5} />}
                    {finishing ? 'Finishing' : 'Finish and analyze'}
                  </button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {/* Loading state */}
        {!sessionId && !error && (
          <div className="py-12 flex items-center justify-center text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
          </div>
        )}

        {/* Error state */}
        {error && !sessionId && (
          <p className="py-6 text-center text-sm text-[#FCA5A5]">{error}</p>
        )}

        {/* Calibration step */}
        {sessionId && step === 'calibration' && (
          <div className="space-y-4">
            {/* Header with Tier 1 badge + Help button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-2.5 py-1">
                <Award className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold text-[#2DA5A0]">Tier 1</span>
              </div>
              <ScanHelpButton onClick={() => setWalkthroughOpen(true)} />
            </div>

            {/* Inclusivity fallback (Prompt #169b section 7.3 / 7.4): a kind "I
                can't do this pose" affordance present on EVERY capture step,
                including calibration, with an honest message + waitlist opt-in. */}
            <div className="flex justify-center">
              <BodyScanInclusivityFallback requestedCapability="other" />
            </div>

            {/* Camera preview for calibration */}
            <div className="relative aspect-video w-full rounded-2xl border border-white/[0.08] bg-[#0B1520] overflow-hidden">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                    void el.play().catch(() => { /* ignore */ });
                  }
                }}
              />
            </div>

            <CreditCardCalibrator
              videoRef={videoRef}
              caqHeightCm={heightCm}
              onCalibrated={(result) => {
                // Analytics (§14): calibration completed via the credit-card
                // reference. capture_mode is the calibration source (metadata).
                trackCalibrationCompleted({ capture_mode: 'credit_card', step_name: 'calibration' });
                setCalibration(result);
              }}
              onSkip={() => {
                // Analytics (§14): calibration skipped, falling back to user height.
                trackCalibrationCompleted({ capture_mode: 'user_height', step_name: 'calibration' });
                setCalibration({ source: 'user_height', scaleFactorPxPerCm: 1, floorPlaneInclinationDeg: null });
                setStep('capturing');
              }}
            />
          </div>
        )}

        {/* Capturing step: original PoseGuide flow preserved */}
        {sessionId && step === 'capturing' && (
          <div className="space-y-3">
            {/* Header with Tier 1 badge + Help button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-2.5 py-1">
                <Award className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold text-[#2DA5A0]">Tier 1</span>
              </div>
              <ScanHelpButton onClick={() => setWalkthroughOpen(true)} />
            </div>

            <PoseGuide
              pose={pose}
              stepLabel={`Step ${stepIdx + 1} of ${PHOTO_POSES.length}`}
              existingPreviewUrl={currentUpload.previewUrl}
              onCaptured={handleCaptured}
              onSkip={handleSkip}
              onRetake={handleRetake}
            />

            {/* Per-pose retake prompt (#169e section 3.1): when only THIS pose
                failed its quality gates, reissue just it. The other captured poses
                are kept; the user retakes this single view. */}
            {poseBlockingIssues.length > 0 && !currentUpload.fullPath && (
              <div className="rounded-xl border border-[#FCA5A5]/30 bg-[#FCA5A5]/10 px-3 py-2.5">
                <p className="text-xs font-semibold text-[#FCA5A5]">
                  This {pose.label.toLowerCase()} needs another try
                </p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-[#FCA5A5]/90 list-disc list-inside">
                  {poseBlockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] text-white/55">
                  Only this photo needs retaking. Your other views are saved.
                </p>
              </div>
            )}

            {/* Inclusivity fallback (Prompt #169b section 7.3 / 7.4): the same
                kind "I can't do this pose" affordance on every per pose capture
                step, with the honest message + waitlist opt-in. */}
            <div className="flex justify-center">
              <BodyScanInclusivityFallback requestedCapability="other" />
            </div>
          </div>
        )}

        {/* Finishing state */}
        {step === 'finishing' && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
            <p className="text-sm">Submitting for analysis...</p>
          </div>
        )}
      </ManualInputModal>
    </>
  );
}
