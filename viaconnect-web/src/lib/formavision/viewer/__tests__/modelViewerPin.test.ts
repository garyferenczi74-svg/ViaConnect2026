import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODEL_VIEWER_CDN, MODEL_VIEWER_VERSION } from '../modelViewerPin';

describe('model-viewer pin', () => {
  it('pins Google model-viewer 4.3.0 on the official CDN', () => {
    expect(MODEL_VIEWER_VERSION).toBe('4.3.0');
    expect(MODEL_VIEWER_CDN).toBe(
      'https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.0/model-viewer.min.js',
    );
    expect(MODEL_VIEWER_CDN).not.toMatch(/\/4\.2\.|\/4\.1\.|\/3\.\d/);
  });

  it('product sources load 4.3.0 from CDN and do not add an npm package', () => {
    const pin = readFileSync(
      join(process.cwd(), 'src/lib/formavision/viewer/modelViewerPin.ts'),
      'utf8',
    );
    const viewer = readFileSync(
      join(process.cwd(), 'src/components/formavision/FormaVisionModelViewer.tsx'),
      'utf8',
    );
    expect(pin).toContain("MODEL_VIEWER_VERSION = '4.3.0'");
    expect(pin).toContain('ajax.googleapis.com/ajax/libs/model-viewer');
    expect(viewer).toContain('ensureModelViewerScript');
    expect(viewer).toContain('<model-viewer');
    expect(viewer).toContain('ios-src');
  });
});
