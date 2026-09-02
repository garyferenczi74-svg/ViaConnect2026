// Arnold tip acceptance gate for PR #173 (www 3D mount after #172 FAIL).
//
// Four gates must hold. Named so the PR body and this file stay in lockstep.
//   1. FormaVision3DAvatar / WebGL canvas mounts (iPhone Safari + desktop Chrome)
//   2. NOT SegmentalHeatMap Male Avatar.svg when 3D can run
//   3. BF ~33% morph visible after hard refresh
//   4. FRBL hide unchanged
//
// Node harness: no live GPU. Mount/SVG gates are decision + wiring. Morph is
// the same resolveAvatarCircumferences + scanToParamVector path the page uses
// on cold load. FRBL hide is the existing scanHistoryShowsFrblGrid SSOT.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { resolveAvatarCircumferences } from '@/lib/body-tracker/composition/resolveAvatarCircumferences';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import {
  acquireWebGLContext,
  isSafariWebGLHost,
  webglContextTypeOrder,
} from '@/lib/formavision/gl/acquireWebGLContext';
import { buildBodyGeometry } from '@/lib/formavision/geometry/buildBodyGeometry';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { MALE_TEMPLATE } from '@/lib/formavision/geometry/types';
import { shouldHoldScrubMorph } from '@/lib/formavision/motion/shouldHoldScrubMorph';
import { selectAvatarSurface } from '@/lib/formavision/tier/avatarSurfaceDecision';
import { scanHistoryShowsFrblGrid } from '@/lib/scan/scanSummary';
import { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';
import * as THREE from 'three';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const EMPTY_REGION = {
  right_arm: null,
  left_arm: null,
  trunk: null,
  right_leg: null,
  left_leg: null,
};

function historyBf33(): CompositionSnapshot {
  return {
    entryId: 'entry-33',
    source: 'scan',
    recordedAt: '2026-09-01T18:00:00.000Z',
    totalBodyFatPct: 33,
    regionFatPct: { ...EMPTY_REGION },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { ...EMPTY_REGION },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    scanId: 'scan-33',
    estimatedBodyFatMin: 30,
    estimatedBodyFatMax: 36,
    estimatedWhrMin: 0.84,
    estimatedWhrMax: 0.88,
    isEstimated: true,
  };
}

function meanRadiusAtY(geometry: THREE.BufferGeometry, targetY: number, bandM: number): number {
  const pos = geometry.getAttribute('position');
  let sum = 0;
  let count = 0;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (Math.abs(y - targetY) <= bandM) {
      sum += Math.hypot(pos.getX(i), pos.getZ(i));
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

describe('Arnold acceptance gate 1: WebGL canvas mounts (iPhone Safari + desktop Chrome)', () => {
  it('classifies iPhone Safari and desktop Chrome correctly', () => {
    expect(isSafariWebGLHost(IPHONE_SAFARI)).toBe(true);
    expect(isSafariWebGLHost(DESKTOP_CHROME)).toBe(false);
  });

  it('Safari asks WebGL1 first; Chrome asks WebGL2 first; both can acquire a context', () => {
    expect(webglContextTypeOrder(true)[0]).toBe('webgl');
    expect(webglContextTypeOrder(false)[0]).toBe('webgl2');

    const safariHost = {
      getContext: (id: string) => (id === 'webgl' ? { kind: 'webgl' } : null),
    };
    const chromeHost = {
      getContext: (id: string) => (id === 'webgl2' ? { kind: 'webgl2' } : null),
    };
    expect(acquireWebGLContext(safariHost, { safariLike: true })).toEqual({ kind: 'webgl' });
    expect(acquireWebGLContext(chromeHost, { safariLike: false })).toEqual({ kind: 'webgl2' });
  });

  it('selectAvatarSurface mounts 3D for both hosts when 3D has not confirmed-failed', () => {
    for (const webgl of ['available', 'unknown', 'ssr'] as const) {
      expect(
        selectAvatarSurface({ renderTier: 'cinematic', confirmedFailure: false, webgl }),
      ).toBe('formavision3d');
      expect(
        selectAvatarSurface({ renderTier: 'lite', confirmedFailure: false, webgl }),
      ).toBe('formavision3d');
    }
  });

  it('FormaVision page + avatar wiring mounts FormaVision3DAvatar / Canvas, not a hasWebGL render gate', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const threeD = src('src/components/formavision/FormaVision3DAvatar.tsx');
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(page).toMatch(/BodyCompositionAvatar/);
    expect(page).toMatch(/formavision-canvas-grid/);
    expect(threeD).toMatch(/formavision-3d-mount/);
    expect(threeD).toMatch(/FormaVisionCanvas/);
    expect(threeD).not.toMatch(/useMemo\(\(\) => hasWebGL\(\), \[\]\)/);
    expect(canvas).toMatch(/formavision-avatar-canvas/);
    expect(canvas).toMatch(/createFormaVisionRenderer/);
  });
});

describe('Arnold acceptance gate 2: not Male Avatar.svg when 3D can run', () => {
  it('never selects the SegmentalHeatMap floor while WebGL might still work', () => {
    expect(
      selectAvatarSurface({
        renderTier: 'cinematic',
        confirmedFailure: false,
        webgl: 'available',
      }),
    ).not.toBe('fallback2d');
    expect(
      selectAvatarSurface({
        renderTier: 'cinematic',
        confirmedFailure: false,
        webgl: 'ssr',
      }),
    ).not.toBe('fallback2d');
  });

  it('SSR first paint is the 3D footprint, not the heatmap / Male Avatar children', () => {
    const markup = renderToStaticMarkup(
      React.createElement(BodyCompositionAvatar, {
        sex: 'male',
        scan: null,
        circumferences: null,
        unit: 'in',
        activeTab: 'bodyFat',
        children: React.createElement('img', {
          src: 'https://example.invalid/Male%20Avatar.svg',
          alt: 'Male body composition avatar',
        }),
      }),
    );
    expect(markup).toContain('formavision-avatar-footprint');
    expect(markup).toContain('formavision-3d-pending');
    expect(markup).not.toContain('Male%20Avatar.svg');
    expect(markup).not.toContain('formavision-fallback-2d');
  });

  it('heatmap SVG is only the fallback child on the FormaVision plate', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const heatmap = src('src/components/body-tracker/SegmentalHeatMap.tsx');
    expect(page).toMatch(/SegmentalHeatMap/);
    expect(page).toMatch(/<\/BodyCompositionAvatar>/);
    expect(heatmap).toMatch(/Male%20Avatar\.svg/);
  });
});

describe('Arnold acceptance gate 3: BF ~33% morph after hard refresh', () => {
  it('history BF 33% after rest (onScrub null) drives a non-template waist', () => {
    const history = historyBf33();
    const circs = resolveAvatarCircumferences({
      overlay: null,
      measured: emptyMeasurements(),
      historySnapshot: history,
      sex: 'male',
      unit: 'in',
    });
    expect(shouldHoldScrubMorph(null, circs)).toBe(false);

    const morphed = scanToParamVector({
      snapshot: history,
      circumferences: circs,
      sex: 'male',
      unit: 'in',
    });
    const template = scanToParamVector({
      snapshot: null,
      circumferences: null,
      sex: 'male',
      unit: 'in',
    });
    const waist = morphed.rings.find((r) => r.id === 'waist')?.circumferenceM;
    expect(waist).toBeTruthy();
    expect(waist).not.toBe(0.9);
    expect(template.rings.find((r) => r.id === 'waist')?.circumferenceM).toBeNull();

    const waistY = MALE_TEMPLATE.rings.find((r) => r.id === 'waist')!.levelN * MALE_TEMPLATE.heightM;
    const morphGeo = buildBodyGeometry(morphed);
    const templateGeo = buildBodyGeometry(template);
    const morphR = meanRadiusAtY(morphGeo.geometry, waistY, 0.02);
    const templateR = meanRadiusAtY(templateGeo.geometry, waistY, 0.02);
    expect(morphR).toBeGreaterThan(templateR * 1.05);
    morphGeo.dispose();
    templateGeo.dispose();
  });

  it('does not fabricate a waist inside scanToParamVector when circs are null', () => {
    const honest = scanToParamVector({
      snapshot: historyBf33(),
      circumferences: null,
      sex: 'male',
      unit: 'in',
    });
    expect(honest.rings.find((r) => r.id === 'waist')?.circumferenceM).toBeNull();
    expect(honest.rings.find((r) => r.id === 'waist')?.estimated).toBe(true);
  });

  it('FormaVision page still resolves girths and releases scrub after refresh', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const timeline = src('src/components/formavision/JourneyTimeline.tsx');
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(page).toMatch(/resolveAvatarCircumferences/);
    expect(page).toMatch(/onScrub=\{setScrubVector\}/);
    expect(page).toMatch(/setScrubVector\(null\)/);
    expect(timeline).toMatch(/onScrubRef\.current\(null\)/);
    expect(canvas).toMatch(/shouldHoldScrubMorph/);
  });
});

describe('Arnold acceptance gate 4: FRBL hide unchanged', () => {
  it('formavision_photo still hides the FRBL grid (SSOT + ScanHistory wiring)', () => {
    expect(FORMAVISION_PHOTO_PROTOCOL).toBe('formavision_photo');
    expect(scanHistoryShowsFrblGrid({ protocol: 'formavision_photo' })).toBe(false);
    expect(scanHistoryShowsFrblGrid({ protocol: '4pose_v1' })).toBe(true);

    const history = src('src/components/scan/ScanHistory.tsx');
    const summary = src('src/lib/scan/scanSummary.ts');
    expect(history).toMatch(/scanHistoryShowsFrblGrid/);
    expect(history).toMatch(/Photos are not stored after analysis/);
    expect(summary).toMatch(/formavision_photo never shows the FRBL grid/);
  });
});
