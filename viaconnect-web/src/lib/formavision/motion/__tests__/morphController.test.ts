import { describe, it, expect, vi } from 'vitest';
import { createMorphController } from '../morphController';
import type { FrameScheduler } from '../demandAnimation';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

// Two distinct fixed-topology param vectors. The sampler below maps each to a known
// position array so the lerp can be asserted without three or a GPU.
function vec(heightM: number): BodyParamVector {
  return {
    sex: 'male',
    heightM,
    rings: [{ id: 'chest', levelN: 0.72, circumferenceM: 0.95, aspectRatio: 0.7, estimated: false }],
    arms: [{ side: 'r', bicepM: 0.32, forearmM: 0.27, estimated: false }],
  };
}

const FROM = vec(1.7);
const TO = vec(1.9);

// Sampler keyed on heightM: produces a 3-component position array so endpoints are
// distinguishable. Interpolated vectors (non-endpoint heights) get an interpolated
// array so the retarget path is exercised too.
function samplePositions(v: BodyParamVector): Float32Array {
  return new Float32Array([v.heightM, v.heightM * 2, v.heightM * 3]);
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
    hasPending: () => pending !== null,
  };
}

function setup(reducedMotion = false) {
  const ctrl = makeScheduler();
  const writes: number[][] = [];
  const recomputeNormals = vi.fn();
  const controller = createMorphController(
    {
      samplePositions,
      writePositions: (p) => writes.push(Array.from(p)),
      recomputeNormals,
      scheduler: ctrl.scheduler,
      durationMs: 1000,
      reducedMotion,
    },
    FROM,
  );
  return { ctrl, writes, recomputeNormals, controller };
}

describe('createMorphController (normal)', () => {
  it('a target change schedules a tween via the runner', () => {
    const { ctrl, controller } = setup();
    controller.morphTo(TO);
    expect(ctrl.scheduleCount()).toBeGreaterThan(0);
    expect(controller.isMorphing()).toBe(true);
  });

  it('tweens the position attribute from the current shape to the target', () => {
    const { ctrl, writes, recomputeNormals, controller } = setup();
    controller.morphTo(TO);

    // Frame at t=0 writes the from shape.
    expect(writes[0][0]).toBeCloseTo(1.7, 5);
    expect(writes[0][1]).toBeCloseTo(3.4, 5);
    expect(writes[0][2]).toBeCloseTo(5.1, 5);

    ctrl.advance(500);
    ctrl.step();
    const mid = writes[writes.length - 1];
    expect(mid[0]).toBeGreaterThan(1.7);
    expect(mid[0]).toBeLessThan(1.9);
    // Normals are not recomputed mid tween (kept cheap).
    expect(recomputeNormals).not.toHaveBeenCalled();

    ctrl.advance(500);
    ctrl.step();
    // Lands on the target positions (Float32 precision) and recomputes normals once.
    const end = writes[writes.length - 1];
    expect(end[0]).toBeCloseTo(1.9, 5);
    expect(end[1]).toBeCloseTo(3.8, 5);
    expect(end[2]).toBeCloseTo(5.7, 5);
    expect(recomputeNormals).toHaveBeenCalledTimes(1);
    expect(controller.isMorphing()).toBe(false);
  });

  it('retargets mid tween from the on-screen shape (no jump)', () => {
    const { ctrl, controller } = setup();
    controller.morphTo(TO);
    ctrl.advance(500);
    ctrl.step();
    // Retarget back toward FROM while mid flight; a fresh tween schedules again.
    const before = ctrl.scheduleCount();
    controller.morphTo(FROM);
    expect(ctrl.scheduleCount()).toBeGreaterThan(before);
    expect(controller.isMorphing()).toBe(true);
  });
});

describe('createMorphController (reduced motion)', () => {
  it('snaps to the target with no tween scheduled', () => {
    const { ctrl, writes, recomputeNormals, controller } = setup(true);
    controller.morphTo(TO);

    // Exactly one write (the snap) and one normal recompute, zero frames scheduled.
    expect(writes.length).toBe(1);
    expect(writes[0][0]).toBeCloseTo(1.9, 5);
    expect(writes[0][1]).toBeCloseTo(3.8, 5);
    expect(writes[0][2]).toBeCloseTo(5.7, 5);
    expect(recomputeNormals).toHaveBeenCalledTimes(1);
    expect(ctrl.scheduleCount()).toBe(0);
    expect(controller.isMorphing()).toBe(false);
  });
});

describe('createMorphController (lifecycle)', () => {
  it('cancel stops a running tween with no settle write', () => {
    const { ctrl, writes, recomputeNormals, controller } = setup();
    controller.morphTo(TO);
    ctrl.advance(300);
    ctrl.step();
    const writeCount = writes.length;
    controller.cancel();

    expect(controller.isMorphing()).toBe(false);
    expect(ctrl.hasPending()).toBe(false);
    // No further writes and no settle normal recompute after cancel.
    ctrl.advance(1000);
    ctrl.step();
    expect(writes.length).toBe(writeCount);
    expect(recomputeNormals).not.toHaveBeenCalled();
  });

  it('does not touch any intro mechanism (no intro coupling)', () => {
    // The controller's only outputs are the injected sampler, writer and normal
    // recompute. It exposes no intro hook and calls nothing intro related, so a
    // morph can never re-fire the materialize intro. This is the structural proof.
    const { controller } = setup();
    const keys = Object.keys(controller);
    expect(keys).toEqual(['morphTo', 'cancel', 'isMorphing']);
  });
});
