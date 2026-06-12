/**
 * Capacitor speech-recognition plugin wrapper per Prompt 170j §3.1.
 *
 * Dynamic-imported per the existing precedent at
 * src/lib/capacitor/camera-capture.ts so web-only builds where the
 * plugin is absent from node_modules do not fail at typecheck.
 *
 * iOS wraps SFSpeechRecognizer (requires NSSpeechRecognitionUsageDescription
 * and NSMicrophoneUsageDescription in Info.plist, added 2026-05-30).
 * Android wraps android.speech.SpeechRecognizer (requires RECORD_AUDIO
 * permission in AndroidManifest, added 2026-05-30).
 */

'use client';

import type { SpeechRecognitionPlugin } from '@capacitor-community/speech-recognition';
import { VOICE_CAPTURE_MAX_SECONDS } from '../feature-flags';
import type {
  STTCaptureHandle,
  STTCaptureOptions,
  STTProviderClient,
} from './types';

let cachedPlugin: SpeechRecognitionPlugin | null | undefined;

async function loadPlugin(): Promise<SpeechRecognitionPlugin | null> {
  if (cachedPlugin !== undefined) return cachedPlugin;
  try {
    const mod = await import('@capacitor-community/speech-recognition');
    cachedPlugin = mod.SpeechRecognition ?? null;
  } catch {
    cachedPlugin = null;
  }
  return cachedPlugin;
}

async function isAvailable(): Promise<boolean> {
  const plugin = await loadPlugin();
  if (!plugin) return false;
  try {
    const res = await plugin.available();
    return Boolean(res.available);
  } catch {
    return false;
  }
}

async function startCapture(
  options: STTCaptureOptions
): Promise<STTCaptureHandle> {
  const plugin = await loadPlugin();
  if (!plugin) {
    options.onError({
      kind: 'service_unavailable',
      message: 'Native speech plugin not installed',
    });
    return { stop: () => {}, cancel: () => {} };
  }

  try {
    const perm = await plugin.checkPermissions();
    if (perm.speechRecognition !== 'granted') {
      const recheck = await plugin.requestPermissions();
      if (recheck.speechRecognition !== 'granted') {
        options.onError({
          kind: 'permission_denied',
          message: 'Microphone permission denied',
        });
        return { stop: () => {}, cancel: () => {} };
      }
    }
  } catch (err) {
    options.onError({
      kind: 'permission_denied',
      message: err instanceof Error ? err.message : 'Permission check failed',
    });
    return { stop: () => {}, cancel: () => {} };
  }

  let cancelled = false;
  let captureTimeout: ReturnType<typeof setTimeout> | null = null;
  let listenerHandle: { remove: () => Promise<void> } | null = null;

  const cleanup = async (): Promise<void> => {
    if (captureTimeout) {
      clearTimeout(captureTimeout);
      captureTimeout = null;
    }
    if (listenerHandle) {
      try {
        await listenerHandle.remove();
      } catch {
        // ignore
      }
      listenerHandle = null;
    }
  };

  if (options.onUpdate) {
    try {
      listenerHandle = await plugin.addListener('partialResults', (data) => {
        const partial = data.matches?.[0] ?? '';
        options.onUpdate?.({
          is_final: false,
          transcript: partial,
          stt_confidence: null,
        });
      });
    } catch {
      // partial results unavailable on this device; final-only fallback
    }
  }

  captureTimeout = setTimeout(() => {
    plugin.stop().catch(() => {});
  }, VOICE_CAPTURE_MAX_SECONDS * 1000);

  plugin
    .start({
      language: options.language ?? 'en-US',
      maxResults: 1,
      partialResults: Boolean(options.onUpdate),
      popup: false,
    })
    .then(async (result) => {
      await cleanup();
      if (cancelled) return;
      const transcript = result.matches?.[0]?.trim() ?? '';
      if (!transcript) {
        options.onError({ kind: 'no_speech_detected', message: 'No speech detected' });
        return;
      }
      options.onComplete({ is_final: true, transcript, stt_confidence: null });
    })
    .catch(async (err) => {
      await cleanup();
      if (cancelled) return;
      options.onError({
        kind: 'audio_capture_failed',
        message: err instanceof Error ? err.message : 'Native recognition failed',
      });
    });

  return {
    stop: () => {
      plugin.stop().catch(() => {});
    },
    cancel: () => {
      cancelled = true;
      cleanup().catch(() => {});
      plugin.stop().catch(() => {});
    },
  };
}

export const capacitorNativeProvider: STTProviderClient = {
  isAvailable,
  startCapture,
};
