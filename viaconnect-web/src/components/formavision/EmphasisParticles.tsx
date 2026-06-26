'use client';

// Orange emphasis particles for the FormaVision avatar (Prompt 210b, P2-T5).
//
// A sparing, one-shot orange accent that fires at a region to mark a peak change or
// win. Orange (#B75E18) is the sanctioned emphasis token, used only for this moment.
// The component is a prop-driven seam: when emphasisRegion is set it fires a single
// restrained burst (a small cloud of points rising and fading at the region's level)
// via the P2-T1 runner, then disposes the geometry and material. Unset means nothing.
// Reduced motion shows a single static accent and schedules zero frames.
//
// The region level comes from the SAME ringLoopForRegion mapping the ring, highlight
// and camera use, so the accent lands exactly where the region is. The burst math and
// the fire-once-then-dispose lifecycle are unit-tested in the motion module; this
// component is the thin GPU binding flagged for a localhost eyeball.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from 'three';
import { ringLoopForRegion } from '@/lib/formavision/geometry/ringLoopForRegion';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  createEmphasisParticleController,
  useDemandScheduler,
} from '@/lib/formavision/motion';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';

export interface EmphasisParticlesProps {
  sex: Sex;
  scan: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  unit: MeasurementUnit;
  heightCm?: number | null;
  // The region to accent. Unset means no particles fire.
  emphasisRegion?: string;
  reducedMotion?: boolean;
}

// A small, restrained particle count: an accent, not a fountain.
const PARTICLE_COUNT = 14;
const RISE_HEIGHT = 0.22;

// Seed deterministic particle offsets around the region cross-section so the burst is
// stable across renders (no Math.random in the render path beyond this build).
function buildParticleGeometry(
  points: { x: number; z: number }[],
  baseSeed: number,
): { geometry: BufferGeometry; base: Float32Array } {
  const base = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    // Sample a point on the ring loop and nudge it outward slightly.
    const p = points[(i * 7 + baseSeed) % points.length];
    base[i * 3] = p.x * 1.04;
    base[i * 3 + 1] = 0;
    base[i * 3 + 2] = p.z * 1.04;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(base.slice(), 3));
  return { geometry, base };
}

export function EmphasisParticles(props: EmphasisParticlesProps) {
  const invalidate = useThree((state) => state.invalidate);
  const scheduler = useDemandScheduler();
  const pointsRef = useRef<Points>(null);

  const paramVector = useMemo(
    () =>
      scanToParamVector({
        snapshot: props.scan,
        circumferences: props.circumferences,
        sex: props.sex,
        heightCm: props.heightCm,
        unit: props.unit,
      }),
    [props.scan, props.circumferences, props.sex, props.heightCm, props.unit],
  );

  const loop = useMemo(() => {
    if (!props.emphasisRegion) {
      return null;
    }
    return ringLoopForRegion(paramVector, props.emphasisRegion);
  }, [props.emphasisRegion, paramVector]);

  const geometryRef = useRef<BufferGeometry | null>(null);
  const materialRef = useRef<PointsMaterial | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Tear down any previous burst first so only one accent exists at a time.
    if (geometryRef.current) {
      geometryRef.current.dispose();
      geometryRef.current = null;
    }
    if (materialRef.current) {
      materialRef.current.dispose();
      materialRef.current = null;
    }

    if (!loop) {
      setReady(false);
      invalidate();
      return;
    }

    const { geometry, base } = buildParticleGeometry(loop.points, loop.points.length);
    const material = new PointsMaterial({
      color: new Color(FORMA_VISION_HEX.orange),
      size: 0.035,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    geometryRef.current = geometry;
    materialRef.current = material;
    setReady(true);

    const positionAttr = geometry.getAttribute('position') as BufferAttribute;

    const controller = createEmphasisParticleController({
      setBurst: (progress) => {
        // Rise: particles drift up from the region level. Fade: opacity peaks early
        // then eases out so the accent is brief.
        const arr = positionAttr.array as Float32Array;
        for (let i = 0; i < PARTICLE_COUNT; i += 1) {
          arr[i * 3 + 1] = loop.y + base[i * 3 + 1] + RISE_HEIGHT * progress;
        }
        positionAttr.needsUpdate = true;
        material.opacity = Math.sin(Math.min(progress, 1) * Math.PI) * 0.9;
        invalidate();
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
      scheduler,
      reducedMotion: props.reducedMotion,
    });

    controller.fire();
    invalidate();

    return () => {
      controller.cancel();
      geometryRef.current = null;
      materialRef.current = null;
    };
    // scheduler and invalidate are stable; reducedMotion is read at fire time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop]);

  if (!ready || !geometryRef.current || !materialRef.current || !loop) {
    return null;
  }

  return <points ref={pointsRef} geometry={geometryRef.current} material={materialRef.current} />;
}

export default EmphasisParticles;
