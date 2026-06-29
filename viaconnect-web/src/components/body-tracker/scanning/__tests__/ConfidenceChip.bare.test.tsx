/**
 * Task 12 (Prompt 210c): Component render tests for ConfidenceChip.
 *
 * Uses react-dom/server renderToStaticMarkup (node-safe, no jsdom).
 * The lucide-react Circle icon renders as an SVG in the static markup.
 *
 * Key assertions:
 *   - null confidence renders nothing (RULE 9: no indicator for UNKNOWN state)
 *   - High/moderate/low numeric scores render the correct body-positive labels
 *   - Low confidence renders "Estimated" not 0 and not alarming language
 *   - Design token CSS vars appear in the rendered style (no hardcoded hex)
 *   - No em-dashes (U+2014) or en-dashes (U+2013)
 *
 * Unicode-escape constants for em/en-dash so the literal characters never
 * appear in this source file (no-dash rule; pre-commit hook enforced).
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfidenceChip } from '../ConfidenceChip';

const EM_DASH = String.fromCharCode(0x2014); // em-dash U+2014 - no literal in source
const EN_DASH = String.fromCharCode(0x2013); // en-dash U+2013 - no literal in source

// ---------------------------------------------------------------------------
// null confidence - no render (RULE 9)
// ---------------------------------------------------------------------------

describe('ConfidenceChip - null (UNKNOWN state)', () => {
  it('null confidence renders an empty string (nothing rendered; RULE 9)', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfidenceChip, { confidence: null }),
    );
    expect(html).toBe('');
  });
});

// ---------------------------------------------------------------------------
// High confidence (score >= 0.70)
// ---------------------------------------------------------------------------

describe('ConfidenceChip - high confidence (0.85)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ConfidenceChip, { confidence: 0.85 }),
  );

  it('renders without crashing', () => {
    expect(html.length).toBeGreaterThan(0);
  });

  it('renders the "Measured" label (body-positive)', () => {
    expect(html).toContain('Measured');
  });

  it('uses the --severity-low (green) design token', () => {
    expect(html).toContain('--severity-low');
  });

  it('does NOT use --severity-high (red) for high confidence', () => {
    expect(html).not.toContain('--severity-high');
  });

  it('renders an aria-label for accessibility', () => {
    expect(html).toContain('aria-label');
    expect(html).toContain('Measured');
  });

  it('contains no em-dashes (U+2014)', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes (U+2013)', () => {
    expect(html).not.toContain(EN_DASH);
  });
});

// ---------------------------------------------------------------------------
// Moderate confidence (score in [0.45, 0.70))
// ---------------------------------------------------------------------------

describe('ConfidenceChip - moderate confidence (0.60)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ConfidenceChip, { confidence: 0.60 }),
  );

  it('renders the "Good estimate" label', () => {
    expect(html).toContain('Good estimate');
  });

  it('uses the --severity-moderate (yellow) design token', () => {
    expect(html).toContain('--severity-moderate');
  });

  it('does NOT use --severity-low (green) for moderate', () => {
    expect(html).not.toContain('--severity-low');
  });

  it('contains no em-dashes (U+2014)', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes (U+2013)', () => {
    expect(html).not.toContain(EN_DASH);
  });
});

// ---------------------------------------------------------------------------
// Low confidence (score < 0.45)
// ---------------------------------------------------------------------------

describe('ConfidenceChip - low confidence (0.35)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ConfidenceChip, { confidence: 0.35 }),
  );

  it('renders the "Estimated" label (body-positive, not alarming)', () => {
    expect(html).toContain('Estimated');
  });

  it('does NOT render "0" as a measurement value (RULE 9: never fabricate 0)', () => {
    expect(html).not.toMatch(/>0</);
  });

  it('does NOT use alarming language', () => {
    const lower = html.toLowerCase();
    expect(lower).not.toContain('low confidence');
    expect(lower).not.toContain('bad');
    expect(lower).not.toContain('poor');
    expect(lower).not.toContain('inaccurate');
  });

  it('uses the --severity-high (red) design token for low confidence', () => {
    expect(html).toContain('--severity-high');
  });

  it('does NOT use --severity-low (green) for low confidence', () => {
    expect(html).not.toContain('--severity-low');
  });

  it('contains no em-dashes (U+2014)', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes (U+2013)', () => {
    expect(html).not.toContain(EN_DASH);
  });
});

// ---------------------------------------------------------------------------
// Edge: threshold boundary values
// ---------------------------------------------------------------------------

describe('ConfidenceChip - threshold boundaries', () => {
  it('0.70 (high threshold inclusive) renders Measured', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfidenceChip, { confidence: 0.70 }),
    );
    expect(html).toContain('Measured');
  });

  it('0.45 (moderate threshold inclusive) renders Good estimate', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfidenceChip, { confidence: 0.45 }),
    );
    expect(html).toContain('Good estimate');
  });

  it('0.44 (just below moderate threshold) renders Estimated', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfidenceChip, { confidence: 0.44 }),
    );
    expect(html).toContain('Estimated');
  });
});
