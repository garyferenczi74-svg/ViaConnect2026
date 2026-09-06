// Gary 2026-09-06 Michelangelo standing rule + Sherlock A+C+D:
// A: <model-viewer> 4.3.0 on phone AND desktop Ready.
// C: Meshy visual GLB only. No parametric cyan wireframe as Ready.
// D: no SnapMeasure OBJ, no blind R3F paint-detector churn.
// Never-empty: live GLB or honest text notice. No alien floor.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import {
  FORMAVISION_PLATE_LOADING_NOTICE,
  FORMAVISION_PLATE_UNAVAILABLE_NOTICE,
  FormaVisionPlateNotice,
} from '@/components/formavision/FormaVisionPlateNotice';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import {
  hasReadyScanData,
  isAllowedReadyPlateSuccessLook,
  isF3UsedAsBodySubstituteFail,
  resolveReadyPlateMeshLook,
} from '@/lib/formavision/tier/readyPlateContract';
import { selectReadyViewer } from '@/lib/formavision/viewer/selectReadyViewer';
import { MODEL_VIEWER_VERSION } from '@/lib/formavision/viewer/modelViewerPin';

const webRoot = process.cwd();
const GLB = 'https://storage.example/u/s/meshy/visual.glb?token=1';

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-option-a',
    date: '2026-09-01',
    estimatedBodyFatMin: 30,
    estimatedBodyFatMax: 36,
    estimatedWhrMin: 0.84,
    estimatedWhrMax: 0.88,
  });
}

function renderPhoneReady(overrides: {
  meshyGlbUrl?: string | null;
  meshyStatus?: 'idle' | 'pending' | 'succeeded' | 'failed' | 'skipped_no_key';
  host?: 'phone' | 'desktop' | 'unknown';
} = {}) {
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
      readyViewerHost: overrides.host ?? 'phone',
      meshyGlbUrl: overrides.meshyGlbUrl ?? null,
      meshyStatus: overrides.meshyStatus ?? 'idle',
      children: React.createElement(FormaVisionPlateNotice, { kind: 'unavailable' }),
    }),
  );
}

