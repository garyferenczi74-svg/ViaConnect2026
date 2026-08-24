/**
 * Task 12 (Prompt 210c): Component render tests for ScanAccuracyClaim.
 *
 * Uses react-dom/server renderToStaticMarkup (node-safe, no jsdom).
 * The lucide-react icons render as SVGs in the static markup.
 *
 * Key assertions:
 *   - ACCURACY_CLAIM_PROVEN is false (the static gate is off by default)
 *   - No accuracy percentage in the unproven state (Section 10.5 / 17.2)
 *   - Disclaimer always visible in both states
 *   - Proven branch shows the figure (tested via _testProven override)
 *   - No em-dashes (U+2014) or en-dashes (U+2013) in any output
 *
 * Unicode-escape constants for em/en-dash so the literal characters never
 * appear in this source file (no-dash rule; pre-commit hook enforced).
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanAccuracyClaim, ACCURACY_CLAIM_PROVEN } from '../ScanAccuracyClaim';

const EM_DASH = String.fromCharCode(0x2014); // em-dash U+2014 - no literal in source
const EN_DASH = String.fromCharCode(0x2013); // en-dash U+2013 - no literal in source

// ---------------------------------------------------------------------------
// Static gate check
// ---------------------------------------------------------------------------

describe('ScanAccuracyClaim - static gate', () => {
  it('ACCURACY_CLAIM_PROVEN is false (the compliance gate is off by default)', () => {
    expect(ACCURACY_CLAIM_PROVEN).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unproven state (gate off - the only live state today)
// ---------------------------------------------------------------------------

describe('ScanAccuracyClaim - unproven state (_testProven=false)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ScanAccuracyClaim, { _testProven: false }),
  );

  it('renders without crashing', () => {
    expect(html.length).toBeGreaterThan(0);
  });

  it('does NOT render the 90% accuracy percentage (Section 10.5 compliance)', () => {
    expect(html).not.toContain('90%');
    expect(html).not.toContain('90 percent');
  });

  it('does NOT render any digit-percent string (no fabricated accuracy claim)', () => {
    expect(html).not.toMatch(/\d+%/);
  });

  it('renders estimate/AI framing copy', () => {
    expect(html.toLowerCase()).toContain('estimated');
  });

  it('renders the non-dismissible AI-estimate disclaimer', () => {
    expect(html.toLowerCase()).toContain('ai-derived estimates');
  });

  it('disclaimer references clinical measurements', () => {
    expect(html).toContain('not clinical measurements');
  });

  it('contains no em-dashes (U+2014)', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes (U+2013)', () => {
    expect(html).not.toContain(EN_DASH);
  });

  it('mentions that validation is in progress', () => {
    expect(html.toLowerCase()).toContain('validation');
  });
});

// ---------------------------------------------------------------------------
// Default render (no _testProven prop) - should equal unproven state
// ---------------------------------------------------------------------------

describe('ScanAccuracyClaim - default (no props)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ScanAccuracyClaim, {}),
  );

  it('renders without crashing', () => {
    expect(html.length).toBeGreaterThan(0);
  });

  it('does NOT render 90% (ACCURACY_CLAIM_PROVEN is false)', () => {
    expect(html).not.toContain('90%');
  });

  it('always renders the disclaimer', () => {
    expect(html.toLowerCase()).toContain('ai-derived estimates');
  });
});

// ---------------------------------------------------------------------------
// Proven state (gate on, via _testProven override - tests the future branch)
// ---------------------------------------------------------------------------

describe('ScanAccuracyClaim - proven state (_testProven=true)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ScanAccuracyClaim, { _testProven: true }),
  );

  it('renders without crashing', () => {
    expect(html.length).toBeGreaterThan(0);
  });

  it('shows the 90% accuracy figure', () => {
    expect(html).toContain('90%');
  });

  it('shows the tolerance value (3 cm)', () => {
    expect(html).toContain('within 3 cm');
  });

  it('shows the disclaimer even when proven', () => {
    expect(html.toLowerCase()).toContain('ai-derived estimates');
  });

  it('contains no em-dashes (U+2014)', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes (U+2013)', () => {
    expect(html).not.toContain(EN_DASH);
  });
});
