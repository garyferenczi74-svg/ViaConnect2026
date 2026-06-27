// Staggered ease-in controller for the FormaVision measurement callouts (Prompt
// 210b, OV-T4). This also lands the P2-T5-deferred callout stagger.
//
// On entering the Measurements tab the callouts fade and scale in one shortly after
// the previous (a stagger), driven by a single P2-T1 demand runner: the runner sweeps
// a linear global timeline and each callout derives its own eased local progress from
// where it sits in the stagger, so one runner animates the whole set and stops when
// done. Reduced motion sets every callout to its final state at once with zero frames.
// Leaving the tab disposes and schedules nothing.
//
// Pure with respect to react and the GPU: the per-callout progress setter and the
// scheduler are injected, so the stagger and reduced-motion control flow are unit
// testable with no DOM.

import { createDemandAnimation, type DemandAnimation, type FrameScheduler } from './demandAnimation';
import { easeOutCubic, linear } from './easing';

export interface CalloutStaggerControllerOptions {
  // How many callouts to stagger in.
  count: number;
  // Set callout i's ease-in progress 0..1. The render layer maps this to opacity and
  // a small scale so each callout fades and scales in.
  setProgress: (index: number, progress: number) => void;
  scheduler: FrameScheduler;
  // Each callout's own fade-in length.
  perCalloutMs?: number;
  // Delay between successive callouts starting.
  staggerMs?: number;
  reducedMotion?: boolean;
}

const DEFAULT_PER_CALLOUT_MS = 260;
const DEFAULT_STAGGER_MS = 70;

export interface CalloutStaggerController {
  // Play the staggered ease-in.
  enter(): void;
  // Stop any running stagger (used on tab change and unmount).
  cancel(): void;
  isRunning(): boolean;
}

export function createCalloutStaggerController(
  options: CalloutStaggerControllerOptions,
): CalloutStaggerController {
  const { setProgress, scheduler } = options;
  const count = Math.max(0, Math.floor(options.count));
  const perCallout = options.perCalloutMs ?? DEFAULT_PER_CALLOUT_MS;
  const stagger = options.staggerMs ?? DEFAULT_STAGGER_MS;

  let animation: DemandAnimation | null = null;

  function stopAnimation(): void {
    if (animation) {
      animation.cancel();
      animation = null;
    }
  }

  function setAll(progress: number): void {
    for (let i = 0; i < count; i += 1) {
      setProgress(i, progress);
    }
  }

  function enter(): void {
    stopAnimation();
    if (count === 0) {
      return;
    }

    // Reduced-motion parity: every callout at its final state at once, no frames.
    if (options.reducedMotion) {
      setAll(1);
      return;
    }

    // Total timeline: the last callout starts at (count - 1) * stagger and then needs
    // its own perCallout to finish. The runner sweeps this span linearly and each
    // callout eases its own local slice.
    const totalMs = (count - 1) * stagger + perCallout;

    // Start every callout hidden so the entrance reads as a fade-in.
    setAll(0);

    animation = createDemandAnimation({
      durationMs: totalMs,
      easing: linear,
      scheduler,
      onUpdate: (globalP) => {
        const elapsed = globalP * totalMs;
        for (let i = 0; i < count; i += 1) {
          const localElapsed = elapsed - i * stagger;
          const localFraction = Math.min(Math.max(localElapsed / perCallout, 0), 1);
          setProgress(i, easeOutCubic(localFraction));
        }
      },
      onComplete: () => {
        setAll(1);
        animation = null;
      },
    });
    animation.start();
  }

  function cancel(): void {
    stopAnimation();
  }

  return {
    enter,
    cancel,
    isRunning: () => animation !== null && animation.isRunning(),
  };
}
