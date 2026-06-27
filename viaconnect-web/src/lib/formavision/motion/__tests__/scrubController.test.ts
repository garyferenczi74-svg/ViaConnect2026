import { describe, it, expect, vi } from 'vitest';
import { createScrubController, type ScrubTimer } from '../scrubController';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

function vec(heightM: number): BodyParamVector {
  return {
    sex: 'male',
    heightM,
    rings: [{ id: 'chest', levelN: 0.72, circumferenceM: 1.0, aspectRatio: 0.7, estimated: false }],
    arms: [{ side: 'r', bicepM: 0.32, forearmM: 0.27, estimated: false }],
  };
}

// Sampler keyed on heightM so each scrub vector yields a distinguishable buffer of a
// fixed length (topology invariant).
function samplePositions(v: BodyParamVector): Float32Array {
  return new Float32Array([v.heightM, v.heightM * 2, v.heightM * 3]);
}

function makeTimer() {
  let cb: (() => void) | null = null;
  let handle = 1;
  let setCount = 0;
  const timer: ScrubTimer = {
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

function setup() {
  const tmr = makeTimer();
  const writes: number[][] = [];
  const recomputeNormals = vi.fn();
  const controller = createScrubController({
    samplePositions,
    writePositions: (p) => writes.push(Array.from(p)),
    recomputeNormals,
    timer: tmr.timer,
    normalsDebounceMs: 100,
  });
  return { tmr, writes, recomputeNormals, controller };
}

describe('createScrubController', () => {
  it('writes the sampled positions directly on each scrub change with no tween', () => {
    const { writes, controller } = setup();
    controller.scrubTo(vec(1.7));
    expect(writes[0][0]).toBeCloseTo(1.7, 5);
    expect(writes[0][1]).toBeCloseTo(3.4, 5);
    expect(writes[0][2]).toBeCloseTo(5.1, 5);
    controller.scrubTo(vec(1.9));
    expect(writes[1][0]).toBeCloseTo(1.9, 5);
    expect(writes[1][2]).toBeCloseTo(5.7, 5);
    // Two changes produced exactly two direct writes (no interpolation frames).
    expect(writes).toHaveLength(2);
  });

  it('keeps a fixed-topology buffer length across scrub changes', () => {
    const { writes, controller } = setup();
    controller.scrubTo(vec(1.6));
    controller.scrubTo(vec(2.0));
    expect(writes[0]).toHaveLength(writes[1].length);
  });

  it('throttles normal recompute: a burst recomputes at most once per window', () => {
    const { tmr, recomputeNormals, controller } = setup();
    controller.scrubTo(vec(1.7));
    controller.scrubTo(vec(1.75));
    controller.scrubTo(vec(1.8));
    // No recompute during the burst.
    expect(recomputeNormals).not.toHaveBeenCalled();
    // The debounce window elapses once: a single recompute for the whole burst.
    tmr.fire();
    expect(recomputeNormals).toHaveBeenCalledTimes(1);
  });

  it('end() recomputes normals immediately for the at-rest rim', () => {
    const { recomputeNormals, controller } = setup();
    controller.scrubTo(vec(1.7));
    controller.end();
    expect(recomputeNormals).toHaveBeenCalledTimes(1);
  });

  it('exposes the last scrub vector so morph can resume from it (no jump)', () => {
    const { controller } = setup();
    expect(controller.lastVector()).toBeNull();
    const v = vec(1.85);
    controller.scrubTo(v);
    expect(controller.lastVector()).toBe(v);
  });

  it('cancel stops a pending recompute without changing positions', () => {
    const { tmr, recomputeNormals, controller } = setup();
    controller.scrubTo(vec(1.7));
    controller.cancel();
    expect(tmr.isArmed()).toBe(false);
    tmr.fire();
    expect(recomputeNormals).not.toHaveBeenCalled();
  });
});
