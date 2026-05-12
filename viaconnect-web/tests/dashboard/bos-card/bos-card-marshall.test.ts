// Prompt #161e: standing Marshall scan over every BOS card source.
//
// Permanent rule: no em dashes (U+2014), no en dashes (U+2013), no
// emojis. This scan is the wall against drift. Adjust the file list
// if the BOS card structure changes; the assertion is per file so a
// failure points at the offender.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', 'src', 'components', 'dashboard');

const BOS_FILES = [
  'bos-card.tsx',
  'bos-card-client.tsx',
  'bos-card-empty-state.tsx',
  'bos-card-error.tsx',
  'bos-card-skeleton.tsx',
  'bos-score-gauge.tsx',
  'bos-side-panel.tsx',
  'bos-static-explanation.tsx',
  'bos-explanation.tsx',
  'bos-accuracy-row.tsx',
  'bos-engagement-row.tsx',
  'accuracy-pill.tsx',
  'engagement-pill.tsx',
];

describe('BOS card Marshall scan', () => {
  for (const file of BOS_FILES) {
    const p = path.join(ROOT, file);
    it(`${file} contains no em dashes`, () => {
      if (!existsSync(p)) {
        // The file may not yet exist in early phases of the rebuild.
        // Treat missing as a separate signal so the test name still
        // surfaces in the report.
        expect(existsSync(p), `expected ${file} to exist`).toBe(true);
        return;
      }
      const src = readFileSync(p, 'utf-8');
      expect(src, `em dash found in ${file}`).not.toMatch(/—/);
    });
    it(`${file} contains no en dashes`, () => {
      if (!existsSync(p)) return;
      const src = readFileSync(p, 'utf-8');
      expect(src, `en dash found in ${file}`).not.toMatch(/–/);
    });
    it(`${file} contains no emojis`, () => {
      if (!existsSync(p)) return;
      const src = readFileSync(p, 'utf-8');
      expect(src, `emoji found in ${file}`).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
      expect(src, `emoji found in ${file}`).not.toMatch(/[\u{2600}-\u{27BF}]/u);
    });
  }
});

describe('BOS card uses Bio Optimization Score not Vitality', () => {
  for (const file of BOS_FILES) {
    const p = path.join(ROOT, file);
    it(`${file} never uses the string "Vitality Score"`, () => {
      if (!existsSync(p)) return;
      const src = readFileSync(p, 'utf-8');
      expect(src).not.toMatch(/Vitality\s+Score/i);
    });
  }
});

describe('BOS card middle-dot allowance (U+00B7)', () => {
  // The patch pass introduces " · unlock" / " · pending" suffixes on
  // accuracy pills and "Tier 1 · 1.5x" composition on the tier chip.
  // U+00B7 (middle dot) is NOT in the banned set; only en-dash
  // (U+2013) and em-dash (U+2014) are. This test pins that distinction
  // so the Marshall pre-delivery scan continues to allow the middle
  // dot.

  it('accuracy-pill.tsx contains the U+00B7 middle dot', () => {
    const src = readFileSync(path.join(ROOT, 'accuracy-pill.tsx'), 'utf-8');
    expect(src).toMatch(/·/);
  });

  it('bos-side-panel.tsx is free of banned dashes (middle dot used elsewhere via helper)', () => {
    const src = readFileSync(path.join(ROOT, 'bos-side-panel.tsx'), 'utf-8');
    expect(src).not.toMatch(/—/);
    expect(src).not.toMatch(/–/);
  });

  it('U+00B7 is not a member of the banned em/en-dash set', () => {
    const middleDot = '·';
    expect(middleDot).not.toMatch(/—/);
    expect(middleDot).not.toMatch(/–/);
  });
});

describe('BOS card container glow tracks the band color', () => {
  it('bos-card-client.tsx uses colorForScore to derive the glow background', () => {
    const src = readFileSync(path.join(ROOT, 'bos-card-client.tsx'), 'utf-8');
    expect(src).toContain('colorForScore');
    expect(src).toContain('backgroundColor: bandColor');
  });
});
