// Tests for the BodyCompositionAvatar capability-gate wrapper (Prompt 210b, P2-T2c).
//
// The node test runner has no client reconciler and no document, so a static render
// stops before the WebGL-fallback microtask flips the wrapper to its 2D floor. What
// the static render DOES prove is the structural invariant P2-T2c relies on: the
// rendered branch (the 3D sizing container) is identical regardless of activeTab, so
// swapping the section's activeTab on the persistent instance changes no structure
// and therefore cannot drive a remount or replay the materialize intro. The actual
// fallback-to-2D-floor behavior is covered by AvatarErrorBoundary + selectAvatarSurface
// (confirmed failure / tier 2d only; hasWebGL is not a mount gate); the across-section
// persistence is structural in composition/page.tsx (one avatar node at a stable
// position, outside any section-gated unmounting block).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '../BodyCompositionAvatar';

const webRoot = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function renderWrapper(activeTab: 'bodyFat' | 'muscleMass' | 'measurements'): string {
  return renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    React.createElement(BodyCompositionAvatar, {
      sex: 'female',
      scan: null,
      circumferences: null,
      unit: 'cm',
      activeTab,
      children: React.createElement('div', null, 'two-d-floor'),
    }),
  );
}

describe('BodyCompositionAvatar', () => {
  it('renders the 3D sizing container (not the 2D children) before any fallback fires', () => {
    const markup = renderWrapper('bodyFat');
    // The 3D footprint box is present; the 2D floor only shows on the WebGL fallback.
    expect(markup).toContain('formavision-avatar-footprint');
    expect(markup).not.toContain('two-d-floor');
  });

  it('fills a viewport-capped plate instead of a 960px-tall 720/1152 box', () => {
    const markup = renderWrapper('bodyFat');
    expect(markup).toContain('max-w-[600px]');
    expect(markup).toContain('mx-auto');
    expect(markup).toContain('absolute');
    expect(markup).toContain('inset-0');
    expect(markup).toContain('h-full');
    expect(markup).not.toContain('aspect-[720/1152]');
    expect(markup).not.toContain('lg:max-w-none');
    expect(markup).not.toContain('lg:h-full');
    expect(markup).not.toContain('lg:w-auto');
  });

  it('renders an identical branch for every activeTab so a tab swap drives no remount', () => {
    const fat = renderWrapper('bodyFat');
    const muscle = renderWrapper('muscleMass');
    const measurements = renderWrapper('measurements');
    expect(muscle).toEqual(fat);
    expect(measurements).toEqual(fat);
  });

  it('FormaVision plate is viewport-height-capped; heatmap column-fill is unchanged', () => {
    const avatar = readSrc('src/components/formavision/BodyCompositionAvatar.tsx');
    const footprintClass = avatar.match(
      /data-testid="formavision-avatar-footprint"[\s\S]*?className="([^"]+)"/,
    )?.[1];
    expect(footprintClass).toBeDefined();
    expect(footprintClass).toContain('max-w-[600px]');
    expect(footprintClass).toContain('mx-auto');
    expect(footprintClass).toContain('absolute');
    expect(footprintClass).toContain('inset-0');
    expect(footprintClass).toContain('h-full');
    expect(footprintClass).not.toContain('aspect-[720/1152]');
    expect(footprintClass).not.toContain('lg:max-w-none');
    expect(footprintClass).not.toContain('lg:h-full');
    expect(footprintClass).not.toContain('lg:w-auto');

    const formavision = readSrc(
      'src/app/(app)/(consumer)/body-tracker/formavision/page.tsx',
    );
    expect(formavision).toMatch(/formavision-canvas-grid/);
    expect(formavision).toMatch(/BodyCompositionAvatar/);
    expect(formavision).toMatch(/formavision-2d-floor-child/);
    expect(formavision).toMatch(/onScrub=\{setScrubVector\}/);
    expect(formavision).toMatch(/resolveAvatarCircumferences/);
    expect(formavision).toMatch(/h-\[min\(52vh,520px\)\]/);
    expect(formavision).toMatch(/max-h-\[min\(52vh,520px\)\]/);
    const plateClass = formavision.match(
      /data-testid="formavision-canvas-grid"[\s\S]*?className="([^"]+)"/,
    )?.[1];
    expect(plateClass).toBeDefined();
    expect(plateClass).toContain('relative');
    expect(plateClass).toContain('overflow-hidden');
    expect(plateClass).toContain('bg-[#1A2744]');
    expect(plateClass).not.toMatch(/\bbg-transparent\b/);
    expect(plateClass).not.toMatch(/\bitems-center\b/);
    expect(plateClass).not.toMatch(/\bflex\b/);
    expect(formavision).toMatch(/formavision-plate-floor/);
    expect(formavision).toMatch(/FormaVisionPlateNotice/);
    expect(formavision).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(formavision).not.toMatch(/SegmentalHeatMap/);
    expect(formavision).not.toMatch(/aspect-\[720\/1152\]/);
    expect(formavision).not.toMatch(/min-h-\[480px\]/);
    expect(formavision).not.toMatch(/min-h-\[560px\]/);

    // Muscle / Body Fat / Measurements stay on the 2D heatmap with their
    // existing lg column-fill. Do not steal that class off this wrapper.
    const heatmap = readSrc('src/components/body-tracker/SegmentalHeatMap.tsx');
    expect(heatmap).toMatch(/lg:h-full lg:w-auto lg:max-w-none/);
  });

  it('default camera is rear ¾ ankle-crop, not a front bust', () => {
    const canvas = readSrc('src/components/formavision/FormaVisionCanvas.tsx');
    expect(canvas).toMatch(/FULL_BODY_FRAMING/);
    expect(canvas).toMatch(/AVATAR_VERTICAL_FOV_DEG/);
    expect(canvas).toMatch(/fullBodyCameraPosition/);
    expect(canvas).not.toMatch(/position:\s*\[0,\s*1\.0,\s*3\.2\]/);
    expect(canvas).not.toMatch(/position:\s*\[0,\s*FULL_BODY_FRAMING\.targetY,\s*FULL_BODY_FRAMING\.distance\]/);

    const framing = readSrc('src/lib/formavision/motion/regionFraming.ts');
    expect(framing).toMatch(/distance:\s*2\.72/);
    expect(framing).toMatch(/AVATAR_VERTICAL_FOV_DEG = 38/);
    expect(framing).toMatch(/FULL_BODY_AZIMUTH_RAD/);
    expect(framing).not.toMatch(/FULL_BODY_FRAMING[^=]*=\s*\{\s*targetY:\s*0\.9,\s*distance:\s*3\.2/);
    expect(framing).not.toMatch(/distance:\s*4\.2/);
  });

  it('prefers the 3D mount and never latches 2D from a render-time hasWebGL false', () => {
    const avatar = readSrc('src/components/formavision/BodyCompositionAvatar.tsx');
    const threeD = readSrc('src/components/formavision/FormaVision3DAvatar.tsx');
    const canvas = readSrc('src/components/formavision/FormaVisionCanvas.tsx');
    expect(avatar).toMatch(/selectAvatarSurface/);
    expect(avatar).toMatch(/FormaVisionFallbackNotice/);
    expect(avatar).toMatch(/shouldLatchFallback2d/);
    expect(avatar).toMatch(/probeWebGL/);
    expect(avatar).toMatch(/setFellBack\(true\)/);
    expect(avatar).not.toMatch(/if \(!shouldLatchFallback2d\(probe\)\) \{\s*return;\s*\}/);
    expect(avatar).not.toMatch(/useMemo\(\(\) => hasWebGL\(\), \[\]\)/);
    expect(threeD).toMatch(/formavision-3d-pending/);
    expect(threeD).toMatch(/formavision-3d-mount/);
    expect(threeD).toMatch(/absolute inset-0/);
    expect(threeD).toMatch(/FormaVisionPlateNotice/);
    expect(threeD).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(threeD).toMatch(/onContextRestored/);
    expect(avatar).toMatch(/formavision-recovering-floor/);
    expect(avatar).toMatch(/decideContextLossAction/);
    expect(avatar).toMatch(/handleContextRestored/);
    expect(threeD).not.toMatch(/useMemo\(\(\) => hasWebGL\(\), \[\]\)/);
    expect(threeD).not.toMatch(/WebGL unavailable, falling back to 2D floor/);
    expect(canvas).toMatch(/createFormaVisionRenderer/);
    expect(canvas).toMatch(/onContextLost/);
    expect(canvas).toMatch(/onContextRestored/);
    expect(canvas).toMatch(/attachWebGLContextRecovery/);
    expect(canvas).toMatch(/scheduleZeroSizeHonestyCheck/);
    expect(canvas).not.toMatch(/morphedBodyRef\.current === mounted \|\| hasGirth/);
    const glFactory = readSrc('src/lib/formavision/gl/createFormaVisionRenderer.ts');
    expect(glFactory).toMatch(/acquireWebGLContext/);
    expect(glFactory).toMatch(/isSafariWebGLHost/);
    expect(canvas).toMatch(/shouldHoldScrubMorph/);
  });

  it('SSR first paint stays on the 3D footprint with a navy chamber, not the heatmap children', () => {
    const markup = renderWrapper('bodyFat');
    expect(markup).toContain('formavision-avatar-footprint');
    expect(markup).toContain('data-ready-viewer="notice"');
    expect(markup).not.toContain('formavision-3d-pending');
    expect(markup).toContain('formavision-recovering-floor');
    expect(markup).toContain('formavision-plate-notice');
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('two-d-floor');
    expect(markup).not.toContain('formavision-fallback-2d');
    expect(markup).not.toContain('segmental-heat-map');
  });

  it('viewport-capped plate + gender row fit a 900px laptop; the 720/1152 box does not', () => {
    const viewport = 900;
    const plate = Math.min(viewport * 0.52, 520);
    const genderRow = 52;
    expect(plate).toBe(468);
    expect(plate + genderRow).toBeLessThan(viewport);
    // #140 footprint: 600 × 1152/720 = 960, taller than the content viewport.
    expect(600 * (1152 / 720)).toBeGreaterThan(viewport);
  });
});
