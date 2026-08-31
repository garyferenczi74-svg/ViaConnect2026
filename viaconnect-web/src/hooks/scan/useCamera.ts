// Prompt 231 FormaVision 4-pose scan: camera acquisition hook for the scan
// flow. Reuses the shared web camera helpers from
// src/lib/capacitor/camera-capture.ts (acquireWebCameraStream,
// getGrantedResolution, stopWebCameraStream, isCameraPermissionFailure);
// their getUserMedia logic, fallback retry, and honest-copy error mapping
// are NOT duplicated here.
//
// iOS gesture chain: openWebCamera() below calls
// acquireWebCameraStream() as its first statement, with no prior await and
// no navigator.permissions.query call. That keeps the shared helper's only
// suspension point (the getUserMedia call itself) the first async work done
// off the Start-tap click, so Safari still treats the request as
// user-gesture-initiated. Permission state here is derived only from the
// outcome of that call (isCameraPermissionFailure), never queried ahead of
// it; a pre-Start Setup screen that wants an earlier read is expected to
// call navigator.permissions.query itself, outside this hook.
//
// openWebCamera / classifyOpenCameraFailure are exported as plain functions
// (not hooks) so the acquisition-order guarantee is unit-testable without a
// React renderer, mirroring the pure-function + thin-hook split already
// used by scanReducer/useScanSession and tickState/useCountdown in this
// directory.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  acquireWebCameraStream,
  getGrantedResolution,
  isCameraPermissionFailure,
  stopWebCameraStream,
  CaptureUnsupportedError,
  CAMERA_UNAVAILABLE_USER_COPY,
  type MediaStreamLike,
} from '@/lib/capacitor/camera-capture';

export type CameraPermissionState = 'unknown' | 'granted' | 'denied';

export interface OpenCameraResult {
  stream: MediaStreamLike;
  granted: { width: number; height: number };
}

export interface OpenCameraFailure {
  error: string;
  permission: CameraPermissionState;
}

// FormaVision requests a 1080p ideal; acquireWebCameraStream degrades
// gracefully (the browser grants whatever it can, getGrantedResolution
// reports the honest outcome).
const FORMAVISION_IDEAL_WIDTH = 1920;
const FORMAVISION_IDEAL_HEIGHT = 1080;

export async function openWebCamera(
  facingMode: 'environment' | 'user',
): Promise<OpenCameraResult> {
  const stream = await acquireWebCameraStream({
    facingMode,
    width: FORMAVISION_IDEAL_WIDTH,
    height: FORMAVISION_IDEAL_HEIGHT,
  });
  return { stream, granted: getGrantedResolution(stream) };
}

// acquireWebCameraStream already maps getUserMedia failures to honest
// CaptureCancelledError/CaptureUnsupportedError copy (never a raw
// DOMException.message), so this only classifies permission state and
// carries the message through.
export function classifyOpenCameraFailure(err: unknown): OpenCameraFailure {
  return {
    error: err instanceof Error ? err.message : CAMERA_UNAVAILABLE_USER_COPY,
    permission: isCameraPermissionFailure(err) ? 'denied' : 'unknown',
  };
}

export interface BindableVideo {
  srcObject: unknown;
  play: () => Promise<void>;
}

/** Re-attach a live stream to a (possibly remounted) video element.
 * CameraPreview unmounts/remounts across scan phases; open() only binds
 * once, so without this a later grabStill draws a dead frame. */
export function bindStreamToVideo(
  video: BindableVideo | null,
  stream: unknown,
): boolean {
  if (!video || !stream) return false;
  if (video.srcObject === stream) return true;
  video.srcObject = stream;
  void video.play().catch(() => undefined);
  return true;
}

export interface UseCameraResult {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStreamLike | null;
  granted: { width: number; height: number };
  permission: CameraPermissionState;
  error: string | null;
  open: () => Promise<void>;
  stop: () => void;
  grabStill: () => Promise<{ blob: Blob; width: number; height: number }>;
}

export function useCamera({
  facingMode,
}: {
  facingMode?: 'environment' | 'user';
} = {}): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStreamLike | null>(null);
  const [stream, setStream] = useState<MediaStreamLike | null>(null);
  const [granted, setGranted] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [permission, setPermission] = useState<CameraPermissionState>('unknown');
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async () => {
    setError(null);
    try {
      // No prior await, no navigator.permissions.query: this is the first
      // statement, matching the iOS gesture-chain requirement above.
      const acquired = await openWebCamera(facingMode ?? 'environment');
      streamRef.current = acquired.stream;
      setStream(acquired.stream);
      setGranted(acquired.granted);
      setPermission('granted');
      bindStreamToVideo(videoRef.current, acquired.stream);
    } catch (err) {
      const failure = classifyOpenCameraFailure(err);
      setError(failure.error);
      setPermission(failure.permission);
    }
  }, [facingMode]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      stopWebCameraStream(streamRef.current);
    }
    streamRef.current = null;
    setStream(null);
    setGranted({ width: 0, height: 0 });
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  // Rebind when stream identity changes. Video remounts are handled by
  // CameraPreview calling bindStreamToVideo on mount (this effect does
  // not re-run when only the <video> node is new).
  useEffect(() => {
    bindStreamToVideo(videoRef.current, stream);
  }, [stream]);

  // Release the camera on unmount even if the caller forgets to call stop().
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        stopWebCameraStream(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

  const grabStill = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      throw new CaptureUnsupportedError('Camera preview is not mounted');
    }
    const width = video.videoWidth || granted.width;
    const height = video.videoHeight || granted.height;
    if (width < 8 || height < 8) {
      throw new CaptureUnsupportedError('Still capture failed');
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new CaptureUnsupportedError('2D canvas context unavailable');
    }
    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });
    if (!blob) {
      throw new CaptureUnsupportedError('Still capture failed');
    }
    return { blob, width, height };
  }, [granted]);

  return { videoRef, stream, granted, permission, error, open, stop, grabStill };
}
