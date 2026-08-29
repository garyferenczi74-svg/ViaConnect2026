/**
 * Render tests for PoseGhost.
 *
 * Uses react-dom/server renderToStaticMarkup (node-safe, no jsdom).
 *
 * Key assertions:
 *   - one distinct silhouette renders per PoseId, distinguishable via data-pose
 *   - stroke is white at 40 percent opacity, no fill
 *   - no raw hex literals (token discipline)
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PoseGhost } from '../PoseGhost';
import { POSES, type PoseId } from '@/lib/scan/poses';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

describe('PoseGhost - one silhouette per pose', () => {
  const rendered = POSES.map((p) => ({
    pose: p.id,
    html: renderToStaticMarkup(React.createElement(PoseGhost, { pose: p.id })),
  }));

  it('renders an svg for every pose', () => {
    for (const { html } of rendered) {
      expect(html).toContain('<svg');
    }
  });

  it('marks each render with its own pose id via data-pose', () => {
    for (const { pose, html } of rendered) {
      expect(html).toContain(`data-pose="${pose}"`);
    }
  });

  it('produces a distinct markup per pose (no two poses render identically)', () => {
    const htmls = rendered.map((r) => r.html);
    const unique = new Set(htmls);
    expect(unique.size).toBe(htmls.length);
  });

  it('front pose renders a front silhouette', () => {
    const html = renderToStaticMarkup(React.createElement(PoseGhost, { pose: 'front' as PoseId }));
    expect(html).toContain('data-pose="front"');
  });

  it('right pose renders a right-profile silhouette', () => {
    const html = renderToStaticMarkup(React.createElement(PoseGhost, { pose: 'right' as PoseId }));
    expect(html).toContain('data-pose="right"');
  });

  it('back pose renders a back silhouette', () => {
    const html = renderToStaticMarkup(React.createElement(PoseGhost, { pose: 'back' as PoseId }));
    expect(html).toContain('data-pose="back"');
  });

  it('left pose renders a left-profile silhouette', () => {
    const html = renderToStaticMarkup(React.createElement(PoseGhost, { pose: 'left' as PoseId }));
    expect(html).toContain('data-pose="left"');
  });
});

describe('PoseGhost - stroke discipline', () => {
  const html = renderToStaticMarkup(React.createElement(PoseGhost, { pose: 'front' as PoseId }));

  it('uses a white stroke', () => {
    expect(html).toContain('stroke="white"');
  });

  it('uses 40 percent stroke opacity', () => {
    expect(html).toMatch(/stroke-opacity="0\.4"/);
  });

  it('has no fill (fill="none")', () => {
    expect(html).toContain('fill="none"');
  });

  it('contains no raw hex color literals', () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('contains no em-dashes (U+2014)', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes (U+2013)', () => {
    expect(html).not.toContain(EN_DASH);
  });
});
