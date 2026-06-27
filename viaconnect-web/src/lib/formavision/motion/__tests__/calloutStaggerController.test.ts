import { describe, it, expect } from 'vitest';
import { createCalloutStaggerController } from '../calloutStaggerController';
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

function setup(reducedMotion = false, count = 4) {
  const ctrl = makeScheduler();
  const progress: number[] = new Array(count).fill(-1);
  const controller = createCalloutStaggerController({
    count,
    setProgress: (i, p) => {
      progress[i] = p;
    },
    scheduler: ctrl.scheduler,
    perCalloutMs: 200,
    staggerMs: 100,
    reducedMotion,
  });
  return { ctrl, progress, controller };
}

describe('createCalloutStaggerController (normal)', () => {
  it('entering schedules a staggered ease-in via the runner', () => {
    const { ctrl, controller } = setup();
    controller.enter();
    expect(ctrl.scheduleCount()).toBeGreaterThan(0);
    expect(controller.isRunning()).toBe(true);
  });

  it('staggers: earlier callouts lead later ones mid timeline', () => {
    const { ctrl, progress, controller } = setup();
    controller.enter();
    // All start hidden.
    expect(progress.every((p) => p === 0)).toBe(true);

    // Partway: callout 0 has progressed more than callout 3 (it started earlier).
    ctrl.advance(250);
    ctrl.step();
    expect(progress[0]).toBeGreaterThan(progress[3]);
    expect(progress[0]).toBeGreaterThan(0);

    // End: every callout is fully in.
    ctrl.advance(1000);
    ctrl.step();
    expect(progress.every((p) => p === 1)).toBe(true);
    expect(controller.isRunning()).toBe(false);
  });

  it('cancel stops a running stagger', () => {
    const { ctrl, progress, controller } = setup();
    controller.enter();
    ctrl.advance(150);
    ctrl.step();
    controller.cancel();
    const snapshot = [...progress];
    expect(controller.isRunning()).toBe(false);
    expect(ctrl.hasPending()).toBe(false);
    ctrl.advance(1000);
    ctrl.step();
    expect(progress).toEqual(snapshot);
  });
});

describe('createCalloutStaggerController (reduced motion)', () => {
  it('sets every callout to final at once with zero frames', () => {
    const { ctrl, progress, controller } = setup(true);
    controller.enter();
    expect(progress.every((p) => p === 1)).toBe(true);
    expect(ctrl.scheduleCount()).toBe(0);
    expect(controller.isRunning()).toBe(false);
  });
});

describe('createCalloutStaggerController (empty)', () => {
  it('a zero-count enter is a no-op (schedules nothing)', () => {
    const { ctrl, controller } = setup(false, 0);
    controller.enter();
    expect(ctrl.scheduleCount()).toBe(0);
    expect(controller.isRunning()).toBe(false);
  });
});
