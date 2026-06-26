// Framework light demand-driven animation runner (Prompt 210b, P2-T1).
//
// This is the reusable motion primitive the Phase 2 tasks (morph, camera, ring
// draw-on, micro-interactions) build on. It advances a normalized progress 0..1
// over a duration with an easing, calling onUpdate each frame and onComplete once
// at the end, then stops. It never loops after completion, so it fits the r3f
// frameloop="demand" model: while running it asks for frames, when done it goes
// quiet.
//
// It is deliberately free of react-three-fiber and the DOM. Time and scheduling
// are injected (now + schedule + cancel), so the node test runner drives it with
// fake timers and no GPU, while the r3f hook layer (useDemandAnimation) injects
// performance.now and requestAnimationFrame paired with invalidate(). This keeps
// every branch of the runner unit testable.
//
// Contract:
//  - start() schedules frames; each frame computes fraction = elapsed / duration,
//    eases it, and calls onUpdate(eased). At fraction >= 1 it calls onUpdate(1)
//    once, then onComplete(), then stops.
//  - complete() (alias skip()) jumps straight to onUpdate(1) + onComplete() and
//    stops, cancelling any pending frame. Safe to call before or during the run.
//  - cancel() stops the run with no further onUpdate / onComplete.
//  - immediate mode (reduced motion) lands at the final state synchronously on
//    start(): onUpdate(1) then onComplete(), and schedules nothing at all.
//  - every terminal path runs exactly once; a finished or cancelled runner is inert.

import { easeInOutCubic, type EasingFn } from './easing';

// Injected scheduler seam. In production this is rAF; in tests it is a fake-timer
// driven step. The callback receives the current time in milliseconds.
export interface FrameScheduler {
  now(): number;
  // Schedule the next frame callback and return a handle for cancellation.
  schedule(cb: (time: number) => void): number;
  cancel(handle: number): void;
}

export interface DemandAnimationOptions {
  durationMs: number;
  easing?: EasingFn;
  // Called every frame with the eased progress 0..1, and once with exactly 1 at
  // the end. This is where the caller writes its lerped uniform values.
  onUpdate: (eased: number) => void;
  // Called exactly once after the final onUpdate(1), on natural finish, skip, or
  // complete. Not called on cancel.
  onComplete?: () => void;
  // When true the runner lands at the final state synchronously on start and
  // schedules no frames. This is the reduced-motion full-parity path.
  immediate?: boolean;
  scheduler: FrameScheduler;
}

export interface DemandAnimation {
  start(): void;
  // Jump to the final state and finish now. skip is an alias for complete.
  complete(): void;
  skip(): void;
  // Stop with no final update and no onComplete.
  cancel(): void;
  isRunning(): boolean;
  isFinished(): boolean;
}

export function createDemandAnimation(
  options: DemandAnimationOptions,
): DemandAnimation {
  const easing = options.easing ?? easeInOutCubic;
  const duration = Math.max(options.durationMs, 0);

  let running = false;
  let finished = false;
  let startTime = 0;
  let frameHandle: number | null = null;

  function clearPending(): void {
    if (frameHandle !== null) {
      options.scheduler.cancel(frameHandle);
      frameHandle = null;
    }
  }

  // Run the single shared terminal path: final update at progress 1, then the
  // completion callback, exactly once.
  function finish(): void {
    if (finished) {
      return;
    }
    finished = true;
    running = false;
    clearPending();
    options.onUpdate(1);
    if (options.onComplete) {
      options.onComplete();
    }
  }

  function tick(time: number): void {
    if (!running || finished) {
      return;
    }
    frameHandle = null;
    const elapsed = time - startTime;
    // A zero duration finishes on the first frame; otherwise advance the fraction.
    const fraction = duration === 0 ? 1 : elapsed / duration;
    if (fraction >= 1) {
      finish();
      return;
    }
    options.onUpdate(easing(fraction));
    frameHandle = options.scheduler.schedule(tick);
  }

  function start(): void {
    if (running || finished) {
      return;
    }
    // Reduced-motion parity: land at the final lit state now, schedule nothing.
    if (options.immediate) {
      finish();
      return;
    }
    running = true;
    startTime = options.scheduler.now();
    // Emit the eased value at fraction 0 so the first painted frame is the start
    // of the curve rather than a jump from the prior steady state.
    options.onUpdate(easing(0));
    frameHandle = options.scheduler.schedule(tick);
  }

  function complete(): void {
    if (finished) {
      return;
    }
    // Allow completing a run that was never started (jump straight to the end).
    running = true;
    finish();
  }

  function cancel(): void {
    if (finished) {
      return;
    }
    running = false;
    finished = true;
    clearPending();
  }

  return {
    start,
    complete,
    skip: complete,
    cancel,
    isRunning: () => running && !finished,
    isFinished: () => finished,
  };
}
