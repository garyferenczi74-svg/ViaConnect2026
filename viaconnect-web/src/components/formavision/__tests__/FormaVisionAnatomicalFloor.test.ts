import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import {
  FORMAVISION_ANATOMICAL_FLOOR_TESTID,
  FormaVisionAnatomicalFloor,
} from '../FormaVisionAnatomicalFloor';
import { selectFloorGirths } from '../anatomicalFloorGeometry';
import { PICASSO_PACK, PICASSO_PACK_FILES, picassoPackSrc } from '../picassoPack';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

const CIRCLE_HEAD_BEZIERS = [
  'c13 0 24 11 24 26',
  'c12 0 22 10 22 24',
  'C112 8 120 16 121 28',
] as const;

describe('FormaVisionAnatomicalFloor', () => {
  it('paints the bundled Picasso pack by sex with rear default', () => {
    const male = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, { sex: 'male' }),
    );
    const female = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, { sex: 'female' }),
    );
    const maleFront = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, {
        sex: 'male',
        view: 'front',
      }),
    );
    expect(male).toContain(FORMAVISION_ANATOMICAL_FLOOR_TESTID);
    expect(male).toContain('data-sex="male"');
    expect(male).toContain('data-floor="picasso-pack"');
    expect(male).toContain('data-view="rear"');
    expect(male).toContain('data-pose="anatomical"');
    expect(male).toContain(PICASSO_PACK.male.rear);
    expect(male).toContain('formavision-picasso-plate');
    expect(male).toContain('<img');
    expect(female).toContain(PICASSO_PACK.female.rear);
    expect(maleFront).toContain(PICASSO_PACK.male.front);
    expect(male).not.toContain('supabase.co');
    expect(male).not.toContain('Male%20Avatar');
    expect(female).not.toContain('Female.svg');
    expect(male).not.toEqual(female);
    expect(picassoPackSrc('male')).toBe(PICASSO_PACK.male.rear);
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

  it('bundles all four Picasso plates locally and forbids circle-head path beziers', () => {
    for (const file of PICASSO_PACK_FILES) {
      const disk = join(webRoot, 'public/formavision/picasso', file);
      expect(existsSync(disk)).toBe(true);
      expect(statSync(disk).size).toBeGreaterThan(50_000);
    }
    const floor = src('src/components/formavision/FormaVisionAnatomicalFloor.tsx');
    const geometry = src('src/components/formavision/anatomicalFloorGeometry.ts');
    expect(floor).toMatch(/picassoPackSrc/);
    expect(floor).not.toMatch(/supabase\.co/);
    expect(floor).not.toMatch(/Male%20Avatar/);
    expect(floor).not.toMatch(/anatomicalBuild/);
    expect(floor).not.toContain('formavision-local-silhouette');
    expect(geometry).not.toMatch(/anatomicalBuild/);
    expect(geometry).not.toMatch(/MALE_CONTOUR|FEMALE_CONTOUR/);
    for (const bezier of CIRCLE_HEAD_BEZIERS) {
      expect(floor).not.toContain(bezier);
      expect(geometry).not.toContain(bezier);
    }
  });
});
