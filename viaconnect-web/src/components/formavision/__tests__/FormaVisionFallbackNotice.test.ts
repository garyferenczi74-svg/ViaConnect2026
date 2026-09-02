// Honest 2D-floor chrome: when 3D cannot run, the notice must say so. A bare
// SegmentalHeatMap SVG must not look like a morph.
//
// Stacking contract (www smoke after #173): the notice is in the DOM but
// elementFromPoint hit the Female sex toggle. The banner must carry an
// explicit stacking class and sit above sibling plate controls.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FormaVisionFallbackNotice,
  FORMAVISION_FALLBACK_FLOOR_STACK_CLASS,
  FORMAVISION_FALLBACK_NOTICE_STACK_CLASS,
} from '../FormaVisionFallbackNotice';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function classOf(markup: string, testId: string): string {
  const match = markup.match(
    new RegExp(`data-testid="${testId}"[\\s\\S]*?(?:className|class)="([^"]+)"`),
  );
  expect(match?.[1], `${testId} class`).toBeDefined();
  return match?.[1] ?? '';
}

describe('FormaVisionFallbackNotice', () => {
  it('labels the 2D outline as a fallback, not a morph', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFallbackNotice, {
        children: React.createElement('div', { 'data-testid': 'two-d-floor' }, 'svg-floor'),
      }),
    );
    expect(html).toContain('formavision-fallback-2d');
    expect(html).toContain('formavision-fallback-notice');
    expect(html).toContain('3D avatar unavailable');
    expect(html).toContain('not a body morph');
    expect(html).toContain('two-d-floor');
    expect(html).toContain('stroke-width="1.5"');
  });

  it('pins the notice above sibling sex-toggle controls with an explicit stack', () => {
    expect(FORMAVISION_FALLBACK_NOTICE_STACK_CLASS).toMatch(/\babsolute\b/);
    expect(FORMAVISION_FALLBACK_NOTICE_STACK_CLASS).toMatch(/\bz-30\b/);
    expect(FORMAVISION_FALLBACK_FLOOR_STACK_CLASS).toMatch(/\brelative\b/);
    expect(FORMAVISION_FALLBACK_FLOOR_STACK_CLASS).toMatch(/\bz-20\b/);

    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFallbackNotice, {
        children: React.createElement('div', { 'data-testid': 'two-d-floor' }, 'svg-floor'),
      }),
    );
    const floorClass = classOf(html, 'formavision-fallback-2d');
    const noticeClass = classOf(html, 'formavision-fallback-notice');
    expect(floorClass).toContain('relative');
    expect(floorClass).toContain('z-20');
    expect(noticeClass).toContain('absolute');
    expect(noticeClass).toContain('z-30');
    expect(noticeClass).toContain('pointer-events-auto');

    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const topClass = classOf(page, 'formavision-top-controls');
    const plateClass = classOf(page, 'formavision-canvas-grid');
    expect(topClass).toMatch(/\bz-0\b/);
    expect(topClass).not.toMatch(/\bz-(?:[1-9]|[1-9][0-9])\b/);
    expect(plateClass).toMatch(/\brelative\b/);
    expect(plateClass).toMatch(/\bz-10\b/);
    expect(plateClass).toMatch(/overflow-hidden/);
    // Plate z-10 > toggle row z-0; notice z-30 stays inside the plate context
    // so elementFromPoint on the banner cannot resolve to Female.
    expect(page.indexOf('formavision-top-controls')).toBeLessThan(
      page.indexOf('formavision-canvas-grid'),
    );
  });
});
