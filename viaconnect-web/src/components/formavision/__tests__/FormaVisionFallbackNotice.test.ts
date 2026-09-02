// Honest 2D-floor chrome: when 3D cannot run, the notice must say so. A bare
// SegmentalHeatMap SVG must not look like a morph.
//
// Stacking contract (Arnold www after #173): opacity 1 is not enough —
// elementFromPoint at the notice center hit the Female sex toggle. The
// banner must carry an explicit stack (relative z-50) and portal into a
// host that sits above the sex-toggle + control row, outside overflow-hidden.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FormaVisionFallbackNotice,
  FORMAVISION_FALLBACK_FLOOR_STACK_CLASS,
  FORMAVISION_FALLBACK_NOTICE_STACK_CLASS,
  FORMAVISION_FALLBACK_NOTICE_HOST_TESTID,
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

  it('repositions the notice above the sex-toggle row with an explicit stack', () => {
    expect(FORMAVISION_FALLBACK_NOTICE_HOST_TESTID).toBe('formavision-fallback-notice-host');
    expect(FORMAVISION_FALLBACK_NOTICE_STACK_CLASS).toMatch(/\brelative\b/);
    expect(FORMAVISION_FALLBACK_NOTICE_STACK_CLASS).toMatch(/\bz-50\b/);
    expect(FORMAVISION_FALLBACK_NOTICE_STACK_CLASS).toMatch(/\bpointer-events-auto\b/);
    expect(FORMAVISION_FALLBACK_FLOOR_STACK_CLASS).toMatch(/\brelative\b/);
    expect(FORMAVISION_FALLBACK_FLOOR_STACK_CLASS).toMatch(/\bz-20\b/);
    expect(FORMAVISION_FALLBACK_FLOOR_STACK_CLASS).toMatch(/\bmin-h-\[200px\]\b/);

    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFallbackNotice, {
        children: React.createElement('div', { 'data-testid': 'two-d-floor' }, 'svg-floor'),
      }),
    );
    const floorClass = classOf(html, 'formavision-fallback-2d');
    const noticeClass = classOf(html, 'formavision-fallback-notice');
    expect(floorClass).toContain('relative');
    expect(floorClass).toContain('z-20');
    expect(noticeClass).toContain('relative');
    expect(noticeClass).toContain('z-50');
    expect(noticeClass).toContain('pointer-events-auto');

    const noticeSrc = src('src/components/formavision/FormaVisionFallbackNotice.tsx');
    expect(noticeSrc).toMatch(/createPortal/);
    expect(noticeSrc).toMatch(/useLayoutEffect/);
    expect(noticeSrc).toMatch(/formavision-fallback-notice-host/);
    expect(noticeSrc).not.toMatch(/failIfMajorPerformanceCaveat/);
    expect(noticeSrc).toMatch(/formatFallbackNoticeDetail/);

    const htmlLater = renderToStaticMarkup(
      React.createElement(FormaVisionFallbackNotice, {
        reason: 'Shader compile failed',
        webgl: 'available',
        children: React.createElement('div', { 'data-testid': 'two-d-floor' }, 'svg-floor'),
      }),
    );
    expect(htmlLater).toContain('Shader compile failed');
    expect(htmlLater).not.toContain('This device could not start WebGL');

    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const topClass = classOf(page, 'formavision-top-controls');
    const plateClass = classOf(page, 'formavision-canvas-grid');
    expect(page).toMatch(
      /data-testid="formavision-fallback-notice-host"\s+className="empty:hidden"/,
    );
    expect(topClass).toMatch(/\bz-0\b/);
    expect(topClass).not.toMatch(/\bz-(?:[1-9]|[1-9][0-9])\b/);
    expect(plateClass).toMatch(/\brelative\b/);
    expect(plateClass).toMatch(/\bz-10\b/);
    expect(plateClass).toMatch(/overflow-hidden/);
    // Host (portal target) is above the sex-toggle row; plate stays overflow-hidden
    // for 3D / wipe. Notice z-50 > toggle z-0 so the banner is never silent.
    expect(page.indexOf('formavision-fallback-notice-host')).toBeLessThan(
      page.indexOf('formavision-top-controls'),
    );
    expect(page.indexOf('formavision-top-controls')).toBeLessThan(
      page.indexOf('formavision-canvas-grid'),
    );
  });
});
