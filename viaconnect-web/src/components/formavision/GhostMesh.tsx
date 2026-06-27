'use client';

// The projected future-self GHOST mesh for the FormaVision avatar (Prompt 210b, P5-T1b).
//
// A sibling of BodyMesh inside the same Canvas: a translucent ghost of the projected
// body, overlaid on the solid current avatar so the user can read "where you're
// heading". It is a prop-driven seam (mirroring how scrubVector was a seam before
// P3-T2b wired it): it renders the ghost ONLY when showGhost is true AND a projected
// ghostVector is present, and otherwise renders nothing and disposes. The goal
// resolution, toggle UI and confidence label that DRIVE these props are the next task
// (P5-T1c); here the mesh only responds to them.
//
// Lifecycle, mirroring the conditional sibling meshes (MeasurementRing /
// EmphasisParticles): the ghost body is built in an effect, a demand frame is
// requested when it appears, updates, or clears, and the body is disposed on hide and
// on unmount with no leak. There is no animation: the ghost simply appears, so reduced
// motion has full static parity for free and the demand loop stays idle (no continuous
// render). The ghost is a pure projection of passed-in data and never fabricates a body.

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { BuildOptions } from '@/lib/formavision/geometry/buildBodyGeometry';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import { shouldRenderGhost, mountGhostBody } from './ghostBody';
import type { MountedBody } from './mountBodyGeometry';

export interface GhostMeshProps {
  // The projected future-self shape (from projectFutureSelfVector, P5-T1a), or null /
  // undefined when there is nothing to project. Null renders nothing (no fabrication).
  ghostVector?: BodyParamVector | null;
  // Master gate. The ghost renders only when this is true AND ghostVector is present.
  showGhost?: boolean;
  // The SAME per-tier build options the current body uses, so the ghost is identical
  // topology and overlays cleanly. Resolved by FormaVisionCanvas from renderTier.
  buildOptions?: BuildOptions;
}

// Overlaid placement: the ghost shares the current body's origin and reads as a
// translucent comparison in place (the sensible default for a "where you're heading"
// view). This is the cleanly swappable seam for the Gary localhost eyeball pass: a
// beside comparison would set a small +X offset here instead of the shared origin.
const GHOST_OFFSET: [number, number, number] = [0, 0, 0];

export function GhostMesh({ ghostVector, showGhost, buildOptions }: GhostMeshProps) {
  const invalidate = useThree((state) => state.invalidate);

  // The gate: explicitly enabled AND a projected vector present. Single-sourced through
  // shouldRenderGhost (so its unit tests guard this real path) and computed inline: it
  // is a trivial boolean, so no useMemo. As a primitive it still only re-runs the build
  // effect below on a real show/hide or vector change.
  const active = shouldRenderGhost(showGhost, ghostVector);

  // The mounted ghost body, held in a ref so the build effect owns its lifecycle and a
  // separate unmount effect can free it without re-running the build. buildCount is a
  // monotonic version counter: every successful build bumps it so React ALWAYS
  // re-renders (a boolean ready flag would no-op on an update while shown, leaving the
  // mesh below bound to the just-disposed previous geometry). buildCount 0 means nothing
  // has been built yet.
  const mountedRef = useRef<MountedBody | null>(null);
  const [buildCount, setBuildCount] = useState(0);

  // Build / update / clear the ghost. Disposes the prior body at the top so this effect
  // fully owns the show, update and hide transitions and their demand frames. On a hide
  // it requests a frame ONLY if a ghost was actually showing, so the default ghost-off
  // mount adds no frame and leaves the current avatar render path byte-identical.
  useEffect(() => {
    const hadGhost = mountedRef.current !== null;
    if (mountedRef.current) {
      mountedRef.current.dispose();
      mountedRef.current = null;
    }

    if (!active || !ghostVector) {
      // Hide is already a render with active false (returns null below); just clear the
      // framebuffer if a ghost was actually showing (Canvas still alive).
      if (hadGhost) {
        invalidate();
      }
      return;
    }

    mountedRef.current = mountGhostBody(ghostVector, buildOptions);
    // Bump the version so React re-renders and the mesh rebinds to the NEW geometry
    // before the next r3f frame draws (a no-op boolean flag would leave it on the old,
    // now-disposed geometry on an update while shown).
    setBuildCount((n) => n + 1);
    // Reveal the ghost with one demand frame; it simply appears (no animation).
    invalidate();
    // invalidate is stable; the build is keyed on the gate, the vector, and the tier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ghostVector, buildOptions]);

  // Dispose on unmount so a shown ghost frees its GPU resources when the Canvas tears
  // down. No invalidate here: the Canvas owns its own teardown, and requesting a frame
  // into a disposing renderer is exactly what the sibling meshes avoid.
  useEffect(() => {
    return () => {
      mountedRef.current?.dispose();
      mountedRef.current = null;
    };
  }, []);

  if (buildCount === 0 || !mountedRef.current || !active) {
    return null;
  }

  return (
    <mesh
      geometry={mountedRef.current.geometry}
      material={mountedRef.current.materialHandle.material}
      position={GHOST_OFFSET}
    />
  );
}

export default GhostMesh;
