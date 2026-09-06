// Option A spike (Gary greenlight + Arnold TIP PASS):
// Phone Ready ships via <model-viewer> 4.3.0 + Meshy visual GLB.
// R3F phone Ready is parked. Forever Loading / paint-pending dark = FAIL.
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
import { hasReadyScanData } from '@/lib/formavision/tier/readyPlateContract';
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
  host?: 'phone' | 'unknown';
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

describe('Option A: phone Ready uses model-viewer GLB, not R3F', () => {
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
    expect(markup).toContain('data-mesh-look="meshy-glb"');
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

  it('product path wires model-viewer 4.3.0 and does not require phone R3F for Ready', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const viewer = src('src/components/formavision/FormaVisionModelViewer.tsx');
    expect(avatar).toMatch(/selectReadyViewer/);
    expect(avatar).toMatch(/FormaVisionModelViewer/);
    expect(avatar).toMatch(/readyViewer === 'r3f'/);
    expect(avatar).toMatch(/parkPhoneR3f/);
    expect(page).toMatch(/meshyGlbUrl=\{meshyVisual\.glbUrl\}/);
    expect(page).toMatch(/useMeshyVisual\(readyFrblSessionId\)/);
    expect(page).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(page).not.toMatch(/FormaVisionLocalSilhouette/);
    expect(viewer).toMatch(/4\.3\.0|MODEL_VIEWER_VERSION/);
    expect(viewer).toMatch(/<model-viewer/);
    expect(viewer).toMatch(/formavision-f3-overlay/);
    expect(viewer).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(src('package.json')).not.toMatch(/@google\/model-viewer/);
  });
});
