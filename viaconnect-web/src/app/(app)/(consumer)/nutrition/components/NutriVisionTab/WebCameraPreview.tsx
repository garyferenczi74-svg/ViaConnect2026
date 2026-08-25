'use client';

// Prompt 171a: full-viewport web camera preview overlay.
//
// Web getUserMedia path used to do headless first-frame capture which gave
// users no chance to compose the meal photograph. This component mounts the
// live video element so users can frame, then triggers a deliberate Capture
// + Review + Confirm flow before the result is handed back to the parent.
//
// Mobile native uses the @capacitor/camera plugin which opens the platform's
// own camera UI; this overlay is web-only. The parent (CameraCapture) is
// responsible for the platform detection.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Camera, Check, ImageUp, PenLine, RefreshCw, X } from 'lucide-react';
import {
  acquireWebCameraStream,
  webCameraStreamToJpeg,
  stopWebCameraStream,
  CaptureCancelledError,
  CAMERA_PERMISSION_USER_COPY,
  CAMERA_UNAVAILABLE_USER_COPY,
  type CaptureResult,
} from '@/lib/capacitor/camera-capture';
import { NUTRIVISION_START_STREAM_TIMEOUT_MS as START_STREAM_TIMEOUT_MS } from '@/lib/nutrition/stateContract228';

const NAVY = '#1A2744';
const CARD = '#1E3054';
const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';

export interface WebCameraPreviewProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (result: CaptureResult) => void;
  /** Max output edge in px (defaults to camera-capture.ts default). */
  maxEdgePx?: number;
  /** JPEG quality 0-100 (defaults to camera-capture.ts default). */
  jpegQuality?: number;
  /**
   * Brief 33: gallery picker with no capture attribute. Primary fail exit.
   */
  onUploadPhoto: () => void;
  /**
   * Brief 33: Log a Full Meal / MealCard. No blob required pre-capture.
   */
  onLogManually: () => void;
  /**
   * Prompt 190 / Brief 33: tertiary retry only. Native file input WITH
   * capture="environment". Never the only fail-path action.
   */
  onNativeFallback?: () => void;
}

// Prompt 228 D1: every transitional state must be timed and exitable.
type PreviewState =
  | 'initializing'
  | 'streaming'
  | 'captured'
  | 'permission_denied'
  | 'unsupported'
  | 'capture_error'
  | 'timed_out';

const CAMERA_TIMEOUT_USER_COPY =
  'Camera is taking too long to start. Upload a photo or log the meal manually.';
const CAMERA_CAPTURE_FAIL_COPY =
  'Could not capture a photo. Upload a photo or log the meal manually.';

interface MediaStreamLike {
  getTracks(): Array<{ stop(): void }>;
}

