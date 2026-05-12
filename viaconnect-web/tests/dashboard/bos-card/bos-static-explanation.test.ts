// Prompt #161e: lock the static teaching paragraph against drift.
//
// We assert the file's source text matches the spec contract for
// "evergreen Hannah voice teaching paragraph". The test reads the
// component source rather than rendering JSX so it runs in the
// node-only Vitest environment. Substring tests normalize whitespace
// because JSX line breaks split phrases across newlines.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = readFileSync(
  path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'src',
    'components',
    'dashboard',
    'bos-static-explanation.tsx',
  ),
  'utf-8',
);

// Whitespace-normalized source: collapse all runs of whitespace
// (including newlines and indentation) to a single space. This lets
// substring assertions match phrases that the JSX renderer prints
// across line breaks.
const FLAT = SRC.replace(/\s+/g, ' ');

describe('BOSStaticExplanation / canonical copy', () => {
  it('exposes the "What this measures" eyebrow', () => {
    expect(FLAT).toContain('What this measures');
  });

  it('contains the two-signal opener', () => {
    expect(FLAT).toContain('blends two signals');
  });

  it('cites the diagnostic ladder CAQ -> Labs -> Genetics', () => {
    expect(FLAT).toContain('CAQ to Labs to Genetics');
  });

  it('cites all six engagement levers in the daily-levers sentence', () => {
    expect(FLAT).toContain('meals');
    expect(FLAT).toContain('supplements');
    expect(FLAT).toContain('body measurements');
    expect(FLAT).toContain('wearable data');
    expect(FLAT).toContain('plug ins');
    expect(FLAT).toContain('challenges');
  });

  it('contains zero em dashes anywhere in the file', () => {
    expect(SRC).not.toMatch(/—/);
  });

  it('contains zero en dashes anywhere in the file', () => {
    expect(SRC).not.toMatch(/–/);
  });

  it('contains zero emojis anywhere in the file', () => {
    expect(SRC).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(SRC).not.toMatch(/[\u{2600}-\u{27BF}]/u);
  });
});
