import { describe, it, expect, vi } from 'vitest';
import { Color } from 'three';
import { createOverlayController } from '../overlayController';
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
  };
}

function setup(reducedMotion = false) {
  const ctrl = makeScheduler();
  const setTints = vi.fn();
  const mixes: number[] = [];
  const controller = createOverlayController({
    setTints,
    setOverlayMix: (m) => mixes.push(m),
    scheduler: ctrl.scheduler,
    durationMs: 400,
    reducedMotion,
  });
  return { ctrl, setTints, mixes, controller };
}

const TINTS = [new Color('#ff0000'), null, new Color('#00ff00'), null, null];

describe('createOverlayController (normal)', () => {
  it('show applies the tints and ramps the overlay mix to 1', () => {
    const { ctrl, setTints, mixes, controller } = setup();
    controller.show(TINTS);
    expect(setTints).toHaveBeenCalledWith(TINTS);
    expect(ctrl.scheduleCount()).toBeGreaterThan(0);
    expect(controller.isFading()).toBe(true);

    ctrl.advance(400);
    ctrl.step();
    expect(mixes[mixes.length - 1]).toBe(1);
    expect(controller.isFading()).toBe(false);
  });

  it('hide ramps the overlay mix back to 0', () => {
    const { ctrl, mixes, controller } = setup();
    controller.show(TINTS);
    ctrl.advance(400);
    ctrl.step();

    controller.hide();
    ctrl.advance(400);
    ctrl.step();
    expect(mixes[mixes.length - 1]).toBe(0);
  });

  it('a repeated show updates tints without restarting an identical fade', () => {
    const { ctrl, setTints, controller } = setup();
    controller.show(TINTS);
    ctrl.advance(400);
    ctrl.step();
    const before = ctrl.scheduleCount();
    controller.show(TINTS);
    expect(setTints).toHaveBeenCalledTimes(2);
    // No new fade scheduled (already at mix 1).
    expect(ctrl.scheduleCount()).toBe(before);
  });

  it('cancel stops a running fade', () => {
    const { ctrl, mixes, controller } = setup();
    controller.show(TINTS);
    controller.cancel();
    expect(controller.isFading()).toBe(false);
    const count = mixes.length;
    ctrl.advance(400);
    ctrl.step();
    expect(mixes.length).toBe(count);
  });
});

describe('createOverlayController (reduced motion)', () => {
  it('show sets mix to 1 instantly with no frames', () => {
    const { ctrl, mixes, controller } = setup(true);
    controller.show(TINTS);
    expect(mixes[mixes.length - 1]).toBe(1);
    expect(ctrl.scheduleCount()).toBe(0);
    expect(controller.isFading()).toBe(false);
  });

  it('hide sets mix to 0 instantly with no frames', () => {
    const { ctrl, mixes, controller } = setup(true);
    controller.show(TINTS);
    controller.hide();
    expect(mixes[mixes.length - 1]).toBe(0);
    expect(ctrl.scheduleCount()).toBe(0);
  });
});
