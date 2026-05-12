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
