'use client';

// The Measurements overlay for the FormaVision avatar (Prompt 210b, OV-T4).
//
// When the Measurements tab is active this renders one callout per measured
// circumference (reference Frame 1): a small teal anchor dot ON the body at the
// region's cross-section level and side, a thin teal leader line out to a label, and
// a drei Html label with the region name and value in the active unit. Left and right
// paired regions sit on the correct side. The anchors reuse the SAME region->level
// mapping as the ring and camera (calloutAnchors wraps ringLoopForRegion and
// framingForRegion), so the 3D callouts agree with the rest of the avatar.
//
// The callouts ease in with a stagger (the P2-T5-deferred stagger), driven by the
// P2-T1 runner; reduced motion shows them all at once. Leaving the Measurements tab
// unmounts the overlay and disposes every leader-line geometry. An UNKNOWN value
// shows the orange "Not measured" marker, never 0 or a fabricated number.
//
// The anchor math, value formatting and stagger schedule are unit tested in the
// geometry and motion modules; this component is the thin GPU and DOM binding flagged
// for a localhost eyeball.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Color, LineBasicMaterial } from 'three';
import {
  calloutAnchors,
  formatMeasurementValue,
  labelSideFor,
  createCalloutStaggerController,
  useDemandScheduler,
  UNKNOWN_VALUE_MARKER,
  type CalloutAnchor,
} from '@/lib/formavision/motion';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  MEASUREMENT_LABELS,
  type CircumferenceMeasurements,
  type MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type { Sex } from '@/lib/formavision/geometry/types';

export interface MeasurementCalloutsProps {
  sex: Sex;
  scan: CompositionSnapshot | null;
  circumferences: CircumferenceMeasurements | null;
  unit: MeasurementUnit;
  heightCm?: number | null;
  // Only renders when this is 'measurements'.
  activeTab?: 'bodyFat' | 'muscleMass' | 'measurements';
  reducedMotion?: boolean;
}

// How far out from the anchor the label sits, in meters, on the anchor's side. The
// leader line spans this gap. Center regions still lean to the left column.
const LABEL_X_OFFSET = 0.55;

// The label end of the leader line for an anchor, offset to the correct side so the
// label never sits over the body. Center regions lean left like left regions.
function labelPointFor(anchor: CalloutAnchor): [number, number, number] {
  const dir = anchor.side === 'right' ? 1 : -1;
  const baseX = anchor.side === 'center' ? 0 : anchor.x;
  return [baseX + dir * LABEL_X_OFFSET, anchor.y, anchor.z];
}

export function MeasurementCallouts(props: MeasurementCalloutsProps) {
  const invalidate = useThree((state) => state.invalidate);
  const scheduler = useDemandScheduler();

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

  const active = props.activeTab === 'measurements';

  // The ordered callout anchors, recomputed when the body changes so they track a
  // morph. Empty when the tab is not measurements.
  const anchors = useMemo(() => (active ? calloutAnchors(paramVector) : []), [active, paramVector]);

  // Per-callout ease-in progress 0..1, driven by the stagger controller.
  const [progress, setProgress] = useState<number[]>([]);

  // Leader-line geometries, one per callout, owned here and disposed on teardown.
  const lineGeometriesRef = useRef<BufferGeometry[]>([]);
  const lineMaterialRef = useRef<LineBasicMaterial | null>(null);

  useEffect(() => {
    // Dispose any previous lines first so a tab change or remount never leaks.
    for (const g of lineGeometriesRef.current) {
      g.dispose();
    }
    lineGeometriesRef.current = [];
    if (lineMaterialRef.current) {
      lineMaterialRef.current.dispose();
      lineMaterialRef.current = null;
    }

    if (!active || anchors.length === 0) {
      setProgress([]);
      invalidate();
      return;
    }

    // One shared teal leader material plus a 2-point geometry per callout.
    const material = new LineBasicMaterial({
      color: new Color(FORMA_VISION_HEX.teal),
      transparent: true,
      opacity: 0.7,
    });
    lineMaterialRef.current = material;
    lineGeometriesRef.current = anchors.map((anchor) => {
      const label = labelPointFor(anchor);
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new BufferAttribute(
          new Float32Array([anchor.x, anchor.y, anchor.z, label[0], label[1], label[2]]),
          3,
        ),
      );
      return geometry;
    });

    setProgress(new Array(anchors.length).fill(0));

    const controller = createCalloutStaggerController({
      count: anchors.length,
      setProgress: (index, value) => {
        setProgress((prev) => {
          if (prev.length !== anchors.length) {
            return prev;
          }
          const next = [...prev];
          next[index] = value;
          return next;
        });
        invalidate();
      },
      scheduler,
      reducedMotion: props.reducedMotion,
    });
    controller.enter();
    invalidate();

    return () => {
      controller.cancel();
      for (const g of lineGeometriesRef.current) {
        g.dispose();
      }
      lineGeometriesRef.current = [];
      if (lineMaterialRef.current) {
        lineMaterialRef.current.dispose();
        lineMaterialRef.current = null;
      }
    };
    // scheduler and invalidate are stable; reducedMotion is read at enter time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, anchors]);

  if (!active || anchors.length === 0 || lineGeometriesRef.current.length !== anchors.length) {
    return null;
  }

  const lineMaterial = lineMaterialRef.current;
  if (!lineMaterial) {
    return null;
  }

  return (
    <group>
      {anchors.map((anchor, i) => {
        const p = progress[i] ?? 0;
        if (p <= 0) {
          return null;
        }
        const value = props.circumferences ? props.circumferences[anchor.key] : null;
        const label = formatMeasurementValue(value, props.unit);
        const unknown = label === UNKNOWN_VALUE_MARKER;
        const labelPos = labelPointFor(anchor);
        const lineGeometry = lineGeometriesRef.current[i];
        const side = labelSideFor(anchor.side);
        return (
          <group key={anchor.key}>
            {/* Anchor dot on the body. A small additive teal point. */}
            <mesh position={[anchor.x, anchor.y, anchor.z]} scale={0.6 + 0.4 * p}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshBasicMaterial color={FORMA_VISION_HEX.teal} transparent opacity={p} toneMapped={false} />
            </mesh>

            {/* Thin teal leader line from the dot out to the label. */}
            {lineGeometry ? (
              <line>
                <primitive object={lineGeometry} attach="geometry" />
                <primitive object={lineMaterial} attach="material" />
              </line>
            ) : null}

            {/* Real DOM label: name + value (or the UNKNOWN marker). Reflows to the
                left or right column so it never sits over the body on mobile. */}
            <Html
              position={labelPos}
              center={false}
              distanceFactor={2.6}
              zIndexRange={[18, 0]}
              style={{ opacity: p, transform: `translateX(${side === 'right' ? '0' : '-100%'})` }}
            >
              <div
                className="pointer-events-none select-none rounded-md px-2 py-1 text-[11px] font-medium leading-tight"
                style={{
                  color: '#FFFFFF',
                  backgroundColor: `${FORMA_VISION_HEX.navy}B8`,
                  border: `1px solid ${unknown ? FORMA_VISION_HEX.orange : FORMA_VISION_HEX.teal}`,
                  maxWidth: '32vw',
                  whiteSpace: 'normal',
                  textAlign: side === 'right' ? 'left' : 'right',
                }}
              >
                <div className="opacity-80">{MEASUREMENT_LABELS[anchor.key]}</div>
                <div style={{ color: unknown ? FORMA_VISION_HEX.orange : '#FFFFFF' }}>{label}</div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default MeasurementCallouts;
