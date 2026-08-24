// Brief 24: Bio Optimization Score stays empty unless a real named
// contributor exists. Source scan plus the display-guard contract.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  BOS_INSUFFICIENT_DATA_COPY,
  collectNamedBosContributors,
  formatBosContributorLine,
  resolveHonestBosDisplay,
  toHonestDisplayBosScore,
} from '@/lib/scoring/bos-display';

const ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

const HONESTY_FILES = [
  'src/lib/scoring/bos-display.ts',
  'src/app/api/bos/current/route.ts',
  'src/components/dashboard/bos-card-client.tsx',
  'src/components/dashboard/bos-score-gauge.tsx',
  'src/components/dashboard/bos-side-panel.tsx',
  'src/components/dashboard/morning-card/MorningCard.tsx',
];

describe('Brief 24 BOS contributor honesty', () => {
  it('never shows 62 / Good when wearable and CAQ / labs contributors are missing', () => {
    const honest = resolveHonestBosDisplay({
      score: 62,
      contributors: [],
      accuracy_pills: [
        { key: 'caq', label: 'CAQ', state: 'incomplete' },
        { key: 'labs', label: 'Labs', state: 'incomplete' },
        { key: 'genetics', label: 'Genetics', state: 'incomplete' },
      ],
    });
    expect(honest.score).toBeNull();
    expect(honest.score).not.toBe(0);
    expect(honest.contributorLine).toBeNull();
    expect(BOS_INSUFFICIENT_DATA_COPY).toBe('Not enough data yet');
    expect(toHonestDisplayBosScore(62, [])).toBeNull();
  });

  it('names CAQ or Labs when those sources produced the score', () => {
    const fromCaq = collectNamedBosContributors({ caqCompleted: true });
    expect(formatBosContributorLine(fromCaq)).toBe('From CAQ');
    expect(toHonestDisplayBosScore(62, fromCaq)).toBe(62);
    const fromLabs = collectNamedBosContributors({ labsPresent: true });
    expect(formatBosContributorLine(fromLabs)).toBe('From Labs');
  });

  it('does not invent 0 and does not rename the score Vitality', () => {
    expect(toHonestDisplayBosScore(null, [])).toBeNull();
    expect(toHonestDisplayBosScore(62, [])).not.toBe(0);
    for (const file of HONESTY_FILES) {
      const src = read(file);
      expect(src).not.toMatch(/Vitality\s+Score/i);
      expect(src).not.toMatch(/Semaglutide/i);
      expect(src).toMatch(/Bio Optimization Score/);
    }
  });

  it('imports last-sync-state from main only when used, never a fork', () => {
    const lastSyncMain = 'src/lib/body-tracker/last-sync-state.ts';
    expect(read(lastSyncMain)).toContain('export function resolveLastSyncState');
    for (const file of HONESTY_FILES) {
      const src = read(file);
      const imports = src.match(/from ['"][^'"]*last-sync-state['"]/g) ?? [];
      for (const line of imports) {
        expect(line).toMatch(/@\/lib\/body-tracker\/last-sync-state/);
      }
      expect(src).not.toMatch(/last-sync-state-fork|lastSyncStateCopy/);
    }
  });

  it('does not invent Connected on BOS wearable dims', () => {
    const display = read('src/lib/scoring/bos-display.ts');
    const route = read('src/app/api/bos/current/route.ts');
    expect(display).toContain('isRealWearableContributor');
    expect(display).toContain('Linked-only is not enough');
    expect(`${display}\n${route}`).not.toMatch(/invent Connected/);
    expect(read('src/components/body-tracker/connections/ScoreDetailPanel.tsx')).toContain(
      'UNKNOWN',
    );
  });
});
