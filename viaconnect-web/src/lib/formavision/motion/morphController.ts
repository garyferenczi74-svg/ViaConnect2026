// The live morph controller for the FormaVision avatar (Prompt 210b, P2-T2b).
//
// When the target body shape changes, this tweens the persistent geometry from its
// current param vector to the new one over an eased duration by lerping the position
// attribute every frame, rather than snapping or rebuilding the mesh. It reuses the
// P2-T1 demand-animation runner for the tween (cancelable, reduced-motion aware,
// demand-driven) and easeInOutCubic so the morph is legible.
//
// It is pure with respect to react, three and the GPU: the position sampling, the
// per-frame write, and the normal recompute are injected as plain callbacks, so the
// whole control flow (a target change schedules a tween; reduced motion snaps with
// no tween; cancel stops and the caller disposes; the intro never re-fires because
// this controller never touches the intro) is unit testable in the node runner.
//
// Performance contract: the from and to position arrays are sampled ONCE per target
// change, then every animation frame lerps them into a single reused scratch buffer
// and writes that into the one persistent geometry. No BufferGeometry is built or
// disposed per frame. Vertex normals are recomputed at the end of the tween (and on
// the reduced-motion snap) so the fresnel rim stays correct at rest; a mid-tween
// normal recompute is intentionally skipped to keep each frame cheap, the rim simply
// catches up when the body settles.

import { createDemandAnimation, type DemandAnimation, type FrameScheduler } from './demandAnimation';
import { easeInOutCubic } from './easing';
import { assertSameTopology, lerpPositionsInto } from './morphPositions';
import { lerpParamVector } from '@/lib/formavision/geometry/lerpParamVector';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

export interface MorphControllerOptions {
  // Produce the non-indexed position array for a fully resolved param vector. The
  // r3f layer builds the body geometry and reads its position attribute; tests mock
  // this with a plain Float32Array so no GPU is needed.
  samplePositions: (vec: BodyParamVector) => Float32Array;
  // Write the lerped positions into the live geometry and flag it for upload. Called
  // every frame with the shared scratch buffer.
  writePositions: (positions: Float32Array) => void;
  // Recompute vertex normals on the live geometry so the fresnel rim stays correct.
  // Called once when the morph settles (and on the reduced-motion snap).
  recomputeNormals: () => void;
  scheduler: FrameScheduler;
  // Tween length. The headline morph reads best around 0.7 to 1.0s.
  durationMs?: number;
  reducedMotion?: boolean;
}

const DEFAULT_DURATION_MS = 850;

export interface MorphController {
  // Tween from the current shape to a new target. Calling again while a tween runs
  // retargets from the current interpolated shape to the new target. Under reduced
  // motion this snaps to the target with no tween.
  morphTo(target: BodyParamVector): void;
  // Stop any running tween with no settle callback (used on unmount). Does not write
  // a final frame; the caller disposes the geometry.
  cancel(): void;
  isMorphing(): boolean;
}

/** On-screen shape the next morph must leave from. Never the incoming target. */
export function resolveMorphFromVector(
  lastScrub: BodyParamVector | null,
  displayed: BodyParamVector | null,
  incoming: BodyParamVector,
): BodyParamVector {
  return lastScrub ?? displayed ?? incoming;
}

export function createMorphController(
  options: MorphControllerOptions,
  // The shape the avatar currently shows (its first-mount param vector). Subsequent
  // targets tween from here, then from each settled target in turn.
  initial: BodyParamVector,
): MorphController {
  const { samplePositions, writePositions, recomputeNormals, scheduler } = options;

  let current: BodyParamVector = initial;
  let animation: DemandAnimation | null = null;
  // Position endpoints for the active tween, sampled once per target change.
  let fromPos: Float32Array | null = null;
  let toPos: Float32Array | null = null;
  // Reused per-frame output buffer so the loop allocates nothing.
  let scratch: Float32Array | null = null;

  function stopAnimation(): void {
    if (animation) {
      animation.cancel();
      animation = null;
    }
  }

  function snapTo(target: BodyParamVector): void {
    const positions = samplePositions(target);
    writePositions(positions);
    recomputeNormals();
    current = target;
  }

  function morphTo(target: BodyParamVector): void {
    // Reduced-motion parity: snap straight to the target shape, schedule nothing.
    if (options.reducedMotion) {
      stopAnimation();
      snapTo(target);
      return;
    }

    // Retarget cleanly: a tween in flight is replaced by a new one that starts from
    // the shape on screen right now (the current interpolated vector), not a jump.
    stopAnimation();

    fromPos = samplePositions(current);
    toPos = samplePositions(target);
    assertSameTopology(fromPos, toPos);
    if (!scratch || scratch.length !== toPos.length) {
      scratch = new Float32Array(toPos.length);
    }
    const targetVec = target;

    animation = createDemandAnimation({
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      easing: easeInOutCubic,
      scheduler,
      onUpdate: (p) => {
        if (!fromPos || !toPos || !scratch) {
          return;
        }
        lerpPositionsInto(scratch, fromPos, toPos, p);
        writePositions(scratch);
        // current tracks the interpolated vector so a retarget mid-tween starts from
        // exactly the shape on screen. Numbers never lie: this vector is a visual
        // transition state and is never surfaced as a measured readout.
        current = lerpParamVector(current, targetVec, p);
      },
      onComplete: () => {
        // Land on the exact target positions, then recompute normals once so the rim
        // is correct at rest.
        if (toPos && scratch) {
          scratch.set(toPos);
          writePositions(scratch);
        }
        recomputeNormals();
        current = targetVec;
        animation = null;
      },
    });
    animation.start();
  }

  function cancel(): void {
    stopAnimation();
  }

  return {
    morphTo,
    cancel,
    isMorphing: () => animation !== null && animation.isRunning(),
  };
}