export function WebCameraPreview({
  open,
  onCancel,
  onConfirm,
  maxEdgePx,
  jpegQuality,
  onUploadPhoto,
  onLogManually,
  onNativeFallback,
}: WebCameraPreviewProps): JSX.Element | null {
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStreamLike | null>(null);
  const [state, setState] = useState<PreviewState>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [capturedResult, setCapturedResult] = useState<CaptureResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const teardownStream = useCallback(() => {
    if (streamRef.current) {
      stopWebCameraStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      teardownStream();
      setState('initializing');
      setError(null);
      setCapturedResult(null);
      setIsCapturing(false);
      return undefined;
    }
    let cancelled = false;
    setState('initializing');
    setError(null);
    setCapturedResult(null);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      teardownStream();
      setState('timed_out');
      setError(CAMERA_TIMEOUT_USER_COPY);
    }, START_STREAM_TIMEOUT_MS);

    (async () => {
      try {
        // Prefer permission state when available so prior denial fails fast.
        if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
          try {
            const perm = await navigator.permissions.query({
              name: 'camera' as PermissionName,
            });
            if (perm.state === 'denied') {
              if (cancelled) return;
              window.clearTimeout(timeoutId);
              setState('permission_denied');
              setError(CAMERA_PERMISSION_USER_COPY);
              return;
            }
          } catch {
            // Permissions API not supported for camera in this browser; continue.
          }
        }

        const stream = await acquireWebCameraStream({ facingMode: 'environment' });
        if (cancelled) {
          stopWebCameraStream(stream);
          return;
        }
        window.clearTimeout(timeoutId);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream as unknown as MediaStream;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay restrictions sometimes throw; user gesture below recovers.
          }
        }
        setState('streaming');
      } catch (err) {
        window.clearTimeout(timeoutId);
        if (cancelled) return;
        if (err instanceof CaptureCancelledError) {
          setState('permission_denied');
          setError(CAMERA_PERMISSION_USER_COPY);
        } else {
          setState('unsupported');
          setError(CAMERA_UNAVAILABLE_USER_COPY);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      teardownStream();
    };
  }, [open, teardownStream]);

  const handleCapture = useCallback(async () => {
    if (state !== 'streaming' || !streamRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const result = await webCameraStreamToJpeg(streamRef.current, {
        source: 'camera',
        maxEdgePx,
        jpegQuality,
      });
      setCapturedResult(result);
      setState('captured');
    } catch {
      setState('capture_error');
      setError(CAMERA_CAPTURE_FAIL_COPY);
    } finally {
      setIsCapturing(false);
    }
  }, [state, isCapturing, maxEdgePx, jpegQuality]);

  const handleRetake = useCallback(() => {
    setCapturedResult(null);
    setState('streaming');
  }, []);

  const handleConfirm = useCallback(() => {
    if (!capturedResult) return;
    const result = capturedResult;
    teardownStream();
    setCapturedResult(null);
    setState('initializing');
    onConfirm(result);
  }, [capturedResult, onConfirm, teardownStream]);

  const handleCancel = useCallback(() => {
    teardownStream();
    setCapturedResult(null);
    setState('initializing');
    onCancel();
  }, [onCancel, teardownStream]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[130] flex flex-col"
      style={{ backgroundColor: NAVY, color: '#FFFFFF' }}
    >
      <span id={titleId} className="sr-only">Frame your meal</span>

      {/* Camera feed fills the surface; review mode swaps in the captured image. */}
      <div className="absolute inset-0">
        {capturedResult ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:${capturedResult.mime};base64,${capturedResult.imageBase64}`}
            alt=""
            className="h-full w-full object-contain"
            style={{ backgroundColor: NAVY }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-hidden="true"
            className="h-full w-full object-cover"
            style={{ backgroundColor: '#000' }}
          />
        )}
      </div>

      {/* Top bar */}
      <header
        className="relative z-10 flex items-center justify-between px-4"
        style={{
          height: 56,
          paddingTop: 'env(safe-area-inset-top, 0)',
          background: 'linear-gradient(to bottom, rgba(26, 39, 68, 0.85), transparent)',
        }}
      >
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel and close camera"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: '#FFFFFF', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        >
          <X size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <div className="font-medium" style={{ fontSize: 15 }}>
          {capturedResult ? 'Review photo' : 'Frame your meal'}
        </div>
        <div className="w-11" aria-hidden="true" />
      </header>

      {/* Helper / instruction text */}
      {state === 'streaming' && (
        <div
          aria-live="polite"
          className="relative z-10 flex justify-center"
          style={{ marginTop: 8 }}
        >
          <span
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              fontSize: 13,
              color: '#FFFFFF',
            }}
          >
            Tap the button to capture
          </span>
        </div>
      )}

      {state === 'initializing' && (
        <div
          aria-live="polite"
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <div
            className="rounded-2xl px-6 py-4 text-center"
            style={{ backgroundColor: CARD, color: '#FFFFFF', fontSize: 14 }}
          >
            <p>Starting camera...</p>
            <button
              type="button"
              onClick={handleCancel}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center underline"
              style={{ color: TEAL, fontSize: 13 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {(state === 'permission_denied' ||
        state === 'unsupported' ||
        state === 'capture_error' ||
        state === 'timed_out') && (
        <div
          role="alert"
          data-camera-fail-actions="true"
          className="absolute inset-x-4 top-24 z-20 mx-auto max-w-md rounded-2xl p-4"
          style={{ backgroundColor: CARD, color: '#FFFFFF' }}
        >
          <p className="font-medium" style={{ fontSize: 14, color: ORANGE }}>
            {state === 'permission_denied'
              ? 'Camera permission needed'
              : state === 'timed_out'
                ? 'Camera timed out'
                : 'Camera unavailable'}
          </p>
          <p className="mt-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {error
              ?? (state === 'permission_denied'
                ? CAMERA_PERMISSION_USER_COPY
                : CAMERA_UNAVAILABLE_USER_COPY)}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={onUploadPhoto}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold"
              style={{ backgroundColor: TEAL, color: '#FFFFFF', fontSize: 14 }}
            >
              <ImageUp size={16} strokeWidth={1.5} aria-hidden="true" />
              Upload a photo
            </button>
            <button
              type="button"
              onClick={onLogManually}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold"
              style={{
                backgroundColor: 'transparent',
                border: `1.5px solid ${TEAL}`,
                color: TEAL,
                fontSize: 14,
              }}
            >
              <PenLine size={16} strokeWidth={1.5} aria-hidden="true" />
              Log manually
            </button>
            {onNativeFallback && (
              <button
                type="button"
                onClick={onNativeFallback}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 px-2 text-sm font-medium"
                style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 }}
              >
                Use device camera
              </button>
            )}
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex min-h-[44px] items-center justify-center underline"
              style={{ color: TEAL, fontSize: 13 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <footer
        className="relative z-10 mt-auto flex items-center justify-center"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 24px)',
          paddingTop: 24,
          background: 'linear-gradient(to top, rgba(26, 39, 68, 0.85), transparent)',
        }}
      >
        {capturedResult ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleRetake}
              aria-label="Retake photo"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                color: '#FFFFFF',
                fontSize: 14,
              }}
            >
              <RefreshCw size={16} strokeWidth={1.5} aria-hidden="true" />
              Retake
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              aria-label="Use this photo"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold"
              style={{
                backgroundColor: TEAL,
                color: '#FFFFFF',
                fontSize: 14,
              }}
            >
              <Check size={16} strokeWidth={1.5} aria-hidden="true" />
              Use this photo
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCapture}
            disabled={state !== 'streaming' || isCapturing}
            aria-label="Capture photo"
            className="inline-flex items-center justify-center rounded-full disabled:opacity-50"
            style={{
              backgroundColor: TEAL,
              color: '#FFFFFF',
              width: 72,
              height: 72,
              boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.25)',
            }}
          >
            <Camera size={28} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </footer>
    </div>
  );
}
