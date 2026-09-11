import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrblSideToggle } from '../FrblSideToggle';
import {
  FormaVisionFrblReadyPlate,
  FRBL_READY_STAGE_SPEC,
} from '../FormaVisionFrblReadyPlate';
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

  it('Brief 64: empty chamber + helper only when a side was not kept — no invented silhouette', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-removed',
        poses: discardedFrblPoses(),
      }),
    );
    expect(html).toContain('data-avatar-stage="frbl-2d"');
    expect(html).toContain('data-chamber="empty"');
    expect(html).toContain('formavision-frbl-ready-bezel');
    expect(html).toContain('formavision-frbl-ready-aperture');
    expect(html).toContain('formavision-frbl-ready-vignette');
    expect(html).toContain('formavision-frbl-ready-empty');
    expect(html).toContain(FRBL_SIDE_UNAVAILABLE_HELPER);
    expect(html).not.toContain('formavision-frbl-ready-photo');
    expect(html).not.toContain('formavision-frbl-ready-ground-glow');
    expect(html).not.toMatch(/silhouette|wireframe|anatomical|alien|picasso/i);
    expect(html).not.toContain('formavision-anatomical-floor');
    expect(html).not.toContain('formavision-model-viewer');
    expect(html).not.toContain('formavision-3d-mount');
  });

  it('Brief 64: reduced motion is instant — no enter scale or rim pulse', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-retain-1',
        poses: { front: true, right: true, back: true, left: true },
        reducedMotion: true,
      }),
    );
    expect(html).toContain('data-reduced-motion="true"');
    expect(html).not.toContain('fv-frbl-stage-enter');
    expect(html).not.toContain('fv-frbl-rim-pulse');
    expect(html).toMatch(/prefers-reduced-motion: reduce/);
  });

  it('Brief 64: avatar-stage chrome stays 2D CSS — contain, bezel, plasma rim, no GLB', () => {
    const plateSrc = readFileSync(
      join(process.cwd(), 'src/components/formavision/FormaVisionFrblReadyPlate.tsx'),
      'utf8',
    );
    expect(FRBL_READY_STAGE_SPEC.enterMs).toBeGreaterThanOrEqual(180);
    expect(FRBL_READY_STAGE_SPEC.enterMs).toBeLessThanOrEqual(220);
    expect(FRBL_READY_STAGE_SPEC.enterScaleFrom).toBe(0.98);
    expect(FRBL_READY_STAGE_SPEC.crossfadeMs).toBe(180);
    expect(FRBL_READY_STAGE_SPEC.rimPulseMs).toBe(180);
    expect(FRBL_READY_STAGE_SPEC.bezelInsetPx).toBeGreaterThanOrEqual(8);
    expect(FRBL_READY_STAGE_SPEC.bezelInsetPx).toBeLessThanOrEqual(12);
    expect(FRBL_READY_STAGE_SPEC.rimPx).toBeGreaterThanOrEqual(1);
    expect(FRBL_READY_STAGE_SPEC.rimPx).toBeLessThanOrEqual(2);
    expect(FRBL_READY_STAGE_SPEC.plasmaCyan).toBe('#2EE6D6');
    expect(plateSrc).toMatch(/object-contain/);
    expect(plateSrc).toMatch(/border-white\/15/);
    expect(plateSrc).toMatch(/radial-gradient/);
    expect(plateSrc).toMatch(/#2EE6D6|46,230,214/);
    expect(plateSrc).toMatch(/prefers-reduced-motion/);
    expect(plateSrc).toMatch(/formavision-frbl-ready-ground-glow/);
    expect(plateSrc).not.toMatch(/FormaVisionAnatomicalFloor|anatomical-2d/);
    expect(plateSrc).not.toMatch(/@react-three|model-viewer|WebGL|THREE\./);
    expect(plateSrc).not.toMatch(/pickRetainedFrblReadyScan|mergeScanSummaries/);
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
