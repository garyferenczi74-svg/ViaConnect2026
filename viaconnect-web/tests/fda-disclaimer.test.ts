// Prompt 172 Phase 0 (170c primitive): FdaDisclaimer source presence sanity.
//
// vitest.config.ts runs in node environment without jsdom (see existing
// NutriVisionTab __tests__/index.test.ts comment), so a real React render
// is not viable in this suite. We assert the source carries:
//   1. The verbatim 170c §6.1 standing disclaimer copy.
//   2. The verbatim 170c §6.1 AI accuracy disclaimer copy.
//   3. The three slot variants the prop type declares.
//   4. Brand token usage (Navy or Card; Instrument Sans implicit via global).
//   5. The kill switch null short circuit.
// Real interactive coverage rides Playwright once §17.2 surfaces wire in.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(
  __dirname,
  '..',
  'src',
  'components',
  'compliance',
  'FdaDisclaimer.tsx',
);

describe('FdaDisclaimer source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('renders the 170c section 6.1 standing disclaimer copy verbatim', () => {
    expect(source).toContain(
      'Nutrition data is for tracking and educational purposes only. It is not medical advice and should not replace guidance from a qualified healthcare practitioner.',
    );
  });

  it('renders the 170c section 6.1 AI accuracy disclaimer copy verbatim', () => {
    expect(source).toContain(
      'AI-estimated macros and ingredients have known error margins. Please review and edit as needed before saving.',
    );
  });

  it('declares the three slot variants', () => {
    expect(source).toContain("'card-footer'");
    expect(source).toContain("'screen-footer'");
    expect(source).toContain("'modal-inline'");
  });

  it('honors the FDA_DISCLAIMER_RENDERING_ENABLED kill switch with a null short circuit', () => {
    expect(source).toContain('FDA_DISCLAIMER_RENDERING_ENABLED');
    expect(source).toContain('return null');
  });

  it('imports isKillSwitchEnabled from the canonical module', () => {
    expect(source).toContain('@/lib/compliance/kill-switches');
    expect(source).toContain('isKillSwitchEnabled');
  });

  it('applies brand token styling', () => {
    const hasNavyOrCard = source.includes('#1A2744') || source.includes('#1E3054');
    expect(hasNavyOrCard).toBe(true);
  });

  it('contains no em or en dashes', () => {
    expect(source.includes('—')).toBe(false);
    expect(source.includes('–')).toBe(false);
  });
});
