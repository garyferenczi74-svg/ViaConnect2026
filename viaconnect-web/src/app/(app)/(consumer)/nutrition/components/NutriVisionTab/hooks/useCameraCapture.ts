'use client';

// Prompt #170 Phase 1l: capture hook that wraps lib/capacitor/camera-capture.
//
// Thin facade around captureMealPhoto so the NutriVisionTab can stay declarative.
// Tracks the in-flight state + the most recent CaptureResult + any error string
// translated for user display. The hook never throws; consumers read `error`.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useRef, useState } from 'react';
import {
  captureMealPhoto,
  CaptureCancelledError,
  CaptureUnsupportedError,
  type CaptureResult,
  type CaptureSource,
} from '@/lib/capacitor/camera-capture';
import { NUTRIVISION_CAMERA_CAPTURE_TIMEOUT_MS } from '@/lib/nutrition/stateContract228';

export interface UseCameraCaptureReturn {
  capture: (source: CaptureSource) => Promise<CaptureResult | null>;
  isCapturing: boolean;
  lastCapture: CaptureResult | null;
  error: string | null;
  reset: () => void;
}

function userMessageFor(err: unknown): string {
  if (err instanceof CaptureCancelledError) {
    return 'Capture cancelled.';
  }
  if (err instanceof CaptureUnsupportedError) {
    return 'Camera is not available on this device. Try uploading a photo.';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Could not capture a photo. Try again.';
}

export function useCameraCapture(): UseCameraCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<CaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guard against overlapping calls (double-tap, etc.).
  const inFlight = useRef<boolean>(false);

  const capture = useCallback(async (source: CaptureSource): Promise<CaptureResult | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setIsCapturing(true);
    setError(null);
    try {
      const pending = captureMealPhoto({ source });
      let result: CaptureResult;
      if (source === 'camera') {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          result = await Promise.race([
            pending,
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                reject(new Error('Camera is taking too long. Close and try again, or upload a photo.'));
              }, NUTRIVISION_CAMERA_CAPTURE_TIMEOUT_MS);
            }),
          ]);
        } finally {
          if (timer !== undefined) clearTimeout(timer);
        }
      } else {
        result = await pending;
      }
      setLastCapture(result);
      return result;
    } catch (err) {
      setError(userMessageFor(err));
      return null;
    } finally {
      setIsCapturing(false);
      inFlight.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setLastCapture(null);
    setError(null);
    setIsCapturing(false);
    inFlight.current = false;
  }, []);

  return { capture, isCapturing, lastCapture, error, reset };
}
