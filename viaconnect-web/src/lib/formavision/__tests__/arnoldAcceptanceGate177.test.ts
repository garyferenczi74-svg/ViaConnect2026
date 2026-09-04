// Arnold tip acceptance gate after #176 www blank-plate FAIL + box re-smoke.
//
// Phone: empty transparent plate (no canvas pixels, no Male Avatar.svg).
// Box: healthy 3D then spontaneous WebGL context lost (3x) → canvas torn
// from the DOM (no webglcontextrestored) → remote SVG floor. Fallback
// works only when the Supabase SVG loads.
//
// Gates:
//   1. Context-loss waits for restore and remounts; does not tear forever
//   2. Always-paint local/inline 2D floor (no remote SVG)
//   3. 3D footprint has a definite fill (absolute inset-0)
//   4. Zero-size honesty → latch path; notice still above sex toggles
//   5. #176 morph stamp NO-FABRICATION unchanged

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import { FormaVisionAnatomicalFloor } from '@/components/formavision/FormaVisionAnatomicalFloor';
import {
  CONTEXT_RESTORE_WAIT_MS,
  FORMAVISION_ZERO_SIZE_MESSAGE,
  WEBGL_CONTEXT_LOST_MESSAGE,
  decideContextLossAction,
} from '@/lib/formavision/gl/webglContextRecovery';
import { buildAvatarMorphStamp } from '@/lib/formavision/morph/avatarMorphStamp';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

describe('Arnold acceptance gate 1: context-loss restore, do not tear forever', () => {
  it('first loss waits for restore; restore remounts; timeout eventually latches', () => {
    expect(
      decideContextLossAction({ remountsUsed: 0, restoreSeen: false, timedOut: false }),
    ).toBe('wait-restore');
    expect(
      decideContextLossAction({ remountsUsed: 5, restoreSeen: true, timedOut: false }),
    ).toBe('remount');
    expect(
      decideContextLossAction({ remountsUsed: 2, restoreSeen: false, timedOut: true }),
    ).toBe('latch-2d');
    expect(CONTEXT_RESTORE_WAIT_MS).toBe(1500);
    expect(WEBGL_CONTEXT_LOST_MESSAGE).toBe('WebGL context lost');
  });

  it('Canvas keeps preventDefault + restored listener; parent waits then remounts', () => {
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(canvas).toMatch(/attachWebGLContextRecovery/);
    expect(canvas).toMatch(/onContextRestored/);
    expect(canvas).not.toMatch(/addEventListener\('webglcontextlost', onLost, \{ once: true \}\)/);
    expect(avatar).toMatch(/decideContextLossAction/);
    expect(avatar).toMatch(/handleContextRestored/);
    expect(avatar).toMatch(/formavision-recovering-floor/);
    expect(avatar).toMatch(/CONTEXT_RESTORE_WAIT_MS/);
  });
});

describe('Arnold acceptance gate 2: always-paint local navy chamber', () => {
  it('page fallback child is a text-only notice, not the teal outline or remote SVG', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    expect(page).toMatch(/FormaVisionPlateNotice/);
    expect(page).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(page).not.toMatch(/SegmentalHeatMap/);
    expect(page).not.toMatch(/supabase\.co/);
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, { sex: 'male' }),
    );
    expect(html).toContain('formavision-anatomical-floor');
    expect(html).not.toContain('formavision-picasso-plate');
    expect(html).not.toContain('/formavision/picasso/');
    expect(html).not.toContain('supabase.co');
    expect(html).not.toContain('Male%20Avatar');
  });
});

