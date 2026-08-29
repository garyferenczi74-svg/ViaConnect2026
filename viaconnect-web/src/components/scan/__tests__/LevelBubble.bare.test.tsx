/**
 * Render tests for LevelBubble.
 *
 * Uses react-dom/server renderToStaticMarkup (node-safe, no jsdom).
 *
 * Key assertions:
 *   - available=false renders the "Place the phone on a flat surface" checklist copy
 *   - available=true and within tolerance renders the level bubble
 *   - available=true and outside tolerance still renders the bubble, but not aligned
 *   - no raw hex literals (token discipline)
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LevelBubble } from '../LevelBubble';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const CHECKLIST_COPY = 'Place the phone on a flat surface';

describe('LevelBubble - unavailable orientation', () => {
  const html = renderToStaticMarkup(
    React.createElement(LevelBubble, { beta: 0, gamma: 0, available: false }),
  );

  it('shows the "Place the phone on a flat surface" checklist copy', () => {
    expect(html).toContain(CHECKLIST_COPY);
  });

  it('does NOT render the level bubble', () => {
    expect(html).not.toContain('data-testid="level-bubble"');
  });
});

describe('LevelBubble - available and within tolerance', () => {
  const html = renderToStaticMarkup(
    React.createElement(LevelBubble, { beta: 1, gamma: -2, available: true }),
  );

  it('renders the level bubble', () => {
    expect(html).toContain('data-testid="level-bubble"');
  });

  it('marks the bubble as aligned', () => {
    expect(html).toContain('data-aligned="true"');
  });

  it('does NOT show the checklist copy', () => {
    expect(html).not.toContain(CHECKLIST_COPY);
  });
});

describe('LevelBubble - available but outside tolerance', () => {
  const html = renderToStaticMarkup(
    React.createElement(LevelBubble, { beta: 10, gamma: 0, available: true }),
  );

  it('still renders the level bubble', () => {
    expect(html).toContain('data-testid="level-bubble"');
  });

  it('marks the bubble as not aligned', () => {
    expect(html).toContain('data-aligned="false"');
  });
});

describe('LevelBubble - custom tolerance', () => {
  it('respects a custom tolerance boundary', () => {
    const html = renderToStaticMarkup(
      React.createElement(LevelBubble, { beta: 4, gamma: 4, tolerance: 5, available: true }),
    );
    expect(html).toContain('data-aligned="true"');
  });
});

describe('LevelBubble - token discipline', () => {
  it('contains no raw hex color literals', () => {
    const html = renderToStaticMarkup(
      React.createElement(LevelBubble, { beta: 0, gamma: 0, available: true }),
    );
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('contains no em-dashes (U+2014)', () => {
    const html = renderToStaticMarkup(
      React.createElement(LevelBubble, { beta: 0, gamma: 0, available: false }),
    );
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes (U+2013)', () => {
    const html = renderToStaticMarkup(
      React.createElement(LevelBubble, { beta: 0, gamma: 0, available: false }),
    );
    expect(html).not.toContain(EN_DASH);
  });
});
