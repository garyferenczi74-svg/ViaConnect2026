/**
 * Prompt 231 Task 15: voice-preference default-ON + localStorage persistence
 * contract (src/lib/scan/voicePreference.ts), exercised against a real
 * in-memory Storage-like object (no DOM required, no mocking of the module
 * under test).
 */

import { describe, it, expect } from 'vitest';
import {
  VOICE_STORAGE_KEY,
  readVoicePreference,
  writeVoicePreference,
  type VoiceStorageLike,
} from '@/lib/scan/voicePreference';

function makeStorage(): VoiceStorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe('voicePreference - default ON', () => {
  it('reads true when nothing has ever been stored', () => {
    expect(readVoicePreference(makeStorage())).toBe(true);
  });

  it('reads true when no storage is available at all', () => {
    expect(readVoicePreference(undefined)).toBe(true);
  });
});

describe('voicePreference - persists to/from storage', () => {
  it('round trips OFF through the real storage key', () => {
    const storage = makeStorage();
    writeVoicePreference(false, storage);
    expect(storage.getItem(VOICE_STORAGE_KEY)).toBe('0');
    expect(readVoicePreference(storage)).toBe(false);
  });

  it('round trips ON explicitly after having been turned off', () => {
    const storage = makeStorage();
    writeVoicePreference(false, storage);
    writeVoicePreference(true, storage);
    expect(storage.getItem(VOICE_STORAGE_KEY)).toBe('1');
    expect(readVoicePreference(storage)).toBe(true);
  });

  it('a storage that throws on getItem still resolves to the ON default', () => {
    const throwing: VoiceStorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    };
    expect(readVoicePreference(throwing)).toBe(true);
  });

  it('a storage that throws on setItem does not throw out of writeVoicePreference', () => {
    const throwing: VoiceStorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => writeVoicePreference(false, throwing)).not.toThrow();
  });
});
