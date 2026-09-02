// Honest 2D-floor chrome: when 3D cannot run, the notice must say so. A bare
// SegmentalHeatMap SVG must not look like a morph.

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormaVisionFallbackNotice } from '../FormaVisionFallbackNotice';

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
});
