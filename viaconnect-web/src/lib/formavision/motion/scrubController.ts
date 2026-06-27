// Direct-set scrub controller for the FormaVision avatar (Prompt 210b, P3-T2a).
//
// The P2-T2b morph TWEENS to a new target on a target change. Scrubbing is different:
// as the user drags a timeline the body must follow the scrub position DIRECTLY and
// continuously, so the shape at each scrub value is set immediately with NO tween.
// This controller writes the sampled positions of a scrub param vector into the
// fixed-topology buffer on every change (no geometry rebuild, no runner), and throttles
// the vertex-normal recompute.
//
// NORMAL THROTTLE CHOICE: recomputing vertex normals every scrub tick is the
// expensive part. The positions update every tick (cheap, the rim just lags slightly),
// but normals recompute only on a trailing debounce window (the scrub coming briefly
// to rest) and on an explicit end(). So a fast drag recomputes normals at most once per
// quiet window rather than per tick, keeping the rim roughly correct without per-tick
// cost. The debounce timer is injected so the throttle is unit testable.
//
// Pure with respect to react and the GPU: the position sampler, the buffer writer, the
// normal recompute and the debounce timer are injected, so the direct-set and throttle
// control flow are testable with no GPU.

import type { BodyParamVector } from '@/lib/formavision/geometry/types';

// Debounce-timer seam: setTimeout / clearTimeout in production, fake-driven in tests.
export interface ScrubTimer {
  set(cb: () => void, ms: number): number;
  clear(handle: number): void;
}

export interface ScrubControllerOptions {
  // Sample the non-indexed position array for a param vector. Reuses the morph
  // sampler so scrub and morph produce identical fixed-topology buffers.
  samplePositions: (vec: BodyParamVector) => Float32Array;
  // Write the positions into the live geometry buffer and flag it for upload.
  writePositions: (positions: Float32Array) => void;
  // Recompute vertex normals on the live geometry. Throttled, not per tick.
  recomputeNormals: () => void;
  timer: ScrubTimer;
  // Quiet window after the last scrub change before normals are recomputed.
  normalsDebounceMs?: number;
}

const DEFAULT_NORMALS_DEBOUNCE_MS = 90;

export interface ScrubController {
  // Set the body to a scrub shape directly (no tween). Call on every scrub change.
  scrubTo(vec: BodyParamVector): void;
  // The scrub gesture ended: recompute normals now so the rim is correct at rest.
  end(): void;
  // Stop the pending normal recompute (used on unmount). Does not change positions.
  cancel(): void;
  // The last scrub vector written, so the caller can resume morph from it (no jump).
  lastVector(): BodyParamVector | null;
}

export function createScrubController(
  options: ScrubControllerOptions,
): ScrubController {
  const { samplePositions, writePositions, recomputeNormals, timer } = options;
  const debounceMs = options.normalsDebounceMs ?? DEFAULT_NORMALS_DEBOUNCE_MS;

  // Reused scratch is unnecessary here: samplePositions returns a fresh array per
  // call and writePositions copies it into the live buffer. No per-tick allocation
  // beyond the sample itself, and no geometry is built or disposed.
  let last: BodyParamVector | null = null;
  let timerHandle: number | null = null;

  function clearTimer(): void {
    if (timerHandle !== null) {
      timer.clear(timerHandle);
      timerHandle = null;
    }
  }

  function scrubTo(vec: BodyParamVector): void {
    last = vec;
    // Direct set: write the exact interpolated shape now, no tween, no runner.
    writePositions(samplePositions(vec));
    // Throttle the normal recompute: restart the quiet window each change so a burst
    // of scrub updates recomputes normals at most once, when the drag pauses.
    clearTimer();
    timerHandle = timer.set(() => {
      timerHandle = null;
      recomputeNormals();
    }, debounceMs);
  }

  function end(): void {
    // The gesture is over: recompute normals now so the rim settles correct.
    clearTimer();
    recomputeNormals();
  }

  function cancel(): void {
    clearTimer();
  }

  return {
    scrubTo,
    end,
    cancel,
    lastVector: () => last,
  };
}