describe('Arnold acceptance gate 3: 3D footprint definite fill', () => {
  it('footprint + 3d-mount are absolute inset-0 against a definite plate box', () => {
    const markup = renderToStaticMarkup(
      React.createElement(BodyCompositionAvatar, {
        sex: 'male',
        scan: null,
        circumferences: null,
        unit: 'in',
        activeTab: 'bodyFat',
        children: React.createElement(FormaVisionAnatomicalFloor, { sex: 'male' }),
      }),
    );
    expect(markup).toContain('formavision-avatar-footprint');
    expect(markup).toContain('absolute');
    expect(markup).toContain('inset-0');
    expect(markup).toContain('formavision-3d-pending');
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).toContain('formavision-recovering-floor');
    expect(markup).toContain('formavision-plate-notice');
    expect(markup).not.toContain('formavision-fallback-2d');

    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const plateClass = page.match(
      /data-testid="formavision-canvas-grid"[\s\S]*?className="([^"]+)"/,
    )?.[1];
    expect(plateClass).toMatch(/h-\[min\(52vh,520px\)\]/);
    expect(plateClass).toMatch(/bg-\[#1A2744\]/);
    expect(plateClass).not.toMatch(/\bbg-transparent\b/);
    expect(plateClass).not.toMatch(/\bitems-center\b/);
    expect(page).toMatch(/formavision-plate-floor/);
  });
});

describe('Arnold acceptance gate 6: never-empty plate on 3D-pending', () => {
  it('SSR / 3D-pending always paints the local silhouette or recovering floor', () => {
    const markup = renderToStaticMarkup(
      React.createElement(BodyCompositionAvatar, {
        sex: 'male',
        scan: null,
        circumferences: null,
        unit: 'in',
        activeTab: 'bodyFat',
        children: React.createElement(FormaVisionAnatomicalFloor, { sex: 'male' }),
      }),
    );
    expect(markup).toContain('formavision-3d-pending');
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).toContain('formavision-recovering-floor');
    expect(markup).toContain('formavision-plate-notice');
    expect(markup).not.toContain('formavision-fallback-2d');

    const threeD = src('src/components/formavision/FormaVision3DAvatar.tsx');
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(threeD).toMatch(/function CanvasLoader/);
    expect(threeD).toMatch(/FormaVisionPlateNotice/);
    expect(threeD).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(threeD).not.toMatch(/loading:\s*\(\)\s*=>\s*<CanvasLoader\s*\/>/);
    expect(canvas).toMatch(/FirstPaintWatchdog/);
    expect(canvas).toMatch(/shouldTreatGlCreatedAsPainted/);
    expect(canvas).toMatch(/if \(shouldTreatGlCreatedAsPainted\(\)\) \{\s*props\.onFirstInteractive/);
    expect(avatar).toMatch(/shouldPaintPlateFloor/);
    expect(avatar).toMatch(/decideZeroSizeAction/);
    expect(avatar).toMatch(/isZeroSizeCanvasMessage/);
  });
});

describe('Arnold acceptance gate 4: zero-size honesty + notice above toggles', () => {
  it('zero-size reports the real reason and notice host stays above sex toggles', () => {
    expect(FORMAVISION_ZERO_SIZE_MESSAGE).toBe('FormaVision canvas mounted at zero size');
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    expect(canvas).toMatch(/scheduleZeroSizeHonestyCheck/);
    expect(page.indexOf('formavision-fallback-notice-host')).toBeLessThan(
      page.indexOf('formavision-top-controls'),
    );
    expect(page.indexOf('formavision-top-controls')).toBeLessThan(
      page.indexOf('formavision-canvas-grid'),
    );
  });
});

describe('Arnold acceptance gate 5: morph stamp NO-FABRICATION unchanged', () => {
  it('missing circs stay template; no invented waist', () => {
    const stamp = buildAvatarMorphStamp({
      scan: {
        entryId: 'ready-33',
        source: 'scan',
        recordedAt: '2026-09-02T00:00:00.000Z',
        totalBodyFatPct: 33,
        regionFatPct: {
          right_arm: null,
          left_arm: null,
          trunk: null,
          right_leg: null,
          left_leg: null,
        },
        visceralFatRating: null,
        bodyWaterPct: null,
        regionMuscleLbs: {
          right_arm: null,
          left_arm: null,
          trunk: null,
          right_leg: null,
          left_leg: null,
        },
        totalMuscleMassLbs: null,
        skeletalMuscleMassLbs: null,
        scanId: 'scan-33',
        estimatedBodyFatMin: 30,
        estimatedBodyFatMax: 36,
        isEstimated: true,
      },
      circumferences: emptyMeasurements(),
      sex: 'male',
      unit: 'in',
    });
    expect(stamp.morph).toBe('template');
    expect(stamp.waistM).toBe('');
    expect(stamp.bf).toBe('33.0');
  });
});
