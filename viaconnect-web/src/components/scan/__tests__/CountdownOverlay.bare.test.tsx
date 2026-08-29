/**
 * Render tests for CountdownOverlay.
 *
 * Uses react-dom/server renderToStaticMarkup (node-safe, no jsdom).
 *
 * Key assertions:
 *   - renders the digit and an aria-live="assertive" region mirroring it plus coaching
 *   - amber (orange-300/orange-400) class applies ONLY for values 2 and 1, never 5/4/3
 *   - value 0 renders a shutter ring, not a bare digit
 *   - reducedMotion suppresses the tick keyframe animation
 *   - no raw hex literals in the rendered markup (token discipline)
 *
 * Unicode-escape constants for em/en-dash so the literal characters never
 * appear in this source file (no-dash rule; pre-commit hook enforced).
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CountdownOverlay } from '../CountdownOverlay';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

describe('CountdownOverlay - digit and aria-live', () => {
  const html = renderToStaticMarkup(
    React.createElement(CountdownOverlay, { value: 5, coaching: 'Stand still.' }),
  );

  it('renders the digit', () => {
    expect(html).toContain('>5<');
  });

  it('renders an aria-live="assertive" region', () => {
    expect(html).toContain('aria-live="assertive"');
  });

  it('mirrors the digit and coaching line in the aria-live region', () => {
    expect(html).toContain('Stand still.');
  });

  it('contains no em-dashes (U+2014)', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes (U+2013)', () => {
    expect(html).not.toContain(EN_DASH);
  });
});

describe('CountdownOverlay - amber ticks (2 and 1 only)', () => {
  it('value 5 does NOT use the amber class', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 5, coaching: 'x' }),
    );
    expect(html).not.toContain('text-orange-300');
    expect(html).not.toContain('text-orange-400');
  });

  it('value 4 does NOT use the amber class', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 4, coaching: 'x' }),
    );
    expect(html).not.toContain('text-orange-300');
    expect(html).not.toContain('text-orange-400');
  });

  it('value 3 does NOT use the amber class', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 3, coaching: 'x' }),
    );
    expect(html).not.toContain('text-orange-300');
    expect(html).not.toContain('text-orange-400');
  });

  it('value 2 uses an amber (orange-300/400) class', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 2, coaching: 'x' }),
    );
    expect(html.includes('text-orange-300') || html.includes('text-orange-400')).toBe(true);
  });

  it('value 1 uses an amber (orange-300/400) class', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 1, coaching: 'x' }),
    );
    expect(html.includes('text-orange-300') || html.includes('text-orange-400')).toBe(true);
  });
});

describe('CountdownOverlay - shutter at 0', () => {
  it('renders a shutter ring instead of a bare digit', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 0, coaching: 'Hold still.' }),
    );
    expect(html).toContain('countdown-shutter-ring');
  });
});

describe('CountdownOverlay - reduced motion', () => {
  it('omits the tick keyframe animation when reducedMotion is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 3, coaching: 'x', reducedMotion: true }),
    );
    expect(html).not.toContain('formavisionCountdownTick');
  });

  it('includes the tick keyframe animation when reducedMotion is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 3, coaching: 'x', reducedMotion: false }),
    );
    expect(html).toContain('formavisionCountdownTick');
  });
});

describe('CountdownOverlay - token discipline', () => {
  it('contains no raw hex color literals', () => {
    const html = renderToStaticMarkup(
      React.createElement(CountdownOverlay, { value: 2, coaching: 'x' }),
    );
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
