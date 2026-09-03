import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import {
  FORMAVISION_ANATOMICAL_FLOOR_TESTID,
  FormaVisionAnatomicalFloor,
} from '../FormaVisionAnatomicalFloor';
import {
  FEMALE_ANATOMICAL_CONTOUR,
  MALE_ANATOMICAL_CONTOUR,
  selectFloorGirths,
} from '../anatomicalFloorGeometry';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

describe('FormaVisionAnatomicalFloor', () => {
  it('paints a sex-keyed A-pose anatomical SVG with no remote Supabase URL', () => {
    const male = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, { sex: 'male' }),
    );
    const female = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, { sex: 'female' }),
    );
    expect(male).toContain(FORMAVISION_ANATOMICAL_FLOOR_TESTID);
    expect(male).toContain('data-sex="male"');
    expect(male).toContain('data-floor="anatomical-2d"');
    expect(male).toContain('data-pose="a-pose"');
    expect(male).toContain('data-crop="ankles"');
    expect(female).toContain('data-sex="female"');
    expect(male).toContain('<svg');
    expect(male).toContain('formavision-anatomical-volume');
    expect(male).toContain('formavision-anatomical-muscle-lines');
    expect(male).toContain('formavision-anatomical-contour');
    expect(male).toContain('stroke-width="1.5"');
    expect(male).toContain('#2DA5A0');
    expect(male).not.toContain('supabase.co');
    expect(male).not.toContain('Male%20Avatar');
    expect(female).not.toContain('Female.svg');
    expect(male).not.toEqual(female);
    expect(MALE_ANATOMICAL_CONTOUR).not.toBe(FEMALE_ANATOMICAL_CONTOUR);
  });

  it('paints teal landmark ticks only when real girths exist', () => {
    const empty = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, {
        sex: 'male',
        girths: emptyMeasurements(),
      }),
    );
    expect(empty).not.toContain('formavision-anatomical-landmark-ticks');

    const withWaist = emptyMeasurements();
    withWaist.waist = 34;
    const ticked = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, {
        sex: 'male',
        girths: withWaist,
      }),
    );
    expect(ticked).toContain('formavision-anatomical-landmark-ticks');
    expect(ticked).toContain('data-landmark="waist"');
    expect(ticked).not.toContain('data-landmark="chest"');
  });

  it('selectFloorGirths refuses estimate / none (NO-FABRICATION)', () => {
    const waist = emptyMeasurements();
    waist.waist = 34;
    expect(selectFloorGirths(waist, 'measured')?.waist).toBe(34);
    expect(selectFloorGirths(waist, 'overlay')?.waist).toBe(34);
    expect(selectFloorGirths(waist, 'estimate')).toBeNull();
    expect(selectFloorGirths(waist, 'none')).toBeNull();
    expect(selectFloorGirths(null, 'measured')).toBeNull();
  });

  it('source is bundled, never stick geometry or remote heatmap avatars', () => {
    const floor = src('src/components/formavision/FormaVisionAnatomicalFloor.tsx');
    const geometry = src('src/components/formavision/anatomicalFloorGeometry.ts');
    expect(floor).not.toMatch(/supabase\.co/);
    expect(floor).not.toMatch(/Male%20Avatar/);
    expect(floor).not.toMatch(/Female\.svg/);
    expect(floor).toMatch(/strokeWidth=\{1\.5\}/);
    expect(floor).toMatch(/#2DA5A0|#8EC8C4/);
    expect(geometry).not.toMatch(/c13 0 24 11 24 26/);
    expect(geometry).not.toMatch(/c12 0 22 10 22 24/);
    expect(floor).not.toContain('formavision-local-silhouette');
  });
});
