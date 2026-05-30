/**
 * Web Speech API wrapper per Prompt 170j §3.1.
 *
 * Probes `window.SpeechRecognition ?? window.webkitSpeechRecognition` per
 * the existing precedent at src/components/caq/VoiceInput.tsx.
 * Ambient TypeScript declarations come from src/types/speech-recognition.d.ts
 * (already shipped from Prompt 160).
 *
 * Mobile Safari + mobile Chrome both support this API; Firefox does not.
 */

'use client';

import { VOICE_CAPTURE_MAX_SECONDS } from '../feature-flags';
import type {
  STTCaptureHandle,
  STTCaptureOptions,
  STTError,
  STTProviderClient,
} from './types';

function getConstructor(): typeof SpeechRecognition | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function isAvailable(): boolean {
  return getConstructor() !== undefined;
}

async function startCapture(
  options: STTCaptureOptions
): Promise<STTCaptureHandle> {
  const Ctor = getConstructor();
  if (!Ctor) {
    options.onError({
      kind: 'service_unavailable',
      message: 'Web Speech API not available in this browser',
    });
    return { stop: () => {}, cancel: () => {} };
  }

  const recog = new Ctor();
  recog.continuous = false;
  recog.interimResults = true;
  recog.lang = options.language ?? 'en-US';
  recog.maxAlternatives = 1;

  let cancelled = false;
  let finalTranscript = '';
  let finalConfidence: number | null = null;
  let captureTimeout: ReturnType<typeof setTimeout> | null = null;

  const cleanup = (): void => {
    if (captureTimeout) {
      clearTimeout(captureTimeout);
      captureTimeout = null;
    }
  };

  recog.onresult = (event: SpeechRecognitionEvent): void => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const alt = result[0];
      if (result.isFinal) {
        finalTranscript += alt.transcript;
        finalConfidence = alt.confidence ?? null;
      } else {
        interim += alt.transcript;
      }
    }
    if (options.onUpdate) {
      options.onUpdate({
        is_final: false,
        transcript: finalTranscript + interim,
        stt_confidence: null,
      });
    }
  };

  recog.onend = (): void => {
    cleanup();
    if (cancelled) return;
    const trimmed = finalTranscript.trim();
    if (!trimmed) {
      options.onError({ kind: 'no_speech_detected', message: 'No speech detected' });
      return;
    }
    options.onComplete({
      is_final: true,
      transcript: trimmed,
      stt_confidence: finalConfidence,
    });
  };

  recog.onerror = (event: SpeechRecognitionErrorEvent): void => {
    cleanup();
    if (cancelled) return;
    options.onError(mapWebSpeechError(event.error));
  };

  try {
    recog.start();
  } catch (err) {
    cleanup();
    options.onError({
      kind: 'audio_capture_failed',
      message: err instanceof Error ? err.message : 'Failed to start capture',
    });
    return { stop: () => {}, cancel: () => {} };
  }

  captureTimeout = setTimeout(() => {
    try {
      recog.stop();
    } catch {
      // ignore
    }
  }, VOICE_CAPTURE_MAX_SECONDS * 1000);

  return {
    stop: () => {
      try {
        recog.stop();
      } catch {
        // ignore
      }
    },
    cancel: () => {
      cancelled = true;
      cleanup();
      try {
        recog.abort();
      } catch {
        // ignore
      }
    },
  };
}

function mapWebSpeechError(code: string): STTError {
  switch (code) {
    case 'no-speech':
      return { kind: 'no_speech_detected', message: 'No speech detected' };
    case 'audio-capture':
      return { kind: 'audio_capture_failed', message: 'Microphone audio capture failed' };
    case 'not-allowed':
    case 'service-not-allowed':
      return { kind: 'permission_denied', message: 'Microphone permission denied' };
    case 'aborted':
      return { kind: 'aborted', message: 'Capture aborted' };
    case 'network':
      return { kind: 'network_error', message: 'Network error during recognition' };
    default:
      return { kind: 'service_unavailable', message: `Speech recognition error: ${code}` };
  }
}

export const webSpeechProvider: STTProviderClient = {
  isAvailable,
  startCapture,
};
