import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FORMAVISION_F3_OVERLAY_TESTID,
  FORMAVISION_MODEL_VIEWER_TESTID,
  FormaVisionModelViewer,
} from '../FormaVisionModelViewer';
import { FORMAVISION_PLATE_LOADING_NOTICE } from '../FormaVisionPlateNotice';

describe('FormaVisionModelViewer', () => {
  it('SSR stamps the 4.3.0 GLB tag, F3 overlay, and loading notice', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FormaVisionModelViewer, {
        src: 'https://example.test/visual.glb',
        iosSrc: 'https://example.test/visual.usdz',
      }),
    );
    expect(markup).toContain(FORMAVISION_MODEL_VIEWER_TESTID);
    expect(markup).toContain('data-model-viewer-version="4.3.0"');
    expect(markup).toContain('formavision-model-viewer-el');
    expect(markup).toContain('https://example.test/visual.glb');
    expect(markup).toContain('https://example.test/visual.usdz');
    expect(markup).toContain('camera-controls');
    expect(markup).toContain('data-f3-look="holographic-f3"');
    expect(markup).not.toContain('ar-modes');
    expect(markup).toContain(FORMAVISION_F3_OVERLAY_TESTID);
    expect(markup).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('formavision-3d-pending');
  });

  it('hides the loading notice after the GLB paints', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FormaVisionModelViewer, {
        src: 'https://example.test/visual.glb',
        painted: true,
      }),
    );
    expect(markup).toContain('data-painted="true"');
    expect(markup).not.toContain(FORMAVISION_PLATE_LOADING_NOTICE);
  });
});
