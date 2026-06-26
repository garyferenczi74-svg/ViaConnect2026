// Idle turntable controller for the FormaVision avatar (Prompt 210b, P2-T3).
//
// After a short idle with no interaction the camera begins a slow auto-azimuth
// rotation, a tasteful turntable that lets the body read in the round. Any
// interaction (drag, select) pauses it and restarts the idle countdown, and it is
// suspended entirely while the materialize intro or a morph runs. It is disabled
// outright under reduced motion: it schedules nothing at all, ever.
//
// It respects frameloop="demand": while rotating it advances the azimuth a little
// each frame and asks for the next frame through the injected scheduler; when paused,
// suspended or disposed it stops scheduling, so no continuous render loop is left
// running. Time, frame scheduling and the idle delay are all injected (a Timer seam
// plus the shared FrameScheduler), so the start-after-idle, pause-on-interaction and
// reduced-motion branches are unit testable with no camera and no real clock.

import type { FrameScheduler } from './demandAnimation';

// Idle-delay seam: setTimeout / clearTimeout in production, fake-driven in tests.
export interface IdleTimer {
  set(cb: () => void, ms: number): number;
  clear(handle: number): void;
}

export interface IdleTurntableOptions {
  scheduler: FrameScheduler;
  timer: IdleTimer;
  // Apply a small azimuth delta (radians) to the camera this frame.
  advanceAzimuth: (deltaRad: number) => void;
  // Idle wait before the turntable starts spinning.
  idleDelayMs?: number;
  // Rotation speed in radians per second. Kept slow and subtle.
  speedRadPerSec?: number;
  reducedMotion?: boolean;
}

const DEFAULT_IDLE_DELAY_MS = 2500;
// Roughly one revolution per 30 seconds: slow, not a spinning gimmick.
const DEFAULT_SPEED_RAD_PER_SEC = (Math.PI * 2) / 30;

export interface IdleTurntable {
  // Call once after the avatar is ready to begin the first idle countdown.
  begin(): void;
  // Any user interaction: pause rotation and restart the idle countdown.
  notifyInteraction(): void;
  // Gate for the intro and morph: while suspended the turntable never rotates and
  // never counts down. Releasing it restarts the idle countdown.
  setSuspended(suspended: boolean): void;
  // Stop everything and release timers/frames (used on unmount).
  dispose(): void;
}

export function createIdleTurntable(options: IdleTurntableOptions): IdleTurntable {
  const { scheduler, timer, advanceAzimuth } = options;
  const idleDelay = options.idleDelayMs ?? DEFAULT_IDLE_DELAY_MS;
  const speed = options.speedRadPerSec ?? DEFAULT_SPEED_RAD_PER_SEC;

  let disposed = false;
  let suspended = false;
  let rotating = false;
  let timerHandle: number | null = null;
  let frameHandle: number | null = null;
  let lastFrameTime = 0;

  function clearTimer(): void {
    if (timerHandle !== null) {
      timer.clear(timerHandle);
      timerHandle = null;
    }
  }

  function stopRotation(): void {
    rotating = false;
    if (frameHandle !== null) {
      scheduler.cancel(frameHandle);
      frameHandle = null;
    }
  }

  function rotateFrame(time: number): void {
    frameHandle = null;
    if (!rotating || disposed || suspended) {
      return;
    }
    const dt = Math.max(0, (time - lastFrameTime) / 1000);
    lastFrameTime = time;
    advanceAzimuth(speed * dt);
    // Keep spinning: ask for the next frame. The scheduler pairs this with the
    // demand-loop invalidate in the r3f binding.
    frameHandle = scheduler.schedule(rotateFrame);
  }

  function startRotation(): void {
    if (rotating || disposed || suspended || options.reducedMotion) {
      return;
    }
    rotating = true;
    lastFrameTime = scheduler.now();
    frameHandle = scheduler.schedule(rotateFrame);
  }

  function armIdle(): void {
    clearTimer();
    if (disposed || suspended || options.reducedMotion) {
      return;
    }
    timerHandle = timer.set(() => {
      timerHandle = null;
      startRotation();
    }, idleDelay);
  }

  function begin(): void {
    if (disposed || options.reducedMotion) {
      return;
    }
    armIdle();
  }

  function notifyInteraction(): void {
    if (disposed || options.reducedMotion) {
      return;
    }
    stopRotation();
    armIdle();
  }

  function setSuspended(next: boolean): void {
    if (disposed || options.reducedMotion) {
      return;
    }
    suspended = next;
    if (suspended) {
      stopRotation();
      clearTimer();
    } else {
      armIdle();
    }
  }

  function dispose(): void {
    disposed = true;
    stopRotation();
    clearTimer();
  }

  return { begin, notifyInteraction, setSuspended, dispose };
}
