/**
 * Render tests for SkeletonOverlay.
 *
 * Uses react-dom/server renderToStaticMarkup (node-safe, no jsdom).
 *
 * Key assertions:
 *   - renders nothing when no landmarks are provided (hidden by default; debug-only)
 *   - renders an svg skeleton when landmarks are provided
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SkeletonOverlay } from '../SkeletonOverlay';

describe('SkeletonOverlay - hidden by default', () => {
  it('renders nothing when landmarks is undefined', () => {
    const html = renderToStaticMarkup(React.createElement(SkeletonOverlay, {}));
    expect(html).toBe('');
  });

  it('renders nothing when landmarks is an empty array', () => {
    const html = renderToStaticMarkup(
      React.createElement(SkeletonOverlay, { landmarks: [] }),
    );
    expect(html).toBe('');
  });
});

describe('SkeletonOverlay - debug rendering with landmarks', () => {
  it('renders an svg when landmarks are provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(SkeletonOverlay, {
        landmarks: [
          { x: 0.5, y: 0.2 },
          { x: 0.4, y: 0.4 },
        ],
        connections: [{ from: 0, to: 1 }],
      }),
    );
    expect(html).toContain('<svg');
    expect(html).toContain('<line');
    expect(html).toContain('<circle');
  });

  it('contains no raw hex color literals', () => {
    const html = renderToStaticMarkup(
      React.createElement(SkeletonOverlay, {
        landmarks: [{ x: 0.5, y: 0.2 }],
      }),
    );
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
