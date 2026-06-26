// The materialize intro controller for the FormaVision avatar (Prompt 210b, P2-T1).
//
// On first mount the avatar plays a one-shot capture: a scan-line band sweeps once
// from feet (0) to head (1), the body reveals in the band's wake (uMorph follows
// the sweep), and the wireframe ignites behind it (line intensity and fill ramp
// from near zero up to their steady values). Under two seconds, skippable, and a
// strict no-op under reduced motion.
//
// This controller is pure with respect to react and the GPU. It talks to the
// material only through a tiny IntroTarget setter surface and drives time through
// the injected demand-animation runner, so the whole choreography is unit testable
// without a Canvas: tests assert the exact uniform values written on the reduced
// motion path, on a normal run, and on an early skip.
//
// Steady state (the values the material rests at after the intro, taken from the
// material defaults) is captured up front so the intro always lands the body in
// its real lit state regardless of how it ended (natural finish or skip).

import { createDemandAnimation, type DemandAnimation, type FrameScheduler } from './demandAnimation';
import { easeInOutCubic, easeOutCubic } from './easing';

// The minimal slice of the material the intro writes. The real material handle
// satisfies this structurally (setScan / setMorph plus a uniform bag). The uniform
// bag is typed as an index map of numeric-value uniforms so the material's
// Record<string, THREE.IUniform> assigns to it directly; the two keys the intro
// touches (uLineIntensity, uFillOpacity) are present on the real material.
export interface IntroTarget {
  setScan(yN: number): void;
  setMorph(t: number): void;
  uniforms: Record<string, { value: number }>;
}

export interface MaterializeIntroOptions {
  target: IntroTarget;
  scheduler: FrameScheduler;
  // Total intro length. Kept under 2000 by the caller; defaulted conservatively.
  durationMs?: number;
  // When true the avatar appears fully lit at once with no sweep and no scheduled
  // frames. This is the reduced-motion full-parity path.
  reducedMotion?: boolean;
  // Called when the intro reaches its final steady state (finish or skip). Lets the
  // r3f layer stop requesting frames.
  onComplete?: () => void;
}

const DEFAULT_DURATION_MS = 1600;

// Where the wireframe starts before the band passes: dim, not invisible, so the
// silhouette is faintly present and then ignites rather than popping from black.
const LINE_START = 0.05;
const FILL_START = 0.05;

// Hide the scan band by parking it below the body (the shader treats anything
// outside 0..1 as no band). This is the steady "band off" state.
const SCAN_HIDDEN = -1;

export interface MaterializeIntro {
  start(): void;
  // Jump immediately to the final lit steady state.
  skip(): void;
  // Stop without forcing the final state (used on unmount mid-intro).
  cancel(): void;
  isFinished(): boolean;
}

// Write the resting lit state: band hidden, fully revealed, full line and fill.
function applySteadyState(target: IntroTarget, lineSteady: number, fillSteady: number): void {
  target.setScan(SCAN_HIDDEN);
  target.setMorph(1);
  target.uniforms.uLineIntensity.value = lineSteady;
  target.uniforms.uFillOpacity.value = fillSteady;
}

export function createMaterializeIntro(
  options: MaterializeIntroOptions,
): MaterializeIntro {
  const { target, scheduler } = options;

  // Capture the material's real steady values as the ignite targets so the body
  // always lands exactly where the material rests, not at hardcoded numbers.
  const lineSteady = target.uniforms.uLineIntensity.value;
  const fillSteady = target.uniforms.uFillOpacity.value;

  let finished = false;
  let animation: DemandAnimation | null = null;

  function complete(): void {
    if (finished) {
      return;
    }
    finished = true;
    applySteadyState(target, lineSteady, fillSteady);
    if (options.onComplete) {
      options.onComplete();
    }
  }

  function start(): void {
    if (finished || animation) {
      return;
    }

    // Reduced-motion parity: land lit immediately, schedule nothing at all.
    if (options.reducedMotion) {
      complete();
      return;
    }

    // Prime the pre-ignite look so the first frame is the dim silhouette with the
    // band at the feet, not a flash of the finished body.
    target.setScan(0);
    target.setMorph(0);
    target.uniforms.uLineIntensity.value = LINE_START;
    target.uniforms.uFillOpacity.value = FILL_START;

    animation = createDemandAnimation({
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      easing: easeInOutCubic,
      scheduler,
      onUpdate: (p) => {
        // The band sweeps feet to head on the eased progress.
        target.setScan(p);
        // The body reveals in the band's wake; uMorph tracks the sweep so the form
        // gates in from the bottom up exactly where the band has passed.
        target.setMorph(p);
        // The wireframe ignites behind the band, decelerating into its steady
        // value so the lines settle rather than snapping bright.
        const ignite = easeOutCubic(p);
        target.uniforms.uLineIntensity.value =
          LINE_START + (lineSteady - LINE_START) * ignite;
        target.uniforms.uFillOpacity.value =
          FILL_START + (fillSteady - FILL_START) * ignite;
      },
      onComplete: complete,
    });
    animation.start();
  }

  function skip(): void {
    if (finished) {
      return;
    }
    // If a run is in flight, completing it routes through onComplete -> complete.
    // If start() never ran, force the steady state directly.
    if (animation) {
      animation.complete();
    } else {
      complete();
    }
  }

  function cancel(): void {
    if (finished) {
      return;
    }
    finished = true;
    if (animation) {
      animation.cancel();
    }
  }

  return {
    start,
    skip,
    cancel,
    isFinished: () => finished,
  };
}
