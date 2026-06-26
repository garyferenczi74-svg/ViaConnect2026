import { describe, it, expect, vi } from 'vitest';
import { createMaterializeIntro, type IntroTarget } from '../materializeIntro';
import type { FrameScheduler } from '../demandAnimation';

const LINE_STEADY = 1.6;
const FILL_STEADY = 0.55;

// A fake material target capturing every uniform write, plus the same controllable
// scheduler shape used by the runner tests.
function makeTarget(): IntroTarget & { lastScan: () => number; lastMorph: () => number } {
  let scan = -1;
  let morph = 1;
  const uniforms = {
    uLineIntensity: { value: LINE_STEADY },
    uFillOpacity: { value: FILL_STEADY },
  };
  return {
    setScan: (v) => {
      scan = v;
    },
    setMorph: (v) => {
      morph = v;
    },
    uniforms,
    lastScan: () => scan,
    lastMorph: () => morph,
  };
}

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

describe('createMaterializeIntro (reduced motion)', () => {
  it('lands the final lit state directly and schedules no animation', () => {
    const target = makeTarget();
    const ctrl = makeScheduler();
    const onComplete = vi.fn();
    const intro = createMaterializeIntro({
      target,
      scheduler: ctrl.scheduler,
      reducedMotion: true,
      onComplete,
    });

    intro.start();

    // Final steady state: band hidden, fully revealed, full intensity and fill.
    expect(target.lastScan()).toBe(-1);
    expect(target.lastMorph()).toBe(1);
    expect(target.uniforms.uLineIntensity.value).toBe(LINE_STEADY);
    expect(target.uniforms.uFillOpacity.value).toBe(FILL_STEADY);
    // The defining parity assertion: nothing was scheduled.
    expect(ctrl.scheduleCount()).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(intro.isFinished()).toBe(true);
  });
});

describe('createMaterializeIntro (normal)', () => {
  it('primes the pre-ignite look on start (band at feet, dim, hidden body)', () => {
    const target = makeTarget();
    const ctrl = makeScheduler();
    const intro = createMaterializeIntro({
      target,
      scheduler: ctrl.scheduler,
      durationMs: 1000,
    });

    intro.start();

    // Band begins at the feet, body not yet revealed, lines dim.
    expect(target.lastScan()).toBeGreaterThanOrEqual(0);
    expect(target.lastMorph()).toBeLessThan(0.2);
    expect(target.uniforms.uLineIntensity.value).toBeLessThan(LINE_STEADY);
    expect(ctrl.scheduleCount()).toBeGreaterThan(0);
    expect(intro.isFinished()).toBe(false);
  });

  it('sweeps the band feet to head and ignites the wireframe to steady state', () => {
    const target = makeTarget();
    const ctrl = makeScheduler();
    const onComplete = vi.fn();
    const intro = createMaterializeIntro({
      target,
      scheduler: ctrl.scheduler,
      durationMs: 1000,
      onComplete,
    });

    intro.start();

    // Midway: band somewhere along the body, partly revealed, partly ignited.
    ctrl.advance(500);
    ctrl.step();
    expect(target.lastScan()).toBeGreaterThan(0);
    expect(target.lastScan()).toBeLessThan(1);
    expect(target.uniforms.uLineIntensity.value).toBeGreaterThan(0.05);
    expect(target.uniforms.uLineIntensity.value).toBeLessThanOrEqual(LINE_STEADY);

    // Finish: lands at the lit steady state with the band hidden again.
    ctrl.advance(500);
    ctrl.step();
    expect(target.lastScan()).toBe(-1);
    expect(target.lastMorph()).toBe(1);
    expect(target.uniforms.uLineIntensity.value).toBe(LINE_STEADY);
    expect(target.uniforms.uFillOpacity.value).toBe(FILL_STEADY);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(intro.isFinished()).toBe(true);
  });

  it('skip() completes early to the final lit steady state', () => {
    const target = makeTarget();
    const ctrl = makeScheduler();
    const onComplete = vi.fn();
    const intro = createMaterializeIntro({
      target,
      scheduler: ctrl.scheduler,
      durationMs: 1000,
      onComplete,
    });

    intro.start();
    ctrl.advance(200);
    ctrl.step();
    intro.skip();

    expect(target.lastScan()).toBe(-1);
    expect(target.lastMorph()).toBe(1);
    expect(target.uniforms.uLineIntensity.value).toBe(LINE_STEADY);
    expect(target.uniforms.uFillOpacity.value).toBe(FILL_STEADY);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(intro.isFinished()).toBe(true);
  });

  it('cancel() stops mid intro without forcing the final state or onComplete', () => {
    const target = makeTarget();
    const ctrl = makeScheduler();
    const onComplete = vi.fn();
    const intro = createMaterializeIntro({
      target,
      scheduler: ctrl.scheduler,
      durationMs: 1000,
      onComplete,
    });

    intro.start();
    ctrl.advance(300);
    ctrl.step();
    intro.cancel();

    expect(onComplete).not.toHaveBeenCalled();
    expect(intro.isFinished()).toBe(true);
    // Scan was mid sweep, not snapped to the hidden steady value.
    expect(target.lastScan()).toBeGreaterThan(0);
    expect(target.lastScan()).toBeLessThan(1);
  });

  it('start() runs only once', () => {
    const target = makeTarget();
    const ctrl = makeScheduler();
    const intro = createMaterializeIntro({
      target,
      scheduler: ctrl.scheduler,
      durationMs: 1000,
    });
    intro.start();
    const after = ctrl.scheduleCount();
    intro.start();
    expect(ctrl.scheduleCount()).toBe(after);
  });
});
