import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FormaVisionFrblReadyPlate,
  FRBL_READY_STAGE_SPEC,
} from '@/components/formavision/FormaVisionFrblReadyPlate';
import { FrblReadyModeToggle } from '@/components/formavision/FrblReadyModeToggle';
import { discardedFrblPoses } from '@/lib/formavision/retainFrbl';
import { selectReadyViewer } from '@/lib/formavision/viewer/selectReadyViewer';
import {
  FRBL_READY_MODE_PHOTO,
  FRBL_READY_MODE_WIREFRAME,
  FRBL_READY_WIREFRAME_FAIL,
  FRBL_READY_WIREFRAME_HINT,
  FRBL_READY_WIREFRAME_LOADING,
} from '@/lib/formavision/twoProtocolCopy';
import { FRBL_SIDE_UNAVAILABLE_HELPER } from '@/lib/formavision/viewer/frblReadySide';

const allPoses = { front: true, right: true, back: true, left: true };
const GLB = 'https://storage.example/u/s/meshy/visual.glb?token=1';

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8');
}

describe('Brief 65 — cold Ready defaults to Photo', () => {
  it('session-local mode starts on Photo with F/R/B/L still at the bottom', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-retain-65',
        poses: allPoses,
      }),
    );
    expect(html).toContain('data-ready-mode="photo"');
    expect(html).toContain('data-avatar-stage="frbl-2d"');
    expect(html).toContain('formavision-frbl-ready-mode-toggle');
    expect(html).toContain(FRBL_READY_MODE_PHOTO);
    expect(html).toContain(FRBL_READY_MODE_WIREFRAME);
    expect(html).toContain('formavision-frbl-side-toggle');
    expect(html).not.toContain('data-testid="formavision-frbl-ready-wireframe"');
    expect(html).not.toContain('formavision-model-viewer');
    expect(html).not.toContain('formavision-3d-mount');
    expect(html).not.toContain('formavision-anatomical-floor');
  });

  it('mode toggle is a 2-segment 44px control with Photo / Wireframe labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(FrblReadyModeToggle, {
        active: 'photo',
        onChange: () => undefined,
      }),
    );
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('text-sm');
    expect(html).toContain('font-semibold');
    expect(html).toContain('bg-[#2DA5A0]');
    expect(html).toContain(FRBL_READY_MODE_PHOTO);
    expect(html).toContain(FRBL_READY_MODE_WIREFRAME);
    expect(html).toContain('stroke-width="1.5"');
    expect(html).toContain('data-testid="formavision-frbl-ready-mode-photo"');
    expect(html).toContain('data-active="true"');
  });
});

describe('Brief 65 — honesty without retain / missing side', () => {
  it('discarded FRBL stays empty + helper in both modes — no invented cage', () => {
    const photo = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-discard-65',
        poses: discardedFrblPoses(),
      }),
    );
    const wire = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-discard-65',
        poses: discardedFrblPoses(),
        initialMode: 'wireframe',
      }),
    );
    for (const html of [photo, wire]) {
      expect(html).toContain('data-chamber="empty"');
      expect(html).toContain('formavision-frbl-ready-empty');
      expect(html).toContain(FRBL_SIDE_UNAVAILABLE_HELPER);
      expect(html).not.toContain('data-testid="formavision-frbl-ready-wireframe"');
      expect(html).not.toContain('formavision-anatomical-floor');
      expect(html).not.toContain('generateAvatarMesh');
    }
    expect(wire).not.toContain(FRBL_READY_WIREFRAME_FAIL);
  });
});

describe('Brief 65 — Wireframe chamber is honesty-first, never parametric', () => {
  it('Wireframe with a kept side shows the building copy, not a fallback body', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-retain-65',
        poses: allPoses,
        initialMode: 'wireframe',
      }),
    );
    expect(html).toContain('data-ready-mode="wireframe"');
    expect(html).toContain('data-chamber="loading"');
    expect(html).toContain('formavision-frbl-ready-wireframe-loading');
    expect(html).toContain(FRBL_READY_WIREFRAME_LOADING);
    expect(html).not.toContain('data-testid="formavision-frbl-ready-wireframe"');
    expect(html).not.toContain('formavision-anatomical-floor');
    expect(html).not.toContain('formavision-model-viewer');
    expect(html).not.toContain('formavision-3d-mount');
    expect(html).not.toMatch(/FormaVisionAnatomicalFloor|generateAvatarMesh/);
  });

  it('reduced motion is instant — no to-wireframe / rim pulse classes', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-retain-65',
        poses: allPoses,
        reducedMotion: true,
        initialMode: 'wireframe',
      }),
    );
    expect(html).toContain('data-reduced-motion="true"');
    expect(html).not.toMatch(
      /data-testid="formavision-frbl-ready-bezel"[^>]*fv-frbl-stage-enter/,
    );
    expect(html).not.toMatch(/class="[^"]*fv-frbl-to-wireframe/);
    expect(html).not.toMatch(/class="[^"]*fv-frbl-to-photo/);
    expect(html).toMatch(/prefers-reduced-motion: reduce/);
  });
});

