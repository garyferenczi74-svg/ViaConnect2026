import { describe, it, expect, vi } from 'vitest';
import { createEmphasisParticleController } from '../emphasisParticleController';
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
  const setBurst = vi.fn();
  const dispose = vi.fn();
  const controller = createEmphasisParticleController({
    setBurst,
    dispose,
    scheduler: ctrl.scheduler,
    durationMs: 600,
    reducedMotion,
  });
  return { ctrl, setBurst, dispose, controller };
}

describe('createEmphasisParticleController (normal)', () => {
  it('fires a one-shot burst via the runner then disposes', () => {
    const { ctrl, setBurst, dispose, controller } = setup();
    controller.fire();
    expect(ctrl.scheduleCount()).toBeGreaterThan(0);
    expect(controller.isFiring()).toBe(true);
    expect(setBurst).toHaveBeenLastCalledWith(0);

    ctrl.advance(300);
    ctrl.step();
    const mid = setBurst.mock.calls[setBurst.mock.calls.length - 1][0];
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(dispose).not.toHaveBeenCalled();

    ctrl.advance(300);
    ctrl.step();
    expect(setBurst).toHaveBeenLastCalledWith(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(controller.isFiring()).toBe(false);
    expect(ctrl.hasPending()).toBe(false);
  });

  it('a second fire after completion is inert (already disposed)', () => {
    const { ctrl, dispose, controller } = setup();
    controller.fire();
    ctrl.advance(600);
    ctrl.step();
    const before = ctrl.scheduleCount();
    controller.fire();
    expect(ctrl.scheduleCount()).toBe(before);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('createEmphasisParticleController (reduced motion)', () => {
  it('shows a single static accent with zero frames then disposes', () => {
    const { ctrl, setBurst, dispose, controller } = setup(true);
    controller.fire();

    expect(setBurst).toHaveBeenCalledTimes(1);
    expect(setBurst).toHaveBeenCalledWith(1);
    expect(ctrl.scheduleCount()).toBe(0);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(controller.isFiring()).toBe(false);
  });
});

describe('createEmphasisParticleController (lifecycle)', () => {
  it('cancel stops the burst and disposes (unmount)', () => {
    const { ctrl, dispose, controller } = setup();
    controller.fire();
    ctrl.advance(200);
    ctrl.step();
    controller.cancel();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(controller.isFiring()).toBe(false);
    expect(ctrl.hasPending()).toBe(false);
    // No further frames after cancel.
    const before = ctrl.scheduleCount();
    ctrl.advance(600);
    ctrl.step();
    expect(ctrl.scheduleCount()).toBe(before);
  });

  it('unset emphasis never fires (the scene simply does not call fire)', () => {
    const { ctrl, setBurst, dispose } = setup();
    // No fire() call models an unset emphasisRegion: nothing scheduled or disposed.
    expect(ctrl.scheduleCount()).toBe(0);
    expect(setBurst).not.toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
  });
});
