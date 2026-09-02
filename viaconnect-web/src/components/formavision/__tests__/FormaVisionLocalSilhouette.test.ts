import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FORMAVISION_LOCAL_SILHOUETTE_TESTID,
  FormaVisionLocalSilhouette,
} from '../FormaVisionLocalSilhouette';

const webRoot = process.cwd();

describe('FormaVisionLocalSilhouette', () => {
  it('paints an inline male/female outline with no remote Supabase URL', () => {
    const male = renderToStaticMarkup(
      React.createElement(FormaVisionLocalSilhouette, { sex: 'male' }),
    );
    const female = renderToStaticMarkup(
      React.createElement(FormaVisionLocalSilhouette, { sex: 'female' }),
    );
    expect(male).toContain(FORMAVISION_LOCAL_SILHOUETTE_TESTID);
    expect(male).toContain('data-sex="male"');
    expect(female).toContain('data-sex="female"');
    expect(male).toContain('<svg');
    expect(male).toContain('stroke-width="1.5"');
    expect(male).not.toContain('supabase.co');
    expect(male).not.toContain('Male%20Avatar');
    expect(female).not.toContain('Female.svg');
    expect(male).not.toEqual(female);
  });

  it('source never fetches the remote heatmap avatars', () => {
    const src = readFileSync(
      join(webRoot, 'src/components/formavision/FormaVisionLocalSilhouette.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/supabase\.co/);
    expect(src).not.toMatch(/Male%20Avatar/);
    expect(src).not.toMatch(/Female\.svg/);
    expect(src).toMatch(/strokeWidth=\{1\.5\}/);
  });
});
