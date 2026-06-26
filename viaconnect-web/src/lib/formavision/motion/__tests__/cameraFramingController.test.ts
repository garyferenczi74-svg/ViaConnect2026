import { describe, it, expect } from 'vitest';
import { createCameraFramingController } from '../cameraFramingController';
import { framingForRegion, FULL_BODY_FRAMING, type CameraFraming } from '../regionFraming';
import type { FrameScheduler } from '../demandAnimation';

function makeScheduler() {
  let time = 0;
  let pending: ((t: number) => void) | null = null;
  let handle = 1;
  let scheduleCount = 0;
  const scheduler: FrameScheduler = {
    now: () => time,
    schedule: (cb) => {
      pending = cb;
      scheduleCount += 1;
      return handle++;
    },
    cancel: () => {
      pending = null;
    },
  };
  return {
    scheduler,
    advance: (ms: number) => {
      time += ms;
    },
    step: () => {
      const cb = pending;
      pending = null;
      if (cb) {
        cb(time);
      }
    },
    scheduleCount: () => scheduleCount,
    hasPending: () => pending !== null,
  };
}

function setup(reducedMotion = false) {
  const ctrl = makeScheduler();
  let pose: CameraFraming = { ...FULL_BODY_FRAMING };
  const applied: CameraFraming[] = [];
  const controller = createCameraFramingController({
    readFraming: () => pose,
    applyFraming: (f) => {
      pose = f;
      applied.push(f);
    },
    scheduler: ctrl.scheduler,
    durationMs: 600,
    reducedMotion,
  });
  return { ctrl, applied, controller, getPose: () => pose };
}

describe('createCameraFramingController (normal)', () => {
  it('a selection change schedules a framing tween via the runner', () => {
    const { ctrl, controller } = setup();
    controller.frameRegion('chest');
    expect(ctrl.scheduleCount()).toBeGreaterThan(0);
    expect(controller.isFraming()).toBe(true);
  });

  it('eases the camera from the current pose to the region framing', () => {
    const { ctrl, applied, controller, getPose } = setup();
    const chest = framingForRegion('chest');
    controller.frameRegion('chest');

    // Mid tween: between the start and the chest framing.
    ctrl.advance(300);
    ctrl.step();
    const mid = applied[applied.length - 1];
    expect(mid.distance).toBeLessThan(FULL_BODY_FRAMING.distance);
    expect(mid.distance).toBeGreaterThanOrEqual(chest.distance);

    // Settle: lands exactly on the chest framing.
    ctrl.advance(300);
    ctrl.step();
    expect(getPose()).toEqual(chest);
    expect(controller.isFraming()).toBe(false);
  });

  it('clearing the selection eases back to the full-body default', () => {
    const { ctrl, controller, getPose } = setup();
    controller.frameRegion('chest');
    ctrl.advance(600);
    ctrl.step();

    controller.frameRegion(null);
    ctrl.advance(600);
    ctrl.step();
    expect(getPose()).toEqual(FULL_BODY_FRAMING);
  });

  it('cancel stops a running tween with no settle apply', () => {
    const { ctrl, applied, controller } = setup();
    controller.frameRegion('thigh');
    ctrl.advance(200);
    ctrl.step();
    const count = applied.length;
    controller.cancel();

    expect(controller.isFraming()).toBe(false);
    expect(ctrl.hasPending()).toBe(false);
    ctrl.advance(600);
    ctrl.step();
    expect(applied.length).toBe(count);
  });
});

describe('createCameraFramingController (reduced motion)', () => {
  it('sets the framing immediately with no tween scheduled', () => {
    const { ctrl, applied, controller, getPose } = setup(true);
    controller.frameRegion('calf');

    expect(applied.length).toBe(1);
    expect(getPose()).toEqual(framingForRegion('calf'));
    expect(ctrl.scheduleCount()).toBe(0);
    expect(controller.isFraming()).toBe(false);
  });

  it('clearing under reduced motion jumps to the full-body default', () => {
    const { ctrl, controller, getPose } = setup(true);
    controller.frameRegion(null);
    expect(getPose()).toEqual(FULL_BODY_FRAMING);
    expect(ctrl.scheduleCount()).toBe(0);
  });
});
