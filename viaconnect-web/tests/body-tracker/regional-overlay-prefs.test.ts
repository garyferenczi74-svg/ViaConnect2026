// Tests for the regional overlay preference serialization + localStorage store
// (ViaConnect Prompt #169e(a), Section 7). Pure / storage-stub only; no DOM.
// This proves the no-migration client-side persistence is robust to malformed
// input and round-trips cleanly.

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_REGIONAL_OVERLAY_PREFS,
  regionalOverlayPrefsKey,
  parseRegionalOverlayPrefs,
  serializeRegionalOverlayPrefs,
  readRegionalOverlayPrefs,
  writeRegionalOverlayPrefs,
  type RegionalOverlayPrefs,
} from '@/lib/body-tracker/regional-overlay-prefs';

function memStorage(): Pick<Storage, 'getItem' | 'setItem'> & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
  };
}

describe('regionalOverlayPrefsKey', () => {
  it('namespaces per user id', () => {
    expect(regionalOverlayPrefsKey('abc')).toBe('viaconnect.bodyTracker.regionalOverlay.abc');
    expect(regionalOverlayPrefsKey('abc')).not.toBe(regionalOverlayPrefsKey('xyz'));
  });
});

describe('parseRegionalOverlayPrefs', () => {
  it('returns defaults for null / empty / garbage', () => {
    expect(parseRegionalOverlayPrefs(null)).toEqual(DEFAULT_REGIONAL_OVERLAY_PREFS);
    expect(parseRegionalOverlayPrefs('')).toEqual(DEFAULT_REGIONAL_OVERLAY_PREFS);
    expect(parseRegionalOverlayPrefs('not json{')).toEqual(DEFAULT_REGIONAL_OVERLAY_PREFS);
    expect(parseRegionalOverlayPrefs('123')).toEqual(DEFAULT_REGIONAL_OVERLAY_PREFS);
  });

  it('fills missing fields with defaults per field', () => {
    expect(parseRegionalOverlayPrefs('{"enabled":true}')).toEqual({
      enabled: true,
      chosenPattern: null,
      optedInDespiteSuppression: false,
    });
  });

  it('collapses an unknown pattern to null (derive from sex)', () => {
    expect(parseRegionalOverlayPrefs('{"chosenPattern":"nonsense"}').chosenPattern).toBeNull();
    expect(parseRegionalOverlayPrefs('{"chosenPattern":"female"}').chosenPattern).toBe('female');
  });

  it('round-trips a full prefs object', () => {
    const prefs: RegionalOverlayPrefs = {
      enabled: true,
      chosenPattern: 'averaged',
      optedInDespiteSuppression: true,
    };
    expect(parseRegionalOverlayPrefs(serializeRegionalOverlayPrefs(prefs))).toEqual(prefs);
  });
});

describe('read/write with a storage stub', () => {
  it('defaults when storage is null', () => {
    expect(readRegionalOverlayPrefs(null, 'u1')).toEqual(DEFAULT_REGIONAL_OVERLAY_PREFS);
  });

  it('persists and reads back per user', () => {
    const storage = memStorage();
    const prefs: RegionalOverlayPrefs = {
      enabled: true,
      chosenPattern: 'male',
      optedInDespiteSuppression: false,
    };
    writeRegionalOverlayPrefs(storage, 'u1', prefs);
    expect(readRegionalOverlayPrefs(storage, 'u1')).toEqual(prefs);
    // A different user is unaffected (isolation).
    expect(readRegionalOverlayPrefs(storage, 'u2')).toEqual(DEFAULT_REGIONAL_OVERLAY_PREFS);
  });

  it('write never throws on a throwing storage', () => {
    const throwing: Pick<Storage, 'setItem'> = {
      setItem: () => { throw new Error('quota'); },
    };
    expect(() => writeRegionalOverlayPrefs(throwing, 'u1', DEFAULT_REGIONAL_OVERLAY_PREFS)).not.toThrow();
  });
});
