// Emphasis-particle controller for the FormaVision avatar (Prompt 210b, P2-T5).
//
// A sparing, tasteful orange accent that fires once at a region to mark a peak change
// or win (orange is the sanctioned emphasis token, used only here). When an emphasis
// region is set the controller plays a single burst via the P2-T1 runner: a 0..1
// progress that the render layer turns into particles rising and fading, then it
// disposes the particle geometry and material. Unset means nothing fires. Reduced
// motion shows a single static accent (one setBurst at full, optionally) and schedules
// zero frames.
//
// Pure with respect to react, three and the GPU: the per-frame burst setter and the
// dispose are injected, so the fire-once-then-dispose and reduced-motion control flow
// are unit testable with no particle system.

import { createDemandAnimation, type DemandAnimation, type FrameScheduler } from './demandAnimation';
import { easeOutCubic } from './easing';

export interface EmphasisParticleControllerOptions {
  // Drive the burst 0..1 (0 at ignition, 1 fully risen and faded). The render layer
  // maps this onto particle position and opacity.
  setBurst: (progress: number) => void;
  // Dispose the particle geometry and material. Called once the burst completes and
  // on cancel, so a burst never leaks.
  dispose: () => void;
  scheduler: FrameScheduler;
  // Burst length. A brief accent, not a lingering effect.
  durationMs?: number;
  reducedMotion?: boolean;
}

const DEFAULT_DURATION_MS = 700;

export interface EmphasisParticleController {
  // Fire the one-shot burst. Under reduced motion shows a single static accent and
  // schedules nothing.
  fire(): void;
  // Stop the burst and dispose (used on unmount or when the emphasis clears).
  cancel(): void;
  isFiring(): boolean;
}

export function createEmphasisParticleController(
  options: EmphasisParticleControllerOptions,
): EmphasisParticleController {
  const { setBurst, scheduler } = options;

  let animation: DemandAnimation | null = null;
  let disposed = false;

  function stopAnimation(): void {
    if (animation) {
      animation.cancel();
      animation = null;
    }
  }

  function fire(): void {
    if (disposed) {
      return;
    }

    // Reduced-motion parity: a single static accent, no frames, then dispose so no
    // animated particles ever run.
    if (options.reducedMotion) {
      stopAnimation();
      setBurst(1);
      disposed = true;
      options.dispose();
      return;
    }

    stopAnimation();
    setBurst(0);

    animation = createDemandAnimation({
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      easing: easeOutCubic,
      scheduler,
      onUpdate: (p) => {
        setBurst(p);
      },
      onComplete: () => {
        animation = null;
        // The burst is spent: dispose the particle resources once it finishes.
        if (!disposed) {
          disposed = true;
          options.dispose();
        }
      },
    });
    animation.start();
  }

  function cancel(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    stopAnimation();
    options.dispose();
  }

  return {
    fire,
    cancel,
    isFiring: () => animation !== null && animation.isRunning(),
  };
}
