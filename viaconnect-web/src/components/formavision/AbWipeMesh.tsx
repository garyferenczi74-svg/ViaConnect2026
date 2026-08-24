'use client';

// The baseline mesh for the FormaVision 3D A/B wipe (Brief 2).
//
// Sibling of BodyMesh / GhostMesh: a second parametric body from the resolved
// baseline BodyParamVector, discarded on the right of the wipe so the current
// body shows through. Renders only when wipe is enabled AND a baseline vector
// is present. No photographic reconstruction.

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { BuildOptions } from '@/lib/formavision/geometry/buildBodyGeometry';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import {
  clampWipeT,
  shouldRenderAbWipe,
  wipeModeForRole,
} from '@/lib/formavision/compare/abWipe';
import { mountAbWipeBody } from './abWipeBody';
import type { MountedBody } from './mountBodyGeometry';

export interface AbWipeMeshProps {
  wipeVector?: BodyParamVector | null;
  wipeActive?: boolean;
  wipeT?: number;
  buildOptions?: BuildOptions;
}

export function AbWipeMesh({
  wipeVector,
  wipeActive,
  wipeT,
  buildOptions,
}: AbWipeMeshProps) {
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);

  const active = shouldRenderAbWipe(wipeActive, wipeVector);
  const mountedRef = useRef<MountedBody | null>(null);
  const [buildCount, setBuildCount] = useState(0);

  useEffect(() => {
    const had = mountedRef.current !== null;
    if (mountedRef.current) {
      mountedRef.current.dispose();
      mountedRef.current = null;
    }

    if (!active || !wipeVector) {
      if (had) invalidate();
      return;
    }

    mountedRef.current = mountAbWipeBody(wipeVector, buildOptions);
    setBuildCount((n) => n + 1);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, wipeVector, buildOptions]);

  useEffect(() => {
    const mounted = mountedRef.current;
    if (!mounted) return;
    const width = size.width * gl.getPixelRatio();
    mounted.materialHandle.setWipe(
      wipeModeForRole('baseline', active),
      clampWipeT(wipeT ?? 0.5),
      width,
    );
    invalidate();
  }, [active, wipeT, size.width, gl, invalidate, buildCount]);

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
    />
  );
}

export default AbWipeMesh;
