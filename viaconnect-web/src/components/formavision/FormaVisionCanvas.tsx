'use client';

// The react-three-fiber scene for the FormaVision 3D avatar (Prompt 210b, P1-T4).
//
// This module is dynamically imported (ssr:false) by FormaVision3DAvatar, so the
// whole three bundle stays out of the SSR and first-paint path. It composes the
// mounted body geometry plus wireframe glow material into a demand-driven Canvas:
// nothing renders until an interaction, a remount, or a visibility change asks for
// a frame. A constrained OrbitControls allows turntable azimuth with a clamped
// polar range and no panning, a soft contact-shadow floor grounds the body, and a
// faint emissive light pair lifts the navy fill (the glow itself is in the shader).
//
// Lifecycle contract honored here: dispose the mounted body on unmount, pause
// rendering when the canvas leaves the viewport (IntersectionObserver) or the tab
// is hidden (visibilitychange), and never run an idle turntable when reducedMotion
// is set (no auto-spin is started anywhere; motion choreography is Phase 2).

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Mesh } from 'three';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';
import { mountBodyGeometry } from './mountBodyGeometry';

export interface FormaVisionCanvasProps {
  sex: Sex;
  scan: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  // The unit the circumference values are expressed in. Forwarded into the param
  // mapper verbatim; never assumed. See the UNIT CONTRACT in FormaVision3DAvatar.
  unit: MeasurementUnit;
  heightCm?: number | null;
  reducedMotion?: boolean;
  // Lite tier trims geometry density for low-power devices; cinematic is full.
  renderTier?: 'cinematic' | 'lite';
}

// Vertical / radial density per render tier. Lite keeps the silhouette readable
// while roughly halving the row count for low-power GPUs.
const TIER_BUILD = {
  cinematic: { radialSegments: 40, verticalSegments: 48 },
  lite: { radialSegments: 28, verticalSegments: 28 },
} as const;

// The body geometry is authored in meters with the floor at y = 0; this lifts the
// camera target to roughly mid-torso so the avatar sits centered in the frame.
const TARGET_Y = 0.9;

// The single mesh node. It builds and owns the mounted body, drives one demand
// frame whenever its inputs change, and disposes everything on unmount.
function BodyMesh(props: FormaVisionCanvasProps) {
  const meshRef = useRef<Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  const mounted = useMemo(() => {
    const param = scanToParamVector({
      snapshot: props.scan,
      circumferences: props.circumferences,
      sex: props.sex,
      heightCm: props.heightCm,
      unit: props.unit,
    });
    return mountBodyGeometry(param, {
      build: TIER_BUILD[props.renderTier ?? 'cinematic'],
    });
    // The mount is a pure function of these inputs; rebuild only when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.sex,
    props.scan,
    props.circumferences,
    props.unit,
    props.heightCm,
    props.renderTier,
  ]);

  // Request a frame whenever a fresh body is mounted (demand loop is otherwise idle).
  useEffect(() => {
    invalidate();
  }, [mounted, invalidate]);

  // Dispose the mounted body (geometry, clone, material, texture) on unmount or
  // before the next mount replaces it. No leaks across remounts.
  useEffect(() => {
    return () => {
      mounted.dispose();
    };
  }, [mounted]);

  return (
    <mesh ref={meshRef} geometry={mounted.geometry} material={mounted.materialHandle.material} />
  );
}

// Bridges browser visibility and viewport intersection to the demand loop. When the
// tab is shown again or the canvas re-enters the viewport, request a frame so the
// avatar repaints; while hidden or offscreen no frames are requested at all.
function VisibilityPump({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    function onVisible(): void {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        invalidate();
      }
    }
    document.addEventListener('visibilitychange', onVisible);

    const element = containerRef.current;
    let observer: IntersectionObserver | null = null;
    if (element && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              invalidate();
            }
          }
        },
        { threshold: 0.01 },
      );
      observer.observe(element);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (observer) {
        observer.disconnect();
      }
      // Canvas owns the WebGL renderer lifecycle and disposes the context on its
      // own unmount, so this pump must not touch gl: a disposal here would double
      // free the context, or kill a context the Canvas is still rendering into if
      // this effect re-runs while the Canvas persists.
    };
  }, [containerRef, invalidate]);

  return null;
}

export default function FormaVisionCanvas(props: FormaVisionCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full">
      <Canvas
        // Demand loop: frames are produced only on interaction, mount, or an
        // explicit invalidate. No continuous render, no idle spin.
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.0, 3.2], fov: 30, near: 0.1, far: 50 }}
      >
        <color attach="background" args={[FORMA_VISION_HEX.navy]} />

        {/* Emissive-leaning light pair: the wireframe glow lives in the shader, so
            this only lifts the navy fill enough to read depth. */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[2, 4, 3]} intensity={0.35} />

        <BodyMesh {...props} />

        {/* Soft contact shadow grounds the body on the floor plane at y = 0. */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.35}
          scale={4}
          blur={2.4}
          far={2.2}
          resolution={256}
          color={FORMA_VISION_HEX.navy}
        />

        <OrbitControls
          // Turntable azimuth only: no panning, a clamped polar range so the
          // camera cannot tumble under the floor or over the crown, and a gentle
          // zoom clamp.
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI * 0.28}
          maxPolarAngle={Math.PI * 0.62}
          minDistance={2.2}
          maxDistance={4.5}
          // No auto-rotate ever: idle spin would violate reducedMotion and the
          // demand loop. Phase 2 owns motion choreography.
          autoRotate={false}
          target={[0, TARGET_Y, 0]}
        />

        <VisibilityPump containerRef={containerRef} />
      </Canvas>
    </div>
  );
}
