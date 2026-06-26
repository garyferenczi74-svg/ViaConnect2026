'use client';

// The measurement ring for the FormaVision avatar (Prompt 210b, P2-T4b).
//
// When a measured region is selected this draws ONE bright teal ring that wraps the
// body at that region's cross-section (the ring IS the cross-section: it reuses the
// parametric ellipse via ringLoopForRegion, sized to the real circumference, at the
// same level regionFraming points the camera). The ring sweeps on (arc 0 to full)
// with a soft pulse settle while the value counts up to the real measurement, shown
// as real DOM text via drei Html so it is selectable and screen-reader readable.
//
// Only ever one ring (the selected region). Clearing the selection disposes the ring
// geometry and material. While the ring is shown and the body morphs, the ring loop
// is recomputed from the current param vector so it tracks the new cross-section. An
// UNKNOWN region shows a "Not measured" marker, never a fabricated number. Reduced
// motion shows the full ring and the final value instantly.
//
// The heavy lifting (loop math, value formatting, the draw-on schedule) lives in the
// unit-tested geometry and motion modules; this component is the thin GPU and DOM
// binding flagged for a localhost eyeball.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Mesh,
  MeshBasicMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import { ringLoopForRegion } from '@/lib/formavision/geometry/ringLoopForRegion';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  createMeasurementRingController,
  formatRingValue,
  circumferenceToUnit,
  UNKNOWN_VALUE_MARKER,
  useDemandScheduler,
  type IdleTurntable,
  type MeasurementRingController,
} from '@/lib/formavision/motion';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';

export interface MeasurementRingProps {
  sex: Sex;
  scan: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  unit: MeasurementUnit;
  heightCm?: number | null;
  selectedBodyPart?: string | null;
  reducedMotion?: boolean;
  // The idle turntable, paused while the ring draws so the camera holds still.
  turntableRef: React.MutableRefObject<IdleTurntable | null>;
  // Optional change since the first scan, rendered only when provided. The
  // circumference-history wiring lands in a later task; nothing is fabricated here.
  changeSinceFirst?: string | null;
}

// Tube thickness and radial detail for the ring. Thin enough to read as a crisp loop
// hugging the body, brighter than the wireframe via additive teal.
const TUBE_RADIUS = 0.012;
const TUBE_RADIAL_SEGMENTS = 8;

// Build a closed tube along the region's cross-section loop at its height. The tube
// is a fresh disposable geometry; the caller owns disposing it.
function buildRingGeometry(points: { x: number; z: number }[], y: number): BufferGeometry {
  const path = points.map((p) => new Vector3(p.x, y, p.z));
  const curve = new CatmullRomCurve3(path, true, 'catmullrom', 0.0);
  const tubularSegments = Math.max(24, points.length);
  return new TubeGeometry(curve, tubularSegments, TUBE_RADIUS, TUBE_RADIAL_SEGMENTS, true);
}

