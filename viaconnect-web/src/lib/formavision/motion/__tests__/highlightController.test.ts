import { describe, it, expect } from 'vitest';
import { createHighlightController } from '../highlightController';
import { ringLoopForRegion } from '@/lib/formavision/geometry/ringLoopForRegion';
import type { FrameScheduler } from '../demandAnimation';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

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

// The shared level source: resolveLevel wraps ringLoopForRegion exactly like the
// scene does, proving highlight uses the same region->levelN mapping as ring/camera.
const PARAM: BodyParamVector = {
  sex: 'male',
  heightM: 1.8,
  rings: [
    { id: 'chest', levelN: 0.72, circumferenceM: 1.0, aspectRatio: 0.72, estimated: false },
    { id: 'waist', levelN: 0.62, circumferenceM: 0.85, aspectRatio: 0.78, estimated: false },
  ],
  arms: [
    { side: 'r', bicepM: 0.32, forearmM: 0.27, estimated: false },
    { side: 'l', bicepM: 0.32, forearmM: 0.27, estimated: false },
  ],
};

function setup(reducedMotion = false) {
  const ctrl = makeScheduler();
  const sets: Array<{ y: number; intensity: number }> = [];
  const controller = createHighlightController({
    setHighlight: (y, intensity) => sets.push({ y, intensity }),
    resolveLevel: (region) => ringLoopForRegion(PARAM, region).levelN,
    scheduler: ctrl.scheduler,
    steadyIntensity: 0.35,
    pulsePeak: 0.7,
    pulseDurationMs: 400,
    reducedMotion,
  });
  return { ctrl, sets, controller };
}

describe('createHighlightController (normal)', () => {
  it('selecting a region pulses the highlight at that region level then settles', () => {
    const { ctrl, sets, controller } = setup();
    controller.highlightRegion('chest');
    expect(controller.isPulsing()).toBe(true);

    // Highlight is anchored at the chest level (0.72 here), the SAME level the ring
    // loop returns for chest.
    expect(sets[0].y).toBeCloseTo(0.72, 6);
    expect(sets[0].intensity).toBeGreaterThan(0.35);

    ctrl.advance(400);
    ctrl.step();
    const last = sets[sets.length - 1];
    expect(last.y).toBeCloseTo(0.72, 6);
    expect(last.intensity).toBeCloseTo(0.35, 6);
    expect(controller.isPulsing()).toBe(false);
  });

  it('clearing the selection resets the highlight (off)', () => {
    const { sets, controller } = setup();
    controller.highlightRegion('chest');
    controller.highlightRegion(null);
    const last = sets[sets.length - 1];
    expect(last.y).toBeLessThan(0);
    expect(last.intensity).toBe(0);
  });

  it('an unknown region clears rather than highlighting a wrong place', () => {
    const { sets, controller } = setup();
    controller.highlightRegion('chest');
    controller.highlightRegion(null);
    // resolveLevel returns a valid number for any id via the template fallback, so
    // simulate a truly unknown level by a controller whose resolver returns null.
    const ctrl = makeScheduler();
    const nullSets: Array<{ y: number; intensity: number }> = [];
    const c2 = createHighlightController({
      setHighlight: (y, intensity) => nullSets.push({ y, intensity }),
      resolveLevel: () => null,
      scheduler: ctrl.scheduler,
    });
    c2.highlightRegion('mystery');
    expect(nullSets[nullSets.length - 1].intensity).toBe(0);
    expect(ctrl.scheduleCount()).toBe(0);
    void sets;
  });
});

describe('createHighlightController (reduced motion)', () => {
  it('applies the steady highlight statically with no animation scheduled', () => {
    const { ctrl, sets, controller } = setup(true);
    controller.highlightRegion('waist');

    expect(sets).toHaveLength(1);
    expect(sets[0].y).toBeCloseTo(0.62, 6);
    expect(sets[0].intensity).toBeCloseTo(0.35, 6);
    expect(ctrl.scheduleCount()).toBe(0);
    expect(controller.isPulsing()).toBe(false);
  });
});

describe('createHighlightController (lifecycle)', () => {
  it('cancel stops a running pulse', () => {
    const { ctrl, controller } = setup();
    controller.highlightRegion('chest');
    controller.cancel();
    expect(controller.isPulsing()).toBe(false);
    const before = ctrl.scheduleCount();
    ctrl.advance(400);
    ctrl.step();
    expect(ctrl.scheduleCount()).toBe(before);
  });

  it('uses the same level as ringLoopForRegion (shared mapping)', () => {
    const expected = ringLoopForRegion(PARAM, 'waist').levelN;
    const { sets, controller } = setup(true);
    controller.highlightRegion('waist');
    expect(sets[0].y).toBeCloseTo(expected, 6);
  });
});
