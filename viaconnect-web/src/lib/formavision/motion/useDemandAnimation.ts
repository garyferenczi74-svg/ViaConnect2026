// React-three-fiber binding for the demand-animation runner (Prompt 210b, P2-T1).
//
// The runner in demandAnimation.ts is framework light and time injected. This file
// is the only place that touches react-three-fiber and the browser clock: it builds
// a FrameScheduler whose schedule() pairs requestAnimationFrame with the r3f
// invalidate() so each animated frame both advances the runner and asks the demand
// loop to paint. When the runner stops scheduling, the demand loop goes quiet again,
// so the intro never leaves a continuous render running.
//
// makeRafScheduler is exported separately (no hooks) so callers inside the Canvas
// can build a scheduler from an invalidate they already hold, and so it can be
// covered without a Canvas if needed. useDemandScheduler is the hook form for
// components mounted under <Canvas>.

import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import type { FrameScheduler } from './demandAnimation';

// Build a scheduler that drives both the animation clock and the r3f demand loop.
// invalidate is called alongside scheduling each frame so the renderer paints the
// uniform changes the runner just wrote.
export function makeRafScheduler(invalidate: () => void): FrameScheduler {
  return {
    now: () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now(),
    schedule: (cb) => {
      const handle = requestAnimationFrame((time) => {
        cb(time);
      });
      // Ask the demand loop to produce a frame for the update the runner will make.
      invalidate();
      return handle;
    },
    cancel: (handle) => {
      cancelAnimationFrame(handle);
    },
  };
}

// Hook form: pulls invalidate from the r3f store and memoizes a scheduler for the
// lifetime of the Canvas. Use this from a component rendered inside <Canvas>.
export function useDemandScheduler(): FrameScheduler {
  const invalidate = useThree((state) => state.invalidate);
  return useMemo(() => makeRafScheduler(invalidate), [invalidate]);
}
