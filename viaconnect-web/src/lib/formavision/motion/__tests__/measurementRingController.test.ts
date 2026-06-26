import { describe, it, expect, vi } from 'vitest';
import { createMeasurementRingController } from '../measurementRingController';
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
  const setArc = vi.fn();
  const setValueFraction = vi.fn();
  const pulse = vi.fn();
  const dispose = vi.fn();
  const controller = createMeasurementRingController({
    setArc,
    setValueFraction,
    pulse,
    dispose,
    scheduler: ctrl.scheduler,
    durationMs: 500,
    reducedMotion,
  });
  return { ctrl, setArc, setValueFraction, pulse, dispose, controller };
}

describe('createMeasurementRingController (normal)', () => {
  it('selection schedules the sweep and count-up via the runner', () => {
    const { ctrl, controller } = setup();
    controller.draw();
    expect(ctrl.scheduleCount()).toBeGreaterThan(0);
    expect(controller.isDrawing()).toBe(true);
  });

  it('grows the arc and value fraction together and settles with a pulse', () => {
    const { ctrl, setArc, setValueFraction, pulse, controller } = setup();
    controller.draw();
    // Starts from zero.
    expect(setArc).toHaveBeenLastCalledWith(0);

    ctrl.advance(250);
    ctrl.step();
    const arcMid = setArc.mock.calls[setArc.mock.calls.length - 1][0];
    const valMid = setValueFraction.mock.calls[setValueFraction.mock.calls.length - 1][0];
    expect(arcMid).toBeGreaterThan(0);
    expect(arcMid).toBeLessThan(1);
    // Arc and value advance in lockstep off the same runner.
    expect(valMid).toBeCloseTo(arcMid, 6);

    ctrl.advance(250);
    ctrl.step();
    expect(setArc).toHaveBeenLastCalledWith(1);
    expect(setValueFraction).toHaveBeenLastCalledWith(1);
    expect(pulse).toHaveBeenCalledTimes(1);
    expect(controller.isDrawing()).toBe(false);
  });
});

describe('createMeasurementRingController (reduced motion)', () => {
  it('shows the full ring and final value instantly with zero frames', () => {
    const { ctrl, setArc, setValueFraction, pulse, controller } = setup(true);
    controller.draw();

    expect(setArc).toHaveBeenLastCalledWith(1);
    expect(setValueFraction).toHaveBeenLastCalledWith(1);
    expect(ctrl.scheduleCount()).toBe(0);
    expect(controller.isDrawing()).toBe(false);
    // No sweep pulse on the instant path.
    expect(pulse).not.toHaveBeenCalled();
  });
});

describe('createMeasurementRingController (deselect)', () => {
  it('disposes the ring and schedules nothing further', () => {
    const { ctrl, dispose, controller } = setup();
    controller.draw();
    ctrl.advance(200);
    ctrl.step();
    const before = ctrl.scheduleCount();
    controller.deselect();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(controller.isDrawing()).toBe(false);
    expect(ctrl.hasPending()).toBe(false);

    // A draw after deselect is inert (disposed), no new frames.
    controller.draw();
    expect(ctrl.scheduleCount()).toBe(before);
  });

  it('deselect before any draw still disposes safely', () => {
    const { dispose, controller } = setup();
    controller.deselect();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
