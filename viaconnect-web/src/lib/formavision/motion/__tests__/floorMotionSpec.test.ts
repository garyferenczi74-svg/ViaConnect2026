import { describe, expect, it } from 'vitest';
import {
  FORMAVISION_MOTION_SPEC,
  defaultFloorView,
  floorMotionTransition,
  resolveFloor3dCrossfade,
} from '../floorMotionSpec';

describe('MOTION-SPEC floor ↔ 3D timings', () => {
  it('locks the proud handoff numbers', () => {
    expect(FORMAVISION_MOTION_SPEC.enterPlateMs).toBe(180);
    expect(FORMAVISION_MOTION_SPEC.enterPlateEasing).toBe('ease-out');
    expect(FORMAVISION_MOTION_SPEC.floorPaintMs).toBe(0);
    expect(FORMAVISION_MOTION_SPEC.ready3dMs).toBe(420);
    expect(FORMAVISION_MOTION_SPEC.ready3dEasing).toBe(
      'cubic-bezier(0.22, 1, 0.36, 1)',
    );
    expect(FORMAVISION_MOTION_SPEC.settleMs).toBe(200);
    expect(FORMAVISION_MOTION_SPEC.fallbackReverseMs).toBe(240);
    expect(FORMAVISION_MOTION_SPEC.sexToggleMs).toBe(200);
    expect(defaultFloorView()).toBe('rear');
  });

  it('paints the floor immediately before 3D is ready without hiding the live canvas', () => {
    const frame = resolveFloor3dCrossfade({
      liveCanvasHasPainted: false,
      recovering: false,
      fellBack: false,
    });
    expect(frame.floorOpacity).toBe(1);
    expect(frame.morph3d).toBe(1);
    expect(frame.durationMs).toBe(0);
    expect(frame.phase).toBe('floor');
    expect(floorMotionTransition(frame.durationMs, frame.easing)).toBeUndefined();
  });

  it('crossfades floor → 3D in 420ms when the canvas has painted', () => {
    const frame = resolveFloor3dCrossfade({
      liveCanvasHasPainted: true,
      recovering: false,
      fellBack: false,
    });
    expect(frame.floorOpacity).toBe(0);
    expect(frame.morph3d).toBe(1);
    expect(frame.durationMs).toBe(420);
    expect(frame.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(frame.phase).toBe('to3d');
    expect(floorMotionTransition(frame.durationMs, frame.easing)).toBe(
      'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)',
    );
  });

  it('reverses to the floor in 240ms on recover / fallback', () => {
    const recovering = resolveFloor3dCrossfade({
      liveCanvasHasPainted: true,
      recovering: true,
      fellBack: false,
    });
    expect(recovering.floorOpacity).toBe(1);
    expect(recovering.morph3d).toBe(0);
    expect(recovering.durationMs).toBe(240);
    expect(recovering.phase).toBe('toFloor');

    const fellBack = resolveFloor3dCrossfade({
      liveCanvasHasPainted: true,
      recovering: false,
      fellBack: true,
    });
    expect(fellBack.durationMs).toBe(240);
    expect(fellBack.phase).toBe('toFloor');
  });

  it('snaps under reduced motion', () => {
    const ready = resolveFloor3dCrossfade({
      liveCanvasHasPainted: true,
      recovering: false,
      fellBack: false,
      reducedMotion: true,
    });
    expect(ready.durationMs).toBe(0);
    expect(ready.morph3d).toBe(1);

    const reverse = resolveFloor3dCrossfade({
      liveCanvasHasPainted: true,
      recovering: true,
      fellBack: false,
      reducedMotion: true,
    });
    expect(reverse.durationMs).toBe(0);
    expect(reverse.floorOpacity).toBe(1);
  });

  it('Ready fallback keeps the mesh compositable and hides the alien floor', () => {
    const readyFellBack = resolveFloor3dCrossfade({
      liveCanvasHasPainted: false,
      recovering: false,
      fellBack: true,
      hasReadyScanData: true,
    });
    expect(readyFellBack.morph3d).toBe(1);
    expect(readyFellBack.floorOpacity).toBe(0);
    expect(readyFellBack.phase).toBe('to3d');

    const readyRecovering = resolveFloor3dCrossfade({
      liveCanvasHasPainted: false,
      recovering: true,
      fellBack: false,
      hasReadyScanData: true,
    });
    expect(readyRecovering.morph3d).toBe(1);
    expect(readyRecovering.floorOpacity).toBe(1);
  });
});
