// Tier / surface selection: the 2D SegmentalHeatMap SVG must not win when
// WebGL is available (or merely unknown / SSR). That was the #172 www morph
// FAIL: a false hasWebGL latch painted Male Avatar.svg instead of the canvas.

import { describe, it, expect } from 'vitest';
import {
  selectAvatarSurface,
  shouldPaintPlateFloor,
  wouldSelectSvgDespiteWebGL,
  type AvatarSurfaceDecisionInput,
} from '../avatarSurfaceDecision';
import type { RenderTier } from '../types';
import type { WebGLAvailability } from '../avatarSurfaceDecision';

const THREE_D_TIERS: readonly RenderTier[] = ['cinematic', 'lite'];
const PROBES_THAT_MUST_NOT_FORCE_SVG: readonly WebGLAvailability[] = [
  'available',
  'unknown',
  'ssr',
  'unavailable',
];

function input(
  partial: Partial<AvatarSurfaceDecisionInput> & Pick<AvatarSurfaceDecisionInput, 'renderTier'>,
): AvatarSurfaceDecisionInput {
  return {
    confirmedFailure: false,
    webgl: 'unknown',
    ...partial,
  };
}

describe('selectAvatarSurface', () => {
  it('prefers FormaVision3D when WebGL is available on either 3D tier', () => {
    for (const renderTier of THREE_D_TIERS) {
      expect(
        selectAvatarSurface(input({ renderTier, webgl: 'available' })),
      ).toBe('formavision3d');
    }
  });

  it('does not choose the SVG on SSR or an unknown probe (the #172 false latch)', () => {
    expect(selectAvatarSurface(input({ renderTier: 'cinematic', webgl: 'ssr' }))).toBe(
      'formavision3d',
    );
    expect(selectAvatarSurface(input({ renderTier: 'cinematic', webgl: 'unknown' }))).toBe(
      'formavision3d',
    );
  });

  it('still mounts 3D when the probe says unavailable (iOS / Chrome false-negative)', () => {
    expect(
      selectAvatarSurface(input({ renderTier: 'cinematic', webgl: 'unavailable' })),
    ).toBe('formavision3d');
    expect(
      selectAvatarSurface(input({ renderTier: 'lite', webgl: 'unavailable' })),
    ).toBe('formavision3d');
  });

  it('never selects the SVG solely because WebGL is available', () => {
    for (const renderTier of THREE_D_TIERS) {
      const decision = input({ renderTier, webgl: 'available' });
      expect(wouldSelectSvgDespiteWebGL(decision)).toBe(false);
      expect(selectAvatarSurface(decision)).not.toBe('fallback2d');
    }
  });

  it('optimistic probes across cinematic/lite all stay on the 3D mount', () => {
    for (const renderTier of THREE_D_TIERS) {
      for (const webgl of PROBES_THAT_MUST_NOT_FORCE_SVG) {
        expect(selectAvatarSurface(input({ renderTier, webgl }))).toBe('formavision3d');
      }
    }
  });

  it('selects the honest 2D floor only after a confirmed 3D failure', () => {
    expect(
      selectAvatarSurface(
        input({ renderTier: 'cinematic', webgl: 'available', confirmedFailure: true }),
      ),
    ).toBe('fallback2d');
  });

  it('selects the 2D floor when the runtime ladder has stepped to 2d', () => {
    expect(
      selectAvatarSurface(input({ renderTier: '2d', webgl: 'available' })),
    ).toBe('fallback2d');
  });

  it('keeps the 3D plate for a Ready scan even after confirmed failure or 2d step-down', () => {
    expect(
      selectAvatarSurface(
        input({
          renderTier: 'cinematic',
          webgl: 'available',
          confirmedFailure: true,
          hasReadyScanData: true,
        }),
      ),
    ).toBe('formavision3d');
    expect(
      selectAvatarSurface(
        input({ renderTier: '2d', webgl: 'available', hasReadyScanData: true }),
      ),
    ).toBe('formavision3d');
  });
});

describe('shouldPaintPlateFloor', () => {
  it('paints the floor until a live canvas has presented pixels — never gated on 3D success', () => {
    expect(shouldPaintPlateFloor({ liveCanvasHasPainted: false })).toBe(true);
    expect(shouldPaintPlateFloor({ liveCanvasHasPainted: true })).toBe(false);
  });
});
