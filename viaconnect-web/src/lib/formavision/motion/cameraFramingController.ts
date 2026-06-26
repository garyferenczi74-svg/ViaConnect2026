// Eased camera-framing controller for the FormaVision avatar (Prompt 210b, P2-T3).
//
// When a body part is selected this eases the camera's orbit target height and its
// distance from that target to the region's framing (regionFraming.ts); clearing the
// selection eases back to the full-body default. It reuses the P2-T1 demand runner
// (easeInOutCubic, ~0.6s) so the move is demand-driven, cancelable and stops cleanly
// with no permanent loop. Reduced motion jumps to the framing instantly with no tween.
//
// Pure with respect to react, three and the GPU: the current framing read and the
// per-frame apply are injected as plain callbacks, so the control flow (a selection
// change schedules a tween; clearing returns to default; reduced motion sets the
// framing immediately) is unit testable with no camera.

import { createDemandAnimation, type DemandAnimation, type FrameScheduler } from './demandAnimation';
import { easeInOutCubic } from './easing';
import { framingForRegion, type CameraFraming } from './regionFraming';

export interface CameraFramingControllerOptions {
  // Read the framing the camera shows right now, so a tween starts from the live
  // pose (including any drag the user just did) rather than a stale value.
  readFraming: () => CameraFraming;
  // Apply a framing to the camera (set the orbit target height and the distance).
  applyFraming: (framing: CameraFraming) => void;
  scheduler: FrameScheduler;
  // Tween length. The framing move reads best around 0.5 to 0.8s.
  durationMs?: number;
  reducedMotion?: boolean;
}

const DEFAULT_DURATION_MS = 650;

function lerpFraming(from: CameraFraming, to: CameraFraming, t: number): CameraFraming {
  return {
    targetY: from.targetY + (to.targetY - from.targetY) * t,
    distance: from.distance + (to.distance - from.distance) * t,
  };
}

export interface CameraFramingController {
  // Ease the camera to frame the given region; null returns to the full-body view.
  frameRegion(region: string | null | undefined): void;
  // Stop any running framing tween (used on unmount). No final apply.
  cancel(): void;
  isFraming(): boolean;
}

export function createCameraFramingController(
  options: CameraFramingControllerOptions,
): CameraFramingController {
  const { readFraming, applyFraming, scheduler } = options;

  let animation: DemandAnimation | null = null;

  function stopAnimation(): void {
    if (animation) {
      animation.cancel();
      animation = null;
    }
  }

  function frameRegion(region: string | null | undefined): void {
    const to = framingForRegion(region);

    // Reduced-motion parity: jump to the framing now, schedule nothing.
    if (options.reducedMotion) {
      stopAnimation();
      applyFraming(to);
      return;
    }

    // Start from the live pose so a tween already in flight (or a fresh drag) hands
    // off smoothly rather than snapping.
    stopAnimation();
    const from = readFraming();

    animation = createDemandAnimation({
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      easing: easeInOutCubic,
      scheduler,
      onUpdate: (p) => {
        applyFraming(lerpFraming(from, to, p));
      },
      onComplete: () => {
        applyFraming(to);
        animation = null;
      },
    });
    animation.start();
  }

  function cancel(): void {
    stopAnimation();
  }

  return {
    frameRegion,
    cancel,
    isFraming: () => animation !== null && animation.isRunning(),
  };
}
