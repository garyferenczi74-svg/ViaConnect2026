// Prompt 211a W1: tests for the consumer-only Helix first-share moment logic AND
// the read-only economy contract (Helix is NEVER written from the clip surface).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shouldCelebrateFirstShare,
  markFirstShareCelebrated,
  CLIP_FIRST_SHARE_KEY,
} from '../clipShareMoment';

// A tiny in-memory localStorage stand-in for the node runner (no DOM).
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? (this.store.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  clear(): void {
    this.store.clear();
  }
}

describe('clipShareMoment: first-share guard (celebrate-only, one-shot)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: new MemoryStorage() });
  });

  it('celebrates on the first share, then never again on this browser', () => {
    expect(shouldCelebrateFirstShare()).toBe(true);
    markFirstShareCelebrated();
    expect(shouldCelebrateFirstShare()).toBe(false);
  });

  it('writes ONLY the local seen-guard flag (no economy write)', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    markFirstShareCelebrated();
    // The only key written is the local guard; the value is a plain flag.
    expect(storage.getItem(CLIP_FIRST_SHARE_KEY)).toBe('1');
  });

  it('is SSR-safe (no window -> does not celebrate, never throws)', () => {
    vi.stubGlobal('window', undefined);
    expect(shouldCelebrateFirstShare()).toBe(false);
    expect(() => markFirstShareCelebrated()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// STRUCTURAL Helix-safety test: the entire clip lib must never reference a Helix
// economy write. This is the same discipline as the 210e invariant 4.3 structural
// test that proves FormaVision never writes helix_score_events.
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIP_LIB_DIR = join(HERE, '..');

// Economy-write tokens that must NEVER appear anywhere in the clip lib source.
const FORBIDDEN_HELIX_WRITE_TOKENS = [
  'helix_score_events',
  'helix_increment_balance',
  'creditEarning',
  'viatokens_ledger',
  'earning-engine',
  'helixAward',
];

function readClipLibSources(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  for (const name of readdirSync(CLIP_LIB_DIR)) {
    if (!name.endsWith('.ts')) continue;
    if (name.endsWith('.test.ts')) continue;
    out.push({ file: name, text: readFileSync(join(CLIP_LIB_DIR, name), 'utf8') });
  }
  return out;
}

describe('clip lib: read-only economy contract (Helix NEVER written)', () => {
  it('no clip lib module references any Helix economy write token', () => {
    const sources = readClipLibSources();
    // Sanity: we actually scanned the lib.
    expect(sources.length).toBeGreaterThan(0);
    for (const { file, text } of sources) {
      for (const token of FORBIDDEN_HELIX_WRITE_TOKENS) {
        expect(text.includes(token), `${file} must not reference "${token}"`).toBe(false);
      }
    }
  });
});
