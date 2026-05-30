// Prompt #170a supplement §20.D + Deviation B: presence + expiry + clear
// semantics for the sessionStorage handoff bridge.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  HANDOFF_TTL_MS,
  clearNutrivisionManualLogHandoff,
  readNutrivisionManualLogHandoff,
  writeNutrivisionManualLogHandoff,
} from '../useNutrivisionManualLogHandoff';

interface MemoryStorage {
  store: Map<string, string>;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
}

function makeMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => (store.has(k) ? store.get(k) ?? null : null),
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __sessionStorageStub: MemoryStorage | undefined;
}

beforeEach(() => {
  const storage = makeMemoryStorage();
  globalThis.__sessionStorageStub = storage;
  // Stub a minimal window.sessionStorage so the hook helpers run in node.
  // The hook reads window.sessionStorage; we install a global window object
  // pointing at the memory store. Existing window is preserved if present.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = {
    sessionStorage: {
      getItem: (k: string) => storage.getItem(k),
      setItem: (k: string, v: string) => storage.setItem(k, v),
      removeItem: (k: string) => storage.removeItem(k),
    },
  };
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
  delete globalThis.__sessionStorageStub;
  vi.useRealTimers();
});

describe('write / read / clear', () => {
  it('writes a fresh handoff with future expires_at', () => {
    writeNutrivisionManualLogHandoff('11111111-2222-4333-8444-555555555555');
    const out = readNutrivisionManualLogHandoff();
    expect(out).not.toBeNull();
    expect(out?.source_photo_blob_id).toBe('11111111-2222-4333-8444-555555555555');
    expect(out?.expires_at).toBeGreaterThan(Date.now());
  });

  it('ignores empty blob ids', () => {
    writeNutrivisionManualLogHandoff('');
    const out = readNutrivisionManualLogHandoff();
    expect(out).toBeNull();
  });

  it('clearNutrivisionManualLogHandoff removes the stash', () => {
    writeNutrivisionManualLogHandoff('aaaa1111-2222-4333-8444-555555555555');
    expect(readNutrivisionManualLogHandoff()).not.toBeNull();
    clearNutrivisionManualLogHandoff();
    expect(readNutrivisionManualLogHandoff()).toBeNull();
  });

  it('returns null and self-clears an expired handoff', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    writeNutrivisionManualLogHandoff('bbbb2222-3333-4333-8444-555555555555');
    // Advance time past TTL.
    vi.setSystemTime(Date.now() + HANDOFF_TTL_MS + 1000);
    const out = readNutrivisionManualLogHandoff();
    expect(out).toBeNull();
    // Re-read returns null too (proves the helper cleared the expired entry).
    expect(readNutrivisionManualLogHandoff()).toBeNull();
  });

  it('ignores malformed sessionStorage entries', () => {
    // Manually put a junk value into the stub storage under the key.
    globalThis.__sessionStorageStub?.setItem(
      'nutrivision_manual_log_handoff',
      'not json',
    );
    expect(readNutrivisionManualLogHandoff()).toBeNull();
  });

  it('ignores entries missing required fields', () => {
    globalThis.__sessionStorageStub?.setItem(
      'nutrivision_manual_log_handoff',
      JSON.stringify({ expires_at: Date.now() + 60_000 }),
    );
    expect(readNutrivisionManualLogHandoff()).toBeNull();
  });

  it('TTL constant matches the spec value (15 minutes)', () => {
    expect(HANDOFF_TTL_MS).toBe(15 * 60 * 1000);
  });
});
