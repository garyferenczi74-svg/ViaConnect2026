// Prompt Brief 2: standing-rule guards for the 3D A/B compare slice.
// No photogrammetry, no new reconstructor, no drug pairing, no any, no bucket migrate.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHOTO_POSES } from '@/components/body-tracker/photos/poseConstants';

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPARE_DIR = join(HERE, '..');
const PHOTO_CAPTURE = join(
  HERE,
  '..',
  '..',
  '..',
  '..',
  'components',
  'body-tracker',
  'photos',
  'PhotoSessionCapture.tsx',
);

const FORBIDDEN = [
  'photogrammetry',
  'Photogrammetry',
  'reconstructor',
  'Semaglutide',
  'semaglutide',
  'Ozempic',
  'Wegovy',
  'FutureMe',
  'GLP-1 agonist',
  'drug pairing',
  ': any',
  ' as any',
];

function readTsSources(dir: string): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.ts')) continue;
    if (name.endsWith('.test.ts')) continue;
    out.push({ file: name, text: readFileSync(join(dir, name), 'utf8') });
  }
  return out;
}

describe('A/B compare slice: standing rules', () => {
  it('does not mention photogrammetry, reconstructors, drugs, FutureMe, or any', () => {
    const sources = readTsSources(COMPARE_DIR);
    expect(sources.length).toBeGreaterThan(0);
    for (const { file, text } of sources) {
      for (const token of FORBIDDEN) {
        expect(text.includes(token), `${file} must not contain "${token}"`).toBe(false);
      }
    }
  });
});

describe('4-view capture is unchanged', () => {
  it('still captures front, back, left, and right', () => {
    expect(PHOTO_POSES.map((p) => p.id)).toEqual(['front', 'back', 'left', 'right']);
  });

  it('photo upload still uses the current body-progress-photos bucket', () => {
    const src = readFileSync(PHOTO_CAPTURE, 'utf8');
    expect(src).toContain("const BUCKET = 'body-progress-photos'");
    expect(src).not.toContain('migrate');
  });
});
