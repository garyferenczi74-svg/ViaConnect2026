import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Integration-shaped throttle test. This drives a continuous burst of scrubTo through
// ONE stable controller instance (the path FormaVisionCanvas now uses via a ref) with
// REAL elapsed-time timers, proving the 90ms debounce spans ticks: a fast drag where
// each tick lands inside the window recomputes normals at most once, and only after the
// drag goes quiet for the full window. The original Canvas rebuilt the controller per
// scrubVector change and end()'d in the per-change cleanup, recomputing per tick; this
// test pins the stable-instance behavior so that regression cannot return unnoticed.
describe('createScrubController stable-instance throttle (integration shape)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function realTimerSetup(debounceMs: number) {
    const recomputeNormals = vi.fn();
    const controller = createScrubController({
      samplePositions,
      writePositions: () => undefined,
      recomputeNormals,
      // Real timer seam, driven by vi fake timers.
      timer: {
        set: (cb, ms) => Number(setTimeout(cb, ms)),
        clear: (handle) => clearTimeout(handle),
      },
      normalsDebounceMs: debounceMs,
    });
    return { recomputeNormals, controller };
  }

  it('a continuous fast drag recomputes normals at most once per quiet window', () => {
    const { recomputeNormals, controller } = realTimerSetup(90);

    // 20 ticks, 30ms apart (inside the 90ms window): each restarts the debounce, so no
    // recompute fires DURING the drag.
    for (let i = 0; i < 20; i += 1) {
      controller.scrubTo(vec(1.6 + i * 0.01));
      vi.advanceTimersByTime(30);
    }
    expect(recomputeNormals).not.toHaveBeenCalled();

    // The drag goes quiet: after the full window elapses, exactly one recompute fires
    // for the entire 20-tick burst, not once per tick.
    vi.advanceTimersByTime(90);
    expect(recomputeNormals).toHaveBeenCalledTimes(1);
  });

  it('a second quiet window after more scrubbing recomputes once more (not per tick)', () => {
    const { recomputeNormals, controller } = realTimerSetup(90);

    controller.scrubTo(vec(1.7));
    controller.scrubTo(vec(1.72));
    vi.advanceTimersByTime(90);
    expect(recomputeNormals).toHaveBeenCalledTimes(1);

    controller.scrubTo(vec(1.8));
    controller.scrubTo(vec(1.82));
    controller.scrubTo(vec(1.84));
    vi.advanceTimersByTime(90);
    expect(recomputeNormals).toHaveBeenCalledTimes(2);
  });
});
