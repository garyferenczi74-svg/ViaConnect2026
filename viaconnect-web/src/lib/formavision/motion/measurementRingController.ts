// Draw-on controller for the FormaVision measurement ring (Prompt 210b, P2-T4b).
//
// When a measured region is selected the ring sweeps on (its drawn arc grows from 0
// to the full loop) while the value counts up to the real measurement, then a soft
// pulse settles it. This drives both the arc fraction and the count-up fraction off
// the single P2-T1 demand runner (easeOutCubic, ~0.5s) so they stay in lockstep and
// stop cleanly with no permanent loop. Reduced motion shows the full ring and the
// final value instantly with no frames scheduled. Deselecting disposes the ring and
// schedules nothing.
//
// Pure with respect to react, three and the GPU: the arc setter, the value setter and
// the pulse are injected callbacks, so the control flow (selection schedules a sweep
// plus count-up; reduced motion lands instantly; deselect disposes) is unit testable
// without a GPU. The arc fraction is what the render layer turns into a partial loop;
// the value fraction scales 0..1 and the caller multiplies by the real target so an
// estimated region (no numeric target) simply shows its marker with no count-up.

import { createDemandAnimation, type DemandAnimation, type FrameScheduler } from './demandAnimation';
import { easeOutCubic } from './easing';

export interface MeasurementRingControllerOptions {
  // Set the drawn arc fraction 0..1 (0 nothing, 1 the full loop).
  setArc: (fraction: number) => void;
  // Set the count-up fraction 0..1; the caller maps it onto the real value. Null
  // target regions (estimated) still call this with 1 at the end so the label settles.
  setValueFraction: (fraction: number) => void;
  // Optional soft settle pulse, called once when the sweep completes.
  pulse?: () => void;
  // Dispose the ring's geometry and material. Called on deselect and on cancel so the
  // controller never leaks a ring.
  dispose: () => void;
  scheduler: FrameScheduler;
  // Sweep length. The draw-on reads best around 0.5s.
  durationMs?: number;
  reducedMotion?: boolean;
}

const DEFAULT_DURATION_MS = 520;

export interface MeasurementRingController {
  // Play the draw-on sweep and count-up. Under reduced motion lands fully drawn now.
  draw(): void;
  // Tear the ring down: stop any sweep and dispose the geometry/material.
  deselect(): void;
  isDrawing(): boolean;
}

export function createMeasurementRingController(
  options: MeasurementRingControllerOptions,
): MeasurementRingController {
  const { setArc, setValueFraction, scheduler } = options;

  let animation: DemandAnimation | null = null;
  let disposed = false;

  function stopAnimation(): void {
    if (animation) {
      animation.cancel();
      animation = null;
    }
  }

  function settle(): void {
    setArc(1);
    setValueFraction(1);
    if (options.pulse) {
      options.pulse();
    }
  }

  function draw(): void {
    if (disposed) {
      return;
    }

    // Reduced-motion parity: full ring and final value at once, schedule nothing.
    if (options.reducedMotion) {
      stopAnimation();
      setArc(1);
      setValueFraction(1);
      return;
    }

    stopAnimation();
    // Start from nothing drawn so the sweep grows in rather than popping.
    setArc(0);
    setValueFraction(0);

    animation = createDemandAnimation({
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      easing: easeOutCubic,
      scheduler,
      onUpdate: (p) => {
        setArc(p);
        setValueFraction(p);
      },
      onComplete: () => {
        animation = null;
        settle();
      },
    });
    animation.start();
  }

  function deselect(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    stopAnimation();
    options.dispose();
  }

  return {
    draw,
    deselect,
    isDrawing: () => animation !== null && animation.isRunning(),
  };
}
