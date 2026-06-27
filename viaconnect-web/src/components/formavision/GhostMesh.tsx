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

import { useEffect, useMemo, useRef, useState } from 'react';
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

  // The gate: explicitly enabled AND a projected vector present. A primitive boolean,
  // so the build effect below re-runs only on a real show/hide or vector change.
  const active = useMemo(
    () => shouldRenderGhost(showGhost, ghostVector),
    [showGhost, ghostVector],
  );

  // The mounted ghost body, held in a ref so the build effect owns its lifecycle and a
  // separate unmount effect can free it without re-running the build. `ready` flips the
  // render once a body exists (the build runs in an effect, after the first paint).
  const mountedRef = useRef<MountedBody | null>(null);
  const [ready, setReady] = useState(false);

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
      setReady(false);
      if (hadGhost) {
        // Repaint so the removed ghost clears from the framebuffer (Canvas still alive).
        invalidate();
      }
      return;
    }

    mountedRef.current = mountGhostBody(ghostVector, buildOptions);
    setReady(true);
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

  if (!ready || !mountedRef.current || !active) {
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
