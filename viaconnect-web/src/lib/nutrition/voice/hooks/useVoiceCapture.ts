/**
 * STT capture hook per Prompt 170j §11.2.
 *
 * Orchestrates provider selection + capture lifecycle + state for the
 * VoiceCaptureOverlay component.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeviceKind, STTProvider } from '../types';
import { detectDeviceKind, selectSTTProvider } from '../stt/orchestrator';
import type { STTCaptureHandle, STTError } from '../stt/types';

export type CaptureStatus = 'idle' | 'capturing' | 'processing' | 'error' | 'completed';

export interface VoiceCaptureState {
  status: CaptureStatus;
  transcript: string;
  is_streaming_transcript: boolean;
  stt_confidence: number | null;
  stt_provider: STTProvider | null;
  device_kind: DeviceKind;
  error: STTError | null;
  capture_started_at: number | null;
}

export interface UseVoiceCaptureReturn {
  state: VoiceCaptureState;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  cancelCapture: () => void;
  reset: () => void;
}

const INITIAL_STATE: VoiceCaptureState = {
  status: 'idle',
  transcript: '',
  is_streaming_transcript: false,
  stt_confidence: null,
  stt_provider: null,
  device_kind: 'web_desktop',
  error: null,
  capture_started_at: null,
};

export function useVoiceCapture(): UseVoiceCaptureReturn {
  const [state, setState] = useState<VoiceCaptureState>(INITIAL_STATE);
  const handleRef = useRef<STTCaptureHandle | null>(null);

  useEffect(() => {
    setState((s) => ({ ...s, device_kind: detectDeviceKind() }));
  }, []);

  const startCapture = useCallback(async (): Promise<void> => {
    setState((s) => ({
      ...s,
      status: 'capturing',
      transcript: '',
      error: null,
      capture_started_at: Date.now(),
    }));

    const selected = await selectSTTProvider();
    if (!selected) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: {
          kind: 'service_unavailable',
          message: 'No speech recognition available',
        },
      }));
      return;
    }

    setState((s) => ({ ...s, stt_provider: selected.provider }));

    handleRef.current = await selected.client.startCapture({
      onUpdate: (u) => {
        setState((s) => ({
          ...s,
          transcript: u.transcript,
          is_streaming_transcript: true,
        }));
      },
      onComplete: (u) => {
        setState((s) => ({
          ...s,
          status: 'completed',
          transcript: u.transcript,
          stt_confidence: u.stt_confidence,
        }));
        handleRef.current = null;
      },
      onError: (err) => {
        setState((s) => ({ ...s, status: 'error', error: err }));
        handleRef.current = null;
      },
    });
  }, []);

  const stopCapture = useCallback((): void => {
    if (handleRef.current) {
      setState((s) => ({ ...s, status: 'processing' }));
      handleRef.current.stop();
    }
  }, []);

  const cancelCapture = useCallback((): void => {
    if (handleRef.current) {
      handleRef.current.cancel();
      handleRef.current = null;
    }
    setState((s) => ({ ...s, status: 'idle', transcript: '' }));
  }, []);

  const reset = useCallback((): void => {
    if (handleRef.current) {
      handleRef.current.cancel();
      handleRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  return { state, startCapture, stopCapture, cancelCapture, reset };
}
