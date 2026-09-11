import { describe, expect, it } from 'vitest';
import { discardedFrblPoses } from '@/lib/formavision/retainFrbl';
import {
  defaultFrblReadySide,
  FRBL_SIDE_UNAVAILABLE_HELPER,
  frblSideToggleState,
  hasRetainedFrblReady,
  isFrblSidePresent,
} from '../frblReadySide';
import { selectReadyViewer } from '../selectReadyViewer';

const GLB = 'https://storage.example/u/s/meshy/visual.glb?token=1';
const allPoses = { front: true, right: true, back: true, left: true };

describe('defaultFrblReadySide', () => {
  it('defaults to Front when Front is retained', () => {
    expect(defaultFrblReadySide(allPoses)).toBe('front');
    expect(defaultFrblReadySide({ front: true, right: false, back: false, left: false })).toBe(
      'front',
    );
  });

  it('falls back to first available in Front · Right · Back · Left order', () => {
    expect(defaultFrblReadySide({ front: false, right: true, back: true, left: true })).toBe(
      'right',
    );
    expect(defaultFrblReadySide({ front: false, right: false, back: true, left: true })).toBe(
      'back',
    );
    expect(defaultFrblReadySide({ front: false, right: false, back: false, left: true })).toBe(
      'left',
    );
    expect(defaultFrblReadySide(discardedFrblPoses())).toBeNull();
  });
});

describe('missing-side disable', () => {
  it('disables only missing sides and never invents a placeholder pose', () => {
    const state = frblSideToggleState({
      front: true,
      right: false,
      back: true,
      left: false,
    });
    expect(state.front).toEqual({ present: true, disabled: false });
    expect(state.right).toEqual({ present: false, disabled: true });
    expect(state.back).toEqual({ present: true, disabled: false });
    expect(state.left).toEqual({ present: false, disabled: true });
    expect(isFrblSidePresent({ front: false }, 'front')).toBe(false);
    expect(FRBL_SIDE_UNAVAILABLE_HELPER).toMatch(/not kept/i);
    expect(FRBL_SIDE_UNAVAILABLE_HELPER).not.toMatch(/silhouette|outline|wireframe/i);
  });
});

describe('selectReadyViewer — retained FRBL 2D beats Meshy GLB', () => {
  it('selects frbl-2d on phone and desktop when retained FRBL has a pose', () => {
    for (const host of ['phone', 'desktop'] as const) {
      expect(
        selectReadyViewer({
          host,
          hasReadyScanData: true,
          meshyStatus: 'succeeded',
          meshyGlbUrl: GLB,
          photosRetained: true,
          frblPoses: allPoses,
          frblSessionId: 'sess-retain-1',
        }),
      ).toBe('frbl-2d');
    }
  });

  it('does not settle Meshy GLB as Ready SUCCESS without retained FRBL', () => {
    expect(
      selectReadyViewer({
        host: 'phone',
        hasReadyScanData: true,
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
        photosRetained: false,
        frblPoses: discardedFrblPoses(),
        frblSessionId: null,
      }),
    ).toBe('notice');
    expect(
      hasRetainedFrblReady({
        photosRetained: true,
        frblPoses: discardedFrblPoses(),
        frblSessionId: 'sess-retain-1',
      }),
    ).toBe(false);
  });

  it('discard → notice: photosRetained false never paints frbl-2d', () => {
    expect(
      selectReadyViewer({
        host: 'desktop',
        hasReadyScanData: true,
        meshyStatus: 'idle',
        meshyGlbUrl: null,
        photosRetained: false,
        frblPoses: discardedFrblPoses(),
        frblSessionId: null,
      }),
    ).toBe('notice');
    expect(
      selectReadyViewer({
        host: 'phone',
        hasReadyScanData: true,
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
        photosRetained: false,
        frblPoses: allPoses,
        frblSessionId: 'stale-session',
      }),
    ).toBe('notice');
  });
});
