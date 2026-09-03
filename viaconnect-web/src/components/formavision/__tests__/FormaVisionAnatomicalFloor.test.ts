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
import { selectFloorGirths } from '../anatomicalFloorGeometry';
import { PICASSO_PACK } from '../picassoPack';
import {
  FORMAVISION_FLOOR_LOADING_COPY,
  FORMAVISION_FLOOR_UNAVAILABLE_COPY,
} from '@/lib/formavision/tier/floorRoleCopy';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

const CIRCLE_HEAD_BEZIERS = [
  'c13 0 24 11 24 26',
  'c12 0 22 10 22 24',
] as const;

describe('FormaVisionAnatomicalFloor', () => {
  it('paints a labeled designed anatomical 2D floor, never a Picasso stock person', () => {
    const male = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, { sex: 'male' }),
    );
    const female = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, { sex: 'female' }),
    );
    expect(male).toContain(FORMAVISION_ANATOMICAL_FLOOR_TESTID);
    expect(male).toContain('data-sex="male"');
    expect(male).toContain('data-floor="anatomical-2d"');
    expect(male).toContain('data-floor-role="loading"');
    expect(male).toContain('data-pose="a-pose"');
    expect(male).toContain('formavision-anatomical-contour');
    expect(male).toContain('formavision-anatomical-muscle-lines');
    expect(male).toContain(FORMAVISION_FLOOR_LOADING_COPY);
    expect(male).not.toContain('formavision-picasso-plate');
    expect(male).not.toContain(PICASSO_PACK.male.rear);
    expect(male).not.toContain('<img');
    expect(female).toContain('data-sex="female"');
    expect(female).not.toContain(PICASSO_PACK.female.rear);
    expect(male).not.toEqual(female);
  });

  it('unavailable role is honest and never a stock photograph', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, {
        sex: 'male',
        floorRole: 'unavailable',
      }),
    );
    expect(markup).toContain('data-floor-role="unavailable"');
    expect(markup).toContain(FORMAVISION_FLOOR_UNAVAILABLE_COPY);
    expect(markup).not.toContain('/formavision/picasso/');
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
    expect(ticked).toContain('#2DA5A0');
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

  it('product floor source restores designed geometry and drops Picasso + stick beziers', () => {
    const floor = src('src/components/formavision/FormaVisionAnatomicalFloor.tsx');
    const geometry = src('src/components/formavision/anatomicalFloorGeometry.ts');
    expect(floor).toMatch(/anatomicalBuild/);
    expect(floor).not.toMatch(/picassoPackSrc/);
    expect(floor).not.toMatch(/supabase\.co/);
    expect(floor).not.toMatch(/Male%20Avatar/);
    expect(floor).not.toContain('formavision-local-silhouette');
    expect(geometry).toMatch(/anatomicalBuild/);
    expect(geometry).toMatch(/MALE_CONTOUR|FEMALE_CONTOUR|MALE_ANATOMICAL_CONTOUR/);
    for (const bezier of CIRCLE_HEAD_BEZIERS) {
      expect(floor).not.toContain(bezier);
      expect(geometry).not.toContain(bezier);
    }
  });
});