export function MeasurementRing(props: MeasurementRingProps) {
  const invalidate = useThree((state) => state.invalidate);
  const scheduler = useDemandScheduler();
  const meshRef = useRef<Mesh>(null);

  // The current param vector, recomputed on any shape input change so the ring loop
  // tracks the body (including after a morph). Same inputs as the body mesh.
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

  // The resolved ring loop for the current selection, or null when nothing is
  // selected. Recomputes when the selection or the body shape changes.
  const loop = useMemo(() => {
    const region = props.selectedBodyPart ?? null;
    if (!region) {
      return null;
    }
    return ringLoopForRegion(paramVector, region);
  }, [props.selectedBodyPart, paramVector]);

  // Geometry and material for the active ring, rebuilt when the loop changes. Held in
  // refs so the draw-on controller can reveal the arc and dispose on teardown.
  const geometryRef = useRef<BufferGeometry | null>(null);
  const materialRef = useRef<MeshBasicMaterial | null>(null);
  const [ready, setReady] = useState(false);

  // The label value: the real measured number scaled by the count-up fraction, or the
  // UNKNOWN marker for an estimated region. Held in state so the DOM label updates.
  const [valueLabel, setValueLabel] = useState<string>('');

  // Controller ref so the selection effect can drive and tear it down.
  const controllerRef = useRef<MeasurementRingController | null>(null);

  // Build or rebuild the ring whenever the loop changes; tear it down on deselect.
  useEffect(() => {
    // Dispose any previous ring first so only one ring exists at a time.
    if (geometryRef.current) {
      geometryRef.current.dispose();
      geometryRef.current = null;
    }
    if (materialRef.current) {
      materialRef.current.dispose();
      materialRef.current = null;
    }
    controllerRef.current?.deselect();
    controllerRef.current = null;

    if (!loop) {
      setReady(false);
      setValueLabel('');
      invalidate();
      return;
    }

    const geometry = buildRingGeometry(loop.points, loop.y);
    const material = new MeshBasicMaterial({
      color: new Color(FORMA_VISION_HEX.teal),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    geometryRef.current = geometry;
    materialRef.current = material;
    setReady(true);

    // The real target value for the count-up (null for an estimated region, which
    // shows the marker directly with no count-up number).
    const targetValue = loop.estimated
      ? null
      : circumferenceToUnit(loop.circumferenceM, props.unit);

    // Reveal the arc by the index draw range; the full loop draws at fraction 1.
    const indexCount = geometry.index ? geometry.index.count : 0;

    const controller = createMeasurementRingController({
      setArc: (fraction) => {
        if (geometry.index) {
          geometry.setDrawRange(0, Math.ceil(indexCount * fraction));
        }
        invalidate();
      },
      setValueFraction: (fraction) => {
        if (targetValue === null) {
          setValueLabel(UNKNOWN_VALUE_MARKER);
        } else {
          const shown = Math.round(targetValue * fraction * 10) / 10;
          setValueLabel(`${shown} ${props.unit}`);
        }
      },
      pulse: () => {
        // Settle to the exact formatted value so rounding during the count-up never
        // leaves a value one tick short of the real number.
        setValueLabel(formatRingValue(loop.circumferenceM, props.unit, loop.estimated));
        invalidate();
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
      scheduler,
      reducedMotion: props.reducedMotion,
    });
    controllerRef.current = controller;

    // Pause the turntable for the draw, then play it. recomputeNormals style settle
    // is not needed here; the turntable resumes on the next interaction or idle.
    props.turntableRef.current?.notifyInteraction();
    controller.draw();
    invalidate();

    return () => {
      controller.deselect();
      controllerRef.current = null;
      geometryRef.current = null;
      materialRef.current = null;
    };
    // scheduler and invalidate are stable; reducedMotion and unit are read at draw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop]);

  if (!ready || !geometryRef.current || !materialRef.current || !loop) {
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={geometryRef.current} material={materialRef.current}>
      {/* Real DOM label anchored at the ring height, offset to the side so it does
          not sit on the body. Html reflows in normal flow on narrow screens via the
          max-width and wrapping, so the value never overlaps the avatar. */}
      <Html
        position={[0, loop.y, 0]}
        center
        distanceFactor={2.6}
        wrapperClass="formavision-ring-label"
        zIndexRange={[20, 0]}
      >
        <div
          className="pointer-events-none select-none rounded-full px-2 py-1 text-xs font-medium"
          style={{
            color: '#FFFFFF',
            // Navy token surface at reduced opacity so the label reads over the body
            // without introducing a new color. Teal border for a measured value,
            // orange (the estimated accent token) for an UNKNOWN region.
            backgroundColor: `${FORMA_VISION_HEX.navy}B8`,
            border: `1px solid ${loop.estimated ? FORMA_VISION_HEX.orange : FORMA_VISION_HEX.teal}`,
            maxWidth: '40vw',
            whiteSpace: 'normal',
            textAlign: 'center',
          }}
        >
          {valueLabel || UNKNOWN_VALUE_MARKER}
          {props.changeSinceFirst ? (
            <span className="ml-1 opacity-80">{props.changeSinceFirst}</span>
          ) : null}
        </div>
      </Html>
    </mesh>
  );
}

export default MeasurementRing;
