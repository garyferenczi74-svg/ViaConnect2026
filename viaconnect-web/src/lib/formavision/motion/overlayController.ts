// Per-segment overlay cross-fade controller for the FormaVision avatar (Prompt 210b,
// OV-T1).
//
// When the Body Fat or Muscle tab is active and per-segment status colors are given,
// the wireframe lines tint by region. This controller sets the per-segment tints on
// the material and ramps the overlay mix from 0 to 1 (fade in) or back to 0 (fade
// out) via the P2-T1 runner, so toggling tabs cross-fades the tint rather than
// snapping. Reduced motion sets the mix instantly with no frames. The status colors
// are computed elsewhere (OV-T2/T3 from the heatmap helpers) and passed in; this
// controller never invents a color and treats a missing segment as neutral by simply
// forwarding what it is given to the material, whose setter neutralizes nulls.
//
// Pure with respect to react, three and the GPU: the tint setter, the mix setter and
// the scheduler are injected, so the show/hide and reduced-motion control flow is
// unit testable with no material.

import { createDemandAnimation, type DemandAnimation, type FrameScheduler } from './demandAnimation';
import { easeInOutCubic } from './easing';

export interface OverlayControllerOptions {
  // Apply the 5 per-segment tints to the material (SEGMENT_INDEX order). A later task
  // computes these; null entries are neutralized by the material setter.
  setTints: (colors: (import('three').Color | null)[]) => void;
  // Set the overlay cross-fade amount 0..1 on the material.
  setOverlayMix: (mix: number) => void;
  scheduler: FrameScheduler;
  // Cross-fade length.
  durationMs?: number;
  reducedMotion?: boolean;
}

const DEFAULT_DURATION_MS = 380;

export interface OverlayController {
  // Show the overlay with the given per-segment tints (fade the mix to 1).
  show(colors: (import('three').Color | null)[]): void;
  // Hide the overlay (fade the mix to 0). Tints are left in place; mix 0 hides them.
  hide(): void;
  // Stop any running cross-fade (used on unmount).
  cancel(): void;
  isFading(): boolean;
}

export function createOverlayController(
  options: OverlayControllerOptions,
): OverlayController {
  const { setTints, setOverlayMix, scheduler } = options;

  let animation: DemandAnimation | null = null;
  // The mix the last completed or in-flight fade is targeting, so a repeated show or
  // hide does not restart an identical fade.
  let currentTarget = 0;

  function stopAnimation(): void {
    if (animation) {
      animation.cancel();
      animation = null;
    }
  }

  function fadeTo(target: number, from: number): void {
    stopAnimation();

    if (options.reducedMotion) {
      setOverlayMix(target);
      return;
    }

    animation = createDemandAnimation({
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      easing: easeInOutCubic,
      scheduler,
      onUpdate: (p) => {
        setOverlayMix(from + (target - from) * p);
      },
      onComplete: () => {
        setOverlayMix(target);
        animation = null;
      },
    });
    animation.start();
  }

  function show(colors: (import('three').Color | null)[]): void {
    // Always apply the latest tints, even if already shown, so a tab that changes its
    // colors updates without a re-fade.
    setTints(colors);
    if (currentTarget === 1 && !animation) {
      return;
    }
    currentTarget = 1;
    fadeTo(1, 0);
  }

  function hide(): void {
    if (currentTarget === 0 && !animation) {
      return;
    }
    currentTarget = 0;
    fadeTo(0, 1);
  }

  function cancel(): void {
    stopAnimation();
  }

  return {
    show,
    hide,
    cancel,
    isFading: () => animation !== null && animation.isRunning(),
  };
}