describe('Gary lock: phone AND desktop Ready use model-viewer GLB, not R3F', () => {
  it('Ready mobile path selects model-viewer when Meshy visual is ready', () => {
    expect(hasReadyScanData(garyReadyScan())).toBe(true);
    expect(
      selectReadyViewer({
        host: 'phone',
        hasReadyScanData: true,
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
      }),
    ).toBe('model-viewer');

    const markup = renderPhoneReady({
      meshyGlbUrl: GLB,
      meshyStatus: 'succeeded',
    });
    expect(markup).toContain('data-ready-viewer="model-viewer"');
    expect(markup).toContain('data-surface="model-viewer"');
    expect(markup).toContain('data-r3f-parked="true"');
    expect(markup).toContain(`data-model-viewer-version="${MODEL_VIEWER_VERSION}"`);
    expect(markup).toContain('formavision-model-viewer');
    expect(markup).toContain('formavision-model-viewer-el');
    expect(markup).toContain(GLB);
    expect(markup).toContain('formavision-f3-overlay');
    expect(markup).toContain('data-f3-look="holographic-f3"');
    expect(markup).toContain('data-mesh-look="meshy-glb"');
    expect(markup).toContain('148deg');
    expect(markup).toContain('2.72m');
    expect(markup).not.toContain('repeating-linear-gradient');
    expect(markup).not.toContain('ar-modes');
    expect(markup).not.toContain('formavision-3d-pending');
    expect(markup).not.toContain('formavision-3d-mount');
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('formavision-local-silhouette');
    expect(markup).not.toContain('This outline is not your body');
    expect(MODEL_VIEWER_VERSION).toBe('4.3.0');
  });

  it('phone Ready without GLB is an honest text notice — never empty, never alien', () => {
    const pending = renderPhoneReady({ meshyStatus: 'pending' });
    expect(pending).toContain('data-ready-viewer="notice"');
    expect(pending).toContain('data-surface="ready-notice"');
    expect(pending).toContain('data-r3f-parked="true"');
    expect(pending).toContain('formavision-plate-notice');
    expect(pending).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(pending).toContain('data-notice-presented="true"');
    expect(pending).toContain('floor=hidden paint=pending');
    expect(pending).not.toContain('formavision-3d-pending');
    expect(pending).not.toContain('formavision-model-viewer-el');
    expect(pending).not.toContain('formavision-anatomical-floor');
    expect(pending).not.toContain('formavision-anatomical-contour');
    expect(pending).not.toContain('data-floor="anatomical-2d"');

    const missing = renderPhoneReady({ meshyStatus: 'skipped_no_key' });
    expect(missing).toContain(FORMAVISION_PLATE_UNAVAILABLE_NOTICE);
    expect(missing).not.toContain('Showing your scan-shaped mesh');
    expect(missing).not.toContain('formavision-3d-pending');
    expect(missing).not.toContain('photos are stored');
    expect(missing).not.toContain('retention');
  });

  it('unknown host Ready first paint parks R3F so WebKit cannot hydrate paint-pending', () => {
    const markup = renderPhoneReady({ host: 'unknown', meshyStatus: 'idle' });
    expect(markup).toContain('data-ready-viewer="notice"');
    expect(markup).toContain('data-r3f-parked="true"');
    expect(markup).not.toContain('formavision-3d-pending');
    expect(markup).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
  });

  it('Sherlock A+C+D: Meshy GLB only, no SnapMeasure OBJ, no R3F paint-detector churn', () => {
    const viewer = src('src/lib/formavision/viewer/selectReadyViewer.ts');
    const pin = src('src/lib/formavision/viewer/modelViewerPin.ts');
    const model = src('src/components/formavision/FormaVisionModelViewer.tsx');
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(pin).toContain("MODEL_VIEWER_VERSION = '4.3.0'");
    expect(viewer).toMatch(/isMeshyVisualGlbReady/);
    expect(viewer).not.toMatch(/SnapMeasure|\.obj['"`]/);
    expect(model).not.toMatch(/SnapMeasure|\.obj['"`]/);
    expect(model).toMatch(/formavision-f3-overlay/);
    expect(model).toMatch(/applyF3HolographicOverlay/);
    expect(src('src/lib/formavision/viewer/applyF3HolographicOverlay.ts')).not.toMatch(
      /setBaseColorFactor/,
    );
    expect(src('src/lib/formavision/viewer/applyF3HolographicOverlay.ts')).not.toMatch(
      /wireframe/i,
    );
    expect(avatar).toMatch(/parkR3fReady/);
    expect(avatar).toMatch(/readyPainted = parkR3fReady \? modelViewerPainted : canvasHasPainted/);
    expect(avatar).not.toMatch(/canvasHasPainted \|\| modelViewerPainted/);
    expect(model).not.toMatch(/shouldStampPaintedFrame|FirstPaintWatchdog|drawingBufferHasPixels/);
  });

  it('desktop Ready with Meshy GLB uses the same in-page model-viewer, not R3F', () => {
    const markup = renderPhoneReady({
      host: 'desktop',
      meshyGlbUrl: GLB,
      meshyStatus: 'succeeded',
    });
    expect(markup).toContain('data-ready-viewer="model-viewer"');
    expect(markup).toContain('data-ready-host="desktop"');
    expect(markup).toContain('data-r3f-parked="true"');
    expect(markup).toContain('formavision-model-viewer-el');
    expect(markup).toContain(GLB);
    expect(markup).not.toContain('formavision-3d-pending');
    expect(markup).not.toContain('data-ready-viewer="r3f"');
  });

  it('Picasso lock: F3 is sheen on Meshy only — never a wireframe body substitute', () => {
    expect(resolveReadyPlateMeshLook('model-viewer')).toBe('meshy-glb');
    expect(resolveReadyPlateMeshLook('notice')).toBe('notice');
    expect(resolveReadyPlateMeshLook('r3f')).toBe('notice');
    expect(isAllowedReadyPlateSuccessLook('meshy-glb')).toBe(true);
    expect(isAllowedReadyPlateSuccessLook('holographic-f3')).toBe(false);
    expect(isAllowedReadyPlateSuccessLook('wireframe-picasso')).toBe(false);
    expect(
      isF3UsedAsBodySubstituteFail({
        hasReadyScanData: true,
        plateLook: 'holographic-f3',
      }),
    ).toBe(true);
    expect(
      isF3UsedAsBodySubstituteFail({
        hasReadyScanData: true,
        plateLook: 'meshy-glb',
      }),
    ).toBe(false);

    const pending = renderPhoneReady({ host: 'desktop', meshyStatus: 'pending' });
    expect(pending).toContain('data-mesh-look="notice"');
    expect(pending).toContain('data-ready-viewer="notice"');
    expect(pending).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(pending).not.toContain('data-mesh-look="holographic-f3"');
    expect(pending).not.toContain('data-mesh-look="wireframe-picasso"');
    expect(pending).not.toContain('formavision-f3-overlay');
    expect(pending).not.toContain('formavision-3d-pending');

    const ok = renderPhoneReady({
      host: 'desktop',
      meshyGlbUrl: GLB,
      meshyStatus: 'succeeded',
    });
    expect(ok).toContain('data-mesh-look="meshy-glb"');
    expect(ok).toContain('formavision-f3-overlay');
    expect(ok).toContain('data-f3-look="holographic-f3"');
    expect(ok).not.toContain('data-mesh-look="holographic-f3"');
  });

  it('desktop Ready without GLB is honest text — never the parametric wireframe', () => {
    const markup = renderPhoneReady({
      host: 'desktop',
      meshyStatus: 'idle',
    });
    expect(markup).toContain('data-ready-viewer="notice"');
    expect(markup).toContain('data-surface="ready-notice"');
    expect(markup).toContain('data-r3f-parked="true"');
    expect(markup).toContain('data-placement="fill"');
    expect(markup).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(markup).not.toContain('formavision-3d-pending');
    expect(markup).not.toContain('formavision-model-viewer-el');
  });

  it('product path wires model-viewer 4.3.0 and parks R3F Ready on both surfaces', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const viewer = src('src/components/formavision/FormaVisionModelViewer.tsx');
    expect(avatar).toMatch(/selectReadyViewer/);
    expect(avatar).toMatch(/FormaVisionModelViewer/);
    expect(avatar).toMatch(/readyViewer === 'r3f'/);
    expect(avatar).toMatch(/parkR3fReady/);
    expect(avatar).toMatch(/shouldParkR3fReady/);
    expect(page).toMatch(/meshyGlbUrl=\{meshyVisual\.glbUrl\}/);
    expect(page).toMatch(/useMeshyVisual\(readyFrblSessionId/);
    expect(page).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(page).not.toMatch(/FormaVisionLocalSilhouette/);
    expect(viewer).toMatch(/4\.3\.0|MODEL_VIEWER_VERSION/);
    expect(viewer).toMatch(/<model-viewer/);
    expect(viewer).toMatch(/formavision-f3-overlay/);
    expect(viewer).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(src('package.json')).not.toMatch(/@google\/model-viewer/);
  });
});
