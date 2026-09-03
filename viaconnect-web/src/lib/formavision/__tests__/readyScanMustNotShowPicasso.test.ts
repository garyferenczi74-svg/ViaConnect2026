// Production FAIL after PR #181 (761f2aa): Ready scan on mobile Results
// paints a photorealistic Picasso stock person (male-rear.png) inside the
// teal chamber. That image is another man, not a 3D mesh from the user's
// four photos + BF/sex/girths.
//
// Contract:
//   1. Ready scan markup must never include Picasso / stock-person assets.
//   2. Ready scan with persisted BF + estimated girths must mount 3D and
//      apply a scan-derived morph (not the sex template).
//   3. Any 2D floor is loading or hard-failure only, and is labeled as such.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import { FormaVisionAnatomicalFloor } from '@/components/formavision/FormaVisionAnatomicalFloor';
import { FormaVision3DAvatar } from '@/components/formavision/FormaVision3DAvatar';
import { PICASSO_PACK } from '@/components/formavision/picassoPack';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { templateForSex } from '@/lib/formavision/geometry/types';
import { buildAvatarMorphStamp } from '@/lib/formavision/morph/avatarMorphStamp';
import { resolveScanAppearanceProjection } from '@/lib/formavision/appearance/scanAppearanceProjection';
import {
  FORMAVISION_FLOOR_LOADING_COPY,
  FORMAVISION_FLOOR_UNAVAILABLE_COPY,
} from '@/lib/formavision/tier/floorRoleCopy';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

const PRODUCT_PATH_FILES = [
  'src/components/formavision/FormaVisionAnatomicalFloor.tsx',
  'src/components/formavision/BodyCompositionAvatar.tsx',
  'src/components/formavision/FormaVision3DAvatar.tsx',
  'src/app/(app)/(consumer)/body-tracker/formavision/page.tsx',
] as const;

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-181',
    date: '2026-09-03',
    estimatedBodyFatMin: 30,
    estimatedBodyFatMax: 36,
    estimatedWhrMin: 0.84,
    estimatedWhrMax: 0.88,
  });
}

function renderReadyPlate() {
  const scan = garyReadyScan();
  const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');
  return renderToStaticMarkup(
    React.createElement(BodyCompositionAvatar, {
      sex: 'male',
      scan,
      circumferences,
      girthSource: 'estimate',
      unit: 'in',
      activeTab: 'bodyFat',
      children: React.createElement(FormaVisionAnatomicalFloor, {
        sex: 'male',
        floorRole: 'unavailable',
      }),
    }),
  );
}

describe('Production FAIL #181: Ready scan must not render Picasso stock person', () => {
  it('Ready male 30.0–36.0% plate never paints Picasso pack assets', () => {
    const markup = renderReadyPlate();
    expect(markup).not.toContain('formavision-picasso-plate');
    expect(markup).not.toContain('data-floor="picasso-pack"');
    expect(markup).not.toContain(PICASSO_PACK.male.rear);
    expect(markup).not.toContain(PICASSO_PACK.male.front);
    expect(markup).not.toContain('/formavision/picasso/');
    expect(markup).not.toContain('male-rear.png');
    expect(markup).not.toMatch(/<img[^>]+picasso/i);
  });

  it('product render path does not import or reference the Picasso pack', () => {
    for (const file of PRODUCT_PATH_FILES) {
      const text = src(file);
      expect(text).not.toMatch(/picassoPackSrc/);
      expect(text).not.toMatch(/from ['"]\.\/picassoPack['"]/);
      expect(text).not.toMatch(/formavision\/picasso/);
      expect(text).not.toMatch(/data-floor="picasso-pack"/);
      expect(text).not.toMatch(/formavision-picasso-plate/);
    }
  });
});

describe('Ready scan with measurements must mount 3D and apply scan morph', () => {
  it('SSR Ready plate stays on the 3D footprint, not the fallback latch', () => {
    const markup = renderReadyPlate();
    expect(markup).toContain('formavision-avatar-footprint');
    expect(markup).toContain('formavision-3d-pending');
    expect(markup).toContain('data-surface="formavision3d"');
    expect(markup).toContain('data-tier="cinematic"');
    expect(markup).toContain('data-morph="applied"');
    expect(markup).toContain('data-morph-source="estimate"');
    expect(markup).toContain('data-morph-bf="33.0"');
    expect(markup).toContain('data-appearance="procedural"');
    expect(markup).not.toContain('formavision-fallback-2d');
  });

  it('Gary Ready BF 30–36% estimate girths produce a non-template waist morph', () => {
    const scan = garyReadyScan();
    const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');
    expect(circumferences).not.toBeNull();
    const stamp = buildAvatarMorphStamp({
      scan,
      circumferences,
      sex: 'male',
      unit: 'in',
      source: 'estimate',
    });
    expect(stamp.morph).toBe('applied');
    expect(stamp.source).toBe('estimate');
    expect(stamp.bf).toBe('33.0');
    const vector = scanToParamVector({
      snapshot: scan,
      circumferences,
      sex: 'male',
      unit: 'in',
    });
    const waist = vector.rings.find((r) => r.id === 'waist')?.circumferenceM;
    const templateWaist = templateForSex('male').rings.find((r) => r.id === 'waist')?.circumferenceM;
    expect(waist).toBeTruthy();
    expect(templateWaist).toBeTruthy();
    expect(waist!).toBeGreaterThan(templateWaist!);
  });

  it('FormaVision3DAvatar pending path still mounts the 3D contract', () => {
    const scan = garyReadyScan();
    const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');
    const markup = renderToStaticMarkup(
      React.createElement(FormaVision3DAvatar, {
        sex: 'male',
        scan,
        circumferences,
        girthSource: 'estimate',
        unit: 'in',
        activeTab: 'bodyFat',
        onRenderError: () => undefined,
      }),
    );
    expect(markup).toContain('formavision-3d-pending');
    expect(markup).not.toContain('formavision-picasso-plate');
    expect(markup).not.toContain('/formavision/picasso/');
  });
});

describe('2D floor is labeled loading/unavailable and never a faux result', () => {
  it('loading floor caption is honest and designed, not a stock person', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, {
        sex: 'male',
        floorRole: 'loading',
      }),
    );
    expect(markup).toContain('data-floor="anatomical-2d"');
    expect(markup).toContain('data-floor-role="loading"');
    expect(markup).toContain(FORMAVISION_FLOOR_LOADING_COPY);
    expect(markup).not.toContain('formavision-picasso-plate');
    expect(markup).not.toContain('/formavision/picasso/');
    expect(markup).toContain('formavision-anatomical-contour');
  });

  it('unavailable floor caption never implies the outline is the user', () => {
    const markup = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, {
        sex: 'female',
        floorRole: 'unavailable',
      }),
    );
    expect(markup).toContain('data-floor-role="unavailable"');
    expect(markup).toContain(FORMAVISION_FLOOR_UNAVAILABLE_COPY);
    expect(markup).not.toContain(PICASSO_PACK.female.rear);
    expect(markup).not.toMatch(/your body|your scan result/i);
  });

  it('photo texture projection is explicitly unavailable, not faked', () => {
    const projection = resolveScanAppearanceProjection();
    expect(projection.mode).toBe('procedural');
    expect(projection.photoProjection.available).toBe(false);
    expect(projection.photoProjection.reason).toBe('missing_backend_appearance_model');
  });
});
