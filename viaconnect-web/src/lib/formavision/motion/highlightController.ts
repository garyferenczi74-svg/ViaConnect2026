// Selected-region highlight controller for the FormaVision avatar (Prompt 210b, P2-T5).
//
// When a region is selected the wireframe gently brightens around that region's
// level via the material highlight uniform (uHighlightY + uHighlightIntensity). The
// region level comes from the SAME source the ring and camera use (ringLoopForRegion),
// passed in as resolveLevel so this controller never redefines a second levels map.
// On selection it pulses the intensity from a brief peak down to a steady value via
// the P2-T1 runner, then holds; clearing the selection resets the uniform (off).
// Reduced motion applies the steady highlight statically with no animation scheduled.
//
// Pure with respect to react, three and the GPU: the uniform setter and the level
// resolver are injected, so the select/clear/reduced-motion control flow is unit
// testable with no material.

import { createDemandAnimation, type DemandAnimation, type FrameScheduler } from './demandAnimation';
import { easeOutCubic } from './easing';

export interface HighlightControllerOptions {
  // Set the highlight band: normalized level yN (outside 0..1 clears it) and the
  // brightening intensity. The material maps this onto the wireframe.
  setHighlight: (yN: number, intensity: number) => void;
  // Resolve a region id to its normalized level (0..1), or null when unknown. This
  // wraps ringLoopForRegion so the highlight, ring and camera agree on the level.
  resolveLevel: (region: string) => number | null;
  scheduler: FrameScheduler;
  // The held brightening once the pulse settles. Kept subtle, not flashy.
  steadyIntensity?: number;
  // The brief peak the pulse starts from before easing down to steady.
  pulsePeak?: number;
  pulseDurationMs?: number;
  reducedMotion?: boolean;
}

const DEFAULT_STEADY_INTENSITY = 0.35;
const DEFAULT_PULSE_PEAK = 0.7;
const DEFAULT_PULSE_DURATION_MS = 420;

// Off state: park the level below the body so the shader contributes no highlight.
const HIGHLIGHT_OFF_Y = -1;

export interface HighlightController {
  // Highlight the given region, or clear the highlight when null.
  highlightRegion(region: string | null | undefined): void;
  // Stop any pulse (used on unmount); leaves the current uniform value in place.
  cancel(): void;
  isPulsing(): boolean;
}

export function createHighlightController(
  options: HighlightControllerOptions,
): HighlightController {
  const { setHighlight, resolveLevel, scheduler } = options;
  const steady = options.steadyIntensity ?? DEFAULT_STEADY_INTENSITY;
  const peak = options.pulsePeak ?? DEFAULT_PULSE_PEAK;

  let animation: DemandAnimation | null = null;

  function stopAnimation(): void {
    if (animation) {
      animation.cancel();
      animation = null;
    }
  }

  function highlightRegion(region: string | null | undefined): void {
    stopAnimation();

    if (!region) {
      // Clear the highlight entirely.
      setHighlight(HIGHLIGHT_OFF_Y, 0);
      return;
    }

    const level = resolveLevel(region);
    if (level === null) {
      // Unknown region: clear rather than highlight a wrong place.
      setHighlight(HIGHLIGHT_OFF_Y, 0);
      return;
    }

    // Reduced-motion parity: apply the steady highlight at once, schedule nothing.
    if (options.reducedMotion) {
      setHighlight(level, steady);
      return;
    }

    // Pulse the intensity from the peak down to the steady hold so the selection
    // reads as a gentle flash that settles, not a hard switch.
    animation = createDemandAnimation({
      durationMs: options.pulseDurationMs ?? DEFAULT_PULSE_DURATION_MS,
      easing: easeOutCubic,
      scheduler,
      onUpdate: (p) => {
        const intensity = peak + (steady - peak) * p;
        setHighlight(level, intensity);
      },
      onComplete: () => {
        setHighlight(level, steady);
        animation = null;
      },
    });
    animation.start();
  }

  function cancel(): void {
    stopAnimation();
  }

  return {
    highlightRegion,
    cancel,
    isPulsing: () => animation !== null && animation.isRunning(),
  };
}
