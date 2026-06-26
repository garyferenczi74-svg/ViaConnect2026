import { describe, it, expect, vi } from 'vitest';
import { createIdleTurntable, type IdleTimer } from '../idleTurntable';
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

// Fake idle timer: holds one callback that the test fires manually via fire().
function makeTimer() {
  let cb: (() => void) | null = null;
  let handle = 1;
  let setCount = 0;
  const timer: IdleTimer = {
    set: (callback) => {
      cb = callback;
      setCount += 1;
      return handle++;
    },
    clear: () => {
      cb = null;
    },
  };
  return {
    timer,
    fire: () => {
      const c = cb;
      cb = null;
      if (c) {
        c();
      }
    },
    isArmed: () => cb !== null,
    setCount: () => setCount,
  };
}

function setup(reducedMotion = false) {
  const ctrl = makeScheduler();
  const tmr = makeTimer();
  const advanceAzimuth = vi.fn();
  const turntable = createIdleTurntable({
    scheduler: ctrl.scheduler,
    timer: tmr.timer,
    advanceAzimuth,
    idleDelayMs: 2000,
    speedRadPerSec: 1,
    reducedMotion,
  });
  return { ctrl, tmr, advanceAzimuth, turntable };
}

describe('createIdleTurntable (normal)', () => {
  it('starts rotating only after the idle delay fires', () => {
    const { ctrl, tmr, advanceAzimuth, turntable } = setup();
    turntable.begin();
    // Armed but not yet rotating.
    expect(tmr.isArmed()).toBe(true);
    expect(ctrl.scheduleCount()).toBe(0);

    // Idle elapses: rotation begins and advances azimuth each frame.
    tmr.fire();
    expect(ctrl.scheduleCount()).toBe(1);
    ctrl.advance(100);
    ctrl.step();
    expect(advanceAzimuth).toHaveBeenCalled();
    expect(advanceAzimuth.mock.calls[0][0]).toBeGreaterThan(0);
    turntable.dispose();
  });

  it('pauses on interaction and restarts the idle countdown', () => {
    const { ctrl, tmr, advanceAzimuth, turntable } = setup();
    turntable.begin();
    tmr.fire();
    ctrl.advance(100);
    ctrl.step();
    advanceAzimuth.mockClear();

    // Interaction pauses rotation and re-arms the idle timer.
    turntable.notifyInteraction();
    expect(tmr.isArmed()).toBe(true);
    // No further frame is pending, so rotation has stopped.
    expect(ctrl.hasPending()).toBe(false);
    ctrl.advance(100);
    ctrl.step();
    expect(advanceAzimuth).not.toHaveBeenCalled();
    turntable.dispose();
  });

  it('stays paused while suspended (intro or morph running) and resumes after', () => {
    const { ctrl, tmr, turntable } = setup();
    turntable.begin();
    // Suspend before idle elapses: the timer is cleared, nothing arms.
    turntable.setSuspended(true);
    expect(tmr.isArmed()).toBe(false);
    tmr.fire(); // no-op, nothing armed
    expect(ctrl.scheduleCount()).toBe(0);

    // Release: the idle countdown re-arms.
    turntable.setSuspended(false);
    expect(tmr.isArmed()).toBe(true);
    turntable.dispose();
  });

  it('dispose stops rotation and releases the timer', () => {
    const { ctrl, tmr, advanceAzimuth, turntable } = setup();
    turntable.begin();
    tmr.fire();
    ctrl.advance(100);
    ctrl.step();
    advanceAzimuth.mockClear();

    turntable.dispose();
    expect(ctrl.hasPending()).toBe(false);
    expect(tmr.isArmed()).toBe(false);
    ctrl.advance(100);
    ctrl.step();
    expect(advanceAzimuth).not.toHaveBeenCalled();
  });
});

describe('createIdleTurntable (reduced motion)', () => {
  it('is fully disabled: no timer armed, no frames scheduled, ever', () => {
    const { ctrl, tmr, advanceAzimuth, turntable } = setup(true);
    turntable.begin();
    turntable.notifyInteraction();
    turntable.setSuspended(false);

    expect(tmr.setCount()).toBe(0);
    expect(tmr.isArmed()).toBe(false);
    expect(ctrl.scheduleCount()).toBe(0);
    expect(advanceAzimuth).not.toHaveBeenCalled();
  });
});
