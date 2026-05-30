/**
 * STT path orchestrator per Prompt 170j §3.
 *
 * Selection order:
 *   1. Capacitor native (when running inside the native shell)
 *   2. Web Speech API (when in a browser that supports it)
 *   3. Gemini Audio server fallback (when client-side unavailable
 *      AND VOICE_EDIT_SERVER_STT_ENABLED is true)
 *
 * Returns the selected provider plus the STTProvider enum value for
 * telemetry tagging.
 */

'use client';

import { readVoiceFeatureFlags } from '../feature-flags';
import type { DeviceKind, STTProvider } from '../types';
import { capacitorNativeProvider } from './capacitor-native';
import { geminiAudioProvider } from './gemini-audio';
import type { STTProviderClient } from './types';
import { webSpeechProvider } from './web-speech';

export interface SelectedProvider {
  client: STTProviderClient;
  provider: STTProvider;
}

function isCapacitorNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (
    window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export async function selectSTTProvider(): Promise<SelectedProvider | null> {
  const flags = readVoiceFeatureFlags();

  if (isCapacitorNativeShell()) {
    const ok = await Promise.resolve(capacitorNativeProvider.isAvailable());
    if (ok) {
      return { client: capacitorNativeProvider, provider: 'capacitor_native' };
    }
  }

  if (webSpeechProvider.isAvailable()) {
    return { client: webSpeechProvider, provider: 'web_speech_api' };
  }

  if (flags.serverSttFallbackEnabled && geminiAudioProvider.isAvailable()) {
    return { client: geminiAudioProvider, provider: 'gemini_audio' };
  }

  return null;
}

export function detectDeviceKind(): DeviceKind {
  if (typeof window === 'undefined') return 'web_desktop';
  const cap = (
    window as unknown as { Capacitor?: { getPlatform?: () => string } }
  ).Capacitor;
  const platform = cap?.getPlatform?.();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod/.test(ua);
  return isMobile ? 'web_mobile' : 'web_desktop';
}
