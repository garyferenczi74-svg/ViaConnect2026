import { describe, it, expect, vi } from 'vitest';
import { createDemandAnimation, type FrameScheduler } from '../demandAnimation';
import { linear } from '../easing';

// A controllable scheduler: time is advanced manually and a single pending frame
// is fired by step(). This stands in for rAF without any real timer.
function makeScheduler() {
  let time = 0;
  let pending: ((t: number) => void) | null = null;
  let nextHandle = 1;
  let scheduleCount = 0;

  const scheduler: FrameScheduler = {
    now: () => time,
    schedule: (cb) => {
      pending = cb;
      scheduleCount += 1;
      return nextHandle++;
    },
    cancel: () => {
      pending = null;
    },
  };

  return {
    scheduler,
    advance(ms: number) {
      time += ms;
    },
    step() {
      const cb = pending;
      pending = null;
      if (cb) {
        cb(time);
      }
    },
    hasPending: () => pending !== null,
    scheduleCount: () => scheduleCount,
  };
}

describe('createDemandAnimation', () => {
  it('advances progress over time and lands exactly at 1', () => {
    const ctrl = makeScheduler();
    const updates: number[] = [];
    const onComplete = vi.fn();
    const anim = createDemandAnimation({
      durationMs: 100,
      easing: linear,
      onUpdate: (v) => updates.push(v),
      onComplete,
      scheduler: ctrl.scheduler,
    });

    anim.start();
    // Frame at t=0 emitted on start.
    expect(updates[0]).toBe(0);

    ctrl.advance(50);
    ctrl.step();
    expect(updates[updates.length - 1]).toBeCloseTo(0.5, 6);
    expect(anim.isRunning()).toBe(true);

    ctrl.advance(50);
    ctrl.step();
    expect(updates[updates.length - 1]).toBe(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(anim.isFinished()).toBe(true);
    expect(anim.isRunning()).toBe(false);
    // No further frame scheduled after completion.
    expect(ctrl.hasPending()).toBe(false);
  });

  it('complete() jumps to 1 and finishes once even mid run', () => {
    const ctrl = makeScheduler();
    const updates: number[] = [];
    const onComplete = vi.fn();
    const anim = createDemandAnimation({
      durationMs: 1000,
      easing: linear,
      onUpdate: (v) => updates.push(v),
      onComplete,
      scheduler: ctrl.scheduler,
    });

    anim.start();
    ctrl.advance(100);
    ctrl.step();
    anim.complete();

    expect(updates[updates.length - 1]).toBe(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(anim.isFinished()).toBe(true);
    expect(ctrl.hasPending()).toBe(false);

    // A second complete is inert.
    anim.complete();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skip() is an alias for complete()', () => {
    const ctrl = makeScheduler();
    const onComplete = vi.fn();
    const onUpdate = vi.fn();
    const anim = createDemandAnimation({
      durationMs: 500,
      onUpdate,
      onComplete,
      scheduler: ctrl.scheduler,
    });
    anim.start();
    anim.skip();
    expect(onUpdate).toHaveBeenLastCalledWith(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('complete() works before start() (jump straight to end)', () => {
    const ctrl = makeScheduler();
    const onComplete = vi.fn();
    const onUpdate = vi.fn();
    const anim = createDemandAnimation({
      durationMs: 500,
      onUpdate,
      onComplete,
      scheduler: ctrl.scheduler,
    });
    anim.complete();
    expect(onUpdate).toHaveBeenLastCalledWith(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(ctrl.scheduleCount()).toBe(0);
  });

  it('cancel() stops the run with no final update and no onComplete', () => {
    const ctrl = makeScheduler();
    const onComplete = vi.fn();
    const updates: number[] = [];
    const anim = createDemandAnimation({
      durationMs: 1000,
      easing: linear,
      onUpdate: (v) => updates.push(v),
      onComplete,
      scheduler: ctrl.scheduler,
    });

    anim.start();
    ctrl.advance(200);
    ctrl.step();
    const beforeCancel = updates.length;
    anim.cancel();

    expect(anim.isFinished()).toBe(true);
    expect(anim.isRunning()).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
    expect(ctrl.hasPending()).toBe(false);

    // No further updates after cancel.
    ctrl.advance(1000);
    ctrl.step();
    expect(updates.length).toBe(beforeCancel);
  });

  it('immediate mode lands at the final state and schedules nothing', () => {
    const ctrl = makeScheduler();
    const onComplete = vi.fn();
    const onUpdate = vi.fn();
    const anim = createDemandAnimation({
      durationMs: 1500,
      immediate: true,
      onUpdate,
      onComplete,
      scheduler: ctrl.scheduler,
    });

    anim.start();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(anim.isFinished()).toBe(true);
    // The defining property of reduced-motion parity: zero frames scheduled.
    expect(ctrl.scheduleCount()).toBe(0);
    expect(ctrl.hasPending()).toBe(false);
  });

  it('start() is inert once finished', () => {
    const ctrl = makeScheduler();
    const onUpdate = vi.fn();
    const anim = createDemandAnimation({
      durationMs: 100,
      onUpdate,
      scheduler: ctrl.scheduler,
    });
    anim.complete();
    onUpdate.mockClear();
    anim.start();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(ctrl.scheduleCount()).toBe(0);
  });
});
