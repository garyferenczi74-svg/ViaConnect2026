import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrblSideToggle } from '../FrblSideToggle';
import { FormaVisionFrblReadyPlate } from '../FormaVisionFrblReadyPlate';
import { BodyCompositionAvatar } from '../BodyCompositionAvatar';
import { FormaVisionPlateNotice } from '../FormaVisionPlateNotice';
import { FRBL_SIDE_UNAVAILABLE_HELPER } from '@/lib/formavision/viewer/frblReadySide';
import { discardedFrblPoses } from '@/lib/formavision/retainFrbl';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';

describe('FrblSideToggle', () => {
  it('renders Front · Right · Back · Left pills and disables missing sides', () => {
    const html = renderToStaticMarkup(
      React.createElement(FrblSideToggle, {
        active: 'front',
        poses: { front: true, right: false, back: true, left: false },
        onChange: () => undefined,
      }),
    );
    expect(html).toContain('formavision-frbl-side-toggle');
    expect(html).toContain('formavision-frbl-side-front');
    expect(html).toContain('formavision-frbl-side-right');
    expect(html).toContain('formavision-frbl-side-back');
    expect(html).toContain('formavision-frbl-side-left');
    expect(html).toContain('Front');
    expect(html).toContain('Right');
    expect(html).toContain('Back');
    expect(html).toContain('Left');
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('data-present="false"');
    expect(html).toContain('formavision-frbl-side-missing');
    expect(html).toContain(FRBL_SIDE_UNAVAILABLE_HELPER);
    expect(html).not.toMatch(/silhouette|wireframe|anatomical/i);
  });
});

describe('FormaVisionFrblReadyPlate', () => {
  it('defaults to Front and uses object-fit contain with no in-plate scroll', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-retain-1',
        poses: { front: true, right: true, back: true, left: true },
      }),
    );
    expect(html).toContain('formavision-frbl-ready-plate');
    expect(html).toContain('data-ready-side="front"');
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('formavision-frbl-side-toggle');
    expect(html).not.toContain('overflow-y-auto');
    expect(html).not.toContain('formavision-model-viewer');
    expect(html).not.toContain('formavision-3d-mount');
    expect(html).not.toContain('formavision-anatomical-floor');
    const plateSrc = readFileSync(
      join(process.cwd(), 'src/components/formavision/FormaVisionFrblReadyPlate.tsx'),
      'utf8',
    );
    expect(plateSrc).toMatch(/object-contain/);
    expect(plateSrc).toMatch(/fetchSignedFullUrl/);
  });

  it('defaults to first available side when Front was not kept', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-partial',
        poses: { front: false, right: true, back: false, left: false },
      }),
    );
    expect(html).toContain('data-ready-side="right"');
    expect(html).toContain(FRBL_SIDE_UNAVAILABLE_HELPER);
  });
});

describe('BodyCompositionAvatar Ready FRBL 2D vs discard', () => {
  const scan = snapshotFromPhotoScanSummary({
    id: 'prod-ready',
    date: '2026-09-11',
    estimatedBodyFatMin: 30,
    estimatedBodyFatMax: 36,
  });
  const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');

  it('retained FRBL paints the 2D plate and never mounts GLB or wireframe', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyCompositionAvatar, {
        sex: 'male',
        scan,
        circumferences,
        unit: 'in',
        activeTab: 'bodyFat',
        readyViewerHost: 'phone',
        meshyGlbUrl: 'https://storage.example/u/s/meshy/visual.glb?token=1',
        meshyStatus: 'succeeded',
        photosRetained: true,
        frblSessionId: 'sess-retain-1',
        frblPoses: { front: true, right: true, back: true, left: true },
        children: React.createElement(FormaVisionPlateNotice, { kind: 'unavailable' }),
      }),
    );
    expect(html).toContain('data-ready-viewer="frbl-2d"');
    expect(html).toContain('data-photos-retained="true"');
    expect(html).toContain('data-frbl-session="sess-retain-1"');
    expect(html).toContain('formavision-frbl-ready-plate');
    expect(html).toContain('formavision-frbl-side-toggle');
    expect(html).not.toContain('data-unavailable-reason="visual-failed"');
    expect(html).not.toContain('formavision-model-viewer-el');
    expect(html).not.toContain('formavision-3d-mount');
  });

  it('after discard shows honest notice only — no ghost body or last-cached GLB', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyCompositionAvatar, {
        sex: 'male',
        scan,
        circumferences,
        unit: 'in',
        activeTab: 'bodyFat',
        readyViewerHost: 'desktop',
        meshyGlbUrl: 'https://storage.example/u/s/meshy/visual.glb?token=1',
        meshyStatus: 'succeeded',
        photosRetained: false,
        frblSessionId: null,
        frblPoses: discardedFrblPoses(),
        plateUnavailableReason: 'photo-discarded',
        children: React.createElement(FormaVisionPlateNotice, { kind: 'unavailable' }),
      }),
    );
    expect(html).toContain('data-ready-viewer="notice"');
    expect(html).toContain('formavision-plate-notice');
    expect(html).not.toContain('formavision-frbl-ready-plate');
    expect(html).not.toContain('formavision-model-viewer-el');
    expect(html).not.toContain('formavision-3d-mount');
  });
});
