import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CIRC_FAIL_PERSIST_KEY,
  clearCircFailReason,
  readCircFailReason,
  writeCircFailReason,
} from '../circFailPersist';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const storage = new MemoryStorage();

function installStorage(): void {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { sessionStorage: storage },
  });
}

afterEach(() => {
  storage.removeItem(CIRC_FAIL_PERSIST_KEY);
});

describe('circFailPersist', () => {
  it('writes, reads, and clears an honest reason without inventing cm', () => {
    installStorage();
    expect(readCircFailReason()).toBeNull();
    writeCircFailReason('empty_landmarks');
    expect(readCircFailReason()).toBe('empty_landmarks');
    expect(storage.getItem(CIRC_FAIL_PERSIST_KEY)).toBe('empty_landmarks');
    writeCircFailReason(null);
    expect(readCircFailReason()).toBeNull();
    writeCircFailReason('timeout');
    clearCircFailReason();
    expect(readCircFailReason()).toBeNull();
  });

  it('rejects invented reasons and never writes a cm string', () => {
    installStorage();
    writeCircFailReason('invented' as never);
    expect(readCircFailReason()).toBeNull();
    storage.setItem(CIRC_FAIL_PERSIST_KEY, '86 cm');
    expect(readCircFailReason()).toBeNull();
  });
});

describe('circ fail persist wiring', () => {
  it('uploader and live DONE persist; Measurements empty CTA hydrates; fat pills do not', () => {
    const uploader = readFileSync(
      join(process.cwd(), 'src/components/body-tracker/BodyScanUploader.tsx'),
      'utf8',
    );
    const live = readFileSync(join(process.cwd(), 'src/components/scan/ScanExperience.tsx'), 'utf8');
    const grid = readFileSync(
      join(process.cwd(), 'src/components/body-tracker/MeasurementsGrid.tsx'),
      'utf8',
    );
    const page = readFileSync(
      join(process.cwd(), 'src/app/(app)/(consumer)/body-tracker/composition/page.tsx'),
      'utf8',
    );
    expect(uploader).toMatch(/writeCircFailReason/);
    expect(live).toMatch(/writeCircFailReason/);
    expect(grid).toMatch(/readCircFailReason/);
    expect(page).toMatch(/readCircFailReason/);
    expect(page).toMatch(/circFailReason=\{circFailReason\}/);
    expect(page).not.toMatch(/CircFailChip/);
    expect(page).toMatch(/Segmental body fat analysis/);
    expect(page).not.toMatch(/body-comp-provenance-chip[\s\S]{0,200}scan-circ-fail-chip/);
  });
});
