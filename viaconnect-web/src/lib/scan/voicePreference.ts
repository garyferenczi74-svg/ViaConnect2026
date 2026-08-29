// Prompt 231: pure read/write for the voice-countdown preference, extracted
// out of ScanExperience.tsx so the default-ON + persist contract is unit
// testable without a DOM. storage is injectable (defaults to
// window.localStorage) so tests exercise the real logic against a real
// Storage-like object rather than a mock of this module itself.

export const VOICE_STORAGE_KEY = 'formavision.scan.voice';

export interface VoiceStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function resolveStorage(storage?: VoiceStorageLike): VoiceStorageLike | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

/** Default ON for a first scan (no stored value yet). Any storage failure
 * (private browsing, quota, disabled storage) also falls back to ON rather
 * than silently disabling voice. */
export function readVoicePreference(storage?: VoiceStorageLike): boolean {
  const s = resolveStorage(storage);
  if (!s) return true;
  try {
    const stored = s.getItem(VOICE_STORAGE_KEY);
    if (stored === null) return true;
    return stored === '1';
  } catch {
    return true;
  }
}

export function writeVoicePreference(enabled: boolean, storage?: VoiceStorageLike): void {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.setItem(VOICE_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // benign: private browsing / storage blocked
  }
}
