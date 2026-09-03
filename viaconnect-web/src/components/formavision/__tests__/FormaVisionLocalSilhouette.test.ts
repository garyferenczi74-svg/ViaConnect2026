import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FORMAVISION_ANATOMICAL_FLOOR_TESTID,
  FormaVisionAnatomicalFloor,
} from '../FormaVisionAnatomicalFloor';
import {
  FORMAVISION_LOCAL_SILHOUETTE_TESTID,
  FormaVisionLocalSilhouette,
} from '../FormaVisionLocalSilhouette';

const webRoot = process.cwd();

describe('FormaVisionLocalSilhouette alias', () => {
  it('is the anatomical floor, not the circle-head stick', () => {
    expect(FORMAVISION_LOCAL_SILHOUETTE_TESTID).toBe(FORMAVISION_ANATOMICAL_FLOOR_TESTID);
    const alias = renderToStaticMarkup(
      React.createElement(FormaVisionLocalSilhouette, { sex: 'male' }),
    );
    const floor = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, { sex: 'male' }),
    );
    expect(alias).toBe(floor);
    expect(alias).toContain('formavision-anatomical-floor');
    expect(alias).not.toContain('formavision-local-silhouette');

    const src = readFileSync(
      join(webRoot, 'src/components/formavision/FormaVisionLocalSilhouette.tsx'),
      'utf8',
    );
    expect(src).toMatch(/FormaVisionAnatomicalFloor/);
    expect(src).not.toMatch(/c13 0 24 11 24 26/);
    expect(src).not.toMatch(/silhouettePath/);
  });
});
