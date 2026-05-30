/**
 * Server-side Gemini Audio STT fallback per Prompt 170j §3.2.
 *
 * Client-side wrapper: records audio via MediaRecorder, posts it to
 * /api/nutrition/voice/transcribe, returns the transcript.
 *
 * No audio is retained at the server boundary per §13.1 contract.
 * This wrapper does NOT write audio to localStorage or any persistent
 * client storage either; the blob is held in memory only for the upload
 * and dropped immediately after.
 */

'use client';

import { VOICE_CAPTURE_MAX_SECONDS } from '../feature-flags';
import type {
  STTCaptureHandle,
  STTCaptureOptions,
  STTProviderClient,
} from './types';

function isAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof MediaRecorder === 'undefined') return false;
  if (!navigator?.mediaDevices?.getUserMedia) return false;
  return true;
}

async function startCapture(
  options: STTCaptureOptions
): Promise<STTCaptureHandle> {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let cancelled = false;
  let captureTimeout: ReturnType<typeof setTimeout> | null = null;

  const cleanup = (): void => {
    if (captureTimeout) {
      clearTimeout(captureTimeout);
      captureTimeout = null;
    }
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      stream = null;
    }
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    options.onError({
      kind: 'permission_denied',
      message: err instanceof Error ? err.message : 'Microphone access denied',
    });
    return { stop: () => {}, cancel: () => {} };
  }

  try {
    recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
  } catch (err) {
    cleanup();
    options.onError({
      kind: 'audio_capture_failed',
      message: err instanceof Error ? err.message : 'MediaRecorder init failed',
    });
    return { stop: () => {}, cancel: () => {} };
  }

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    cleanup();
    if (cancelled) return;
    const blob = new Blob(chunks, {
      type: recorder?.mimeType ?? 'audio/webm',
    });
    if (blob.size === 0) {
      options.onError({ kind: 'no_speech_detected', message: 'No audio captured' });
      return;
    }
    void uploadForTranscription(blob, options);
  };

  recorder.onerror = () => {
    cleanup();
    if (cancelled) return;
    options.onError({ kind: 'audio_capture_failed', message: 'Recorder error' });
  };

  recorder.start();

  captureTimeout = setTimeout(() => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, VOICE_CAPTURE_MAX_SECONDS * 1000);

  return {
    stop: () => {
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    },
    cancel: () => {
      cancelled = true;
      chunks = [];
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
      cleanup();
    },
  };
}

async function uploadForTranscription(
  blob: Blob,
  options: STTCaptureOptions
): Promise<void> {
  try {
    const form = new FormData();
    form.append('audio', blob, `voice-${Date.now()}.webm`);
    form.append('language', options.language ?? 'en-US');

    const resp = await fetch('/api/nutrition/voice/transcribe', {
      method: 'POST',
      body: form,
    });

    if (!resp.ok) {
      options.onError({
        kind: 'service_unavailable',
        message: `Transcribe service returned ${resp.status}`,
      });
      return;
    }

    const data = (await resp.json()) as {
      transcript?: string;
      stt_confidence?: number | null;
      audio_retained?: boolean;
    };

    const transcript = data.transcript?.trim() ?? '';
    if (!transcript) {
      options.onError({ kind: 'no_speech_detected', message: 'Empty transcript' });
      return;
    }

    options.onComplete({
      is_final: true,
      transcript,
      stt_confidence: data.stt_confidence ?? null,
    });
  } catch (err) {
    options.onError({
      kind: 'network_error',
      message: err instanceof Error ? err.message : 'Upload failed',
    });
  }
}

function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
  ];
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'audio/webm';
}

export const geminiAudioProvider: STTProviderClient = {
  isAvailable,
  startCapture,
};