describe('Brief 65 — selectReadyViewer stays frbl-2d', () => {
  it('retained FRBL still parks Meshy/Tripo GLB on phone and desktop', () => {
    for (const host of ['phone', 'desktop'] as const) {
      expect(
        selectReadyViewer({
          host,
          hasReadyScanData: true,
          meshyStatus: 'succeeded',
          meshyGlbUrl: GLB,
          photosRetained: true,
          frblPoses: allPoses,
          frblSessionId: 'sess-retain-65',
        }),
      ).toBe('frbl-2d');
    }
    const viewer = src('src/lib/formavision/viewer/selectReadyViewer.ts');
    expect(viewer).toMatch(/hasRetainedFrblReady/);
    expect(viewer).toMatch(/return 'frbl-2d'/);
    expect(viewer).not.toMatch(/return 'model-viewer'/);
    expect(viewer).not.toMatch(/return 'r3f'/);
  });

  it('motion tokens stay in the Brief 64/65 windows', () => {
    expect(FRBL_READY_STAGE_SPEC.toWireframeMs).toBeGreaterThanOrEqual(220);
    expect(FRBL_READY_STAGE_SPEC.toWireframeMs).toBeLessThanOrEqual(280);
    expect(FRBL_READY_STAGE_SPEC.toPhotoMs).toBeGreaterThanOrEqual(180);
    expect(FRBL_READY_STAGE_SPEC.toPhotoMs).toBeLessThanOrEqual(220);
    expect(FRBL_READY_STAGE_SPEC.wireframeSideMs).toBe(180);
    expect(FRBL_READY_WIREFRAME_FAIL).toMatch(/Ready photo/);
  });
});

describe('Brief 65 observe — same-origin blob + stay Wireframe on fail', () => {
  it('plate uses same-origin blob helper and never fetches a Storage signed URL', () => {
    const plate = src('src/components/formavision/FormaVisionFrblReadyPlate.tsx');
    const helper = src('src/lib/formavision/viewer/frblReadyWireframe.ts');
    const cache = src('src/lib/formavision/viewer/signedFullUrlCache.ts');
    const route = src('src/app/api/scan/signed-url/route.ts');
    expect(plate).toMatch(/runFrblReadyWireframeBuild/);
    expect(plate).toMatch(/ensureSelfieSegmenter/);
    expect(helper).toMatch(/fetchSignedFullBlob/);
    expect(helper).toMatch(/processSilhouette/);
    expect(helper).toMatch(/includeMask:\s*true/);
    expect(helper).not.toMatch(/withTimeout\(work\(/);
    expect(helper).not.toMatch(/\$\{LOG_SCOPE\}\.build/);
    expect(helper).toMatch(/formavision\.frblReadyWireframe\.processSilhouette/);
    expect(plate).toMatch(/data-testid="formavision-frbl-ready-wireframe-fail"/);
    expect(plate).toMatch(/data-wireframe-fail-reason=\{wireframeFailReason \?\? 'unknown'\}/);
    expect(plate).not.toMatch(/fetch\(signed/);
    expect(plate).not.toMatch(/setMode\('photo'\)/);
    expect(plate).not.toMatch(/revertToPhoto/);
    expect(cache).toMatch(/delivery: 'blob'/);
    expect(route).toMatch(/delivery === 'blob'/);
    expect(route).toMatch(/\.download\(path\)/);
    expect(route).toMatch(/arrayBuffer\(\)/);
    expect(route).not.toMatch(/from ['"][^'"]*avatarMeshGenerator['"]/);
  });

  it('Wireframe fail stays on Wireframe chamber with honesty — no fallback body', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-retain-65',
        poses: allPoses,
        initialMode: 'wireframe',
        initialWireframeFail: true,
        initialWireframeFailReason: 'match',
      }),
    );
    expect(html).toContain('data-ready-mode="wireframe"');
    expect(html).toContain('data-chamber="fail"');
    expect(html).toMatch(
      /data-testid="formavision-frbl-ready-plate"[^>]*data-wireframe-fail-reason="match"/,
    );
    expect(html).toMatch(
      /data-testid="formavision-frbl-ready-wireframe-fail"[^>]*data-wireframe-fail-reason="match"/,
    );
    expect(html).toContain('formavision-frbl-ready-wireframe-fail');
    expect(html).toContain(FRBL_READY_WIREFRAME_FAIL);
    expect(html).not.toContain('data-testid="formavision-frbl-ready-wireframe"');
    expect(html).not.toContain('formavision-anatomical-floor');
    expect(html).not.toContain('formavision-model-viewer');
    expect(html).not.toContain('formavision-3d-mount');
  });

  it('Photo|Wireframe stays inside the Ready plate above the aperture — no page row', () => {
    const plate = src('src/components/formavision/FormaVisionFrblReadyPlate.tsx');
    const toggle = src('src/components/formavision/FrblReadyModeToggle.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    expect(toggle).toMatch(/absolute inset-x-2 top-2/);
    expect(plate).toMatch(/FrblReadyModeToggle/);
    expect(plate).toMatch(/top-\[3\.75rem\]/);
    expect(plate).toMatch(/FrblSideToggle/);
    expect(page).not.toMatch(/FrblReadyModeToggle/);
    expect(page).not.toMatch(/formavision-frbl-ready-mode-toggle/);
    expect(page).toMatch(/SelectBodyPartControl/);
    expect(page).toMatch(/formavision-select-body-part-slot/);
    expect(FRBL_READY_WIREFRAME_HINT).toMatch(/kept Ready photo/i);
  });
});
