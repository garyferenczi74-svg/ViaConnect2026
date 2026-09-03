'use client';

// Always-paint Picasso-pack 2D floor (Brief 59 LOOK amend / Gary lock).
// Bundled Male/Female front+rear PNGs — no remote Supabase, no stick SVG.
// Product 3D stays scan-morphed mesh (Brief 58). This is the floor only.

import { useEffect, useState } from 'react';
import type { CircumferenceMeasurements } from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  FORMAVISION_MOTION_SPEC,
  defaultFloorView,
  type FloorPlateView,
} from '@/lib/formavision/motion/floorMotionSpec';
import { realLandmarkTicks } from './anatomicalFloorGeometry';
import { picassoPackSrc } from './picassoPack';

export const FORMAVISION_ANATOMICAL_FLOOR_TESTID = 'formavision-anatomical-floor';

export interface FormaVisionAnatomicalFloorProps {
  sex: Sex;
  className?: string;
  girths?: CircumferenceMeasurements | null;
  view?: FloorPlateView;
  reducedMotion?: boolean;
}

function useSexPlate(sex: Sex, reducedMotion: boolean): {
  current: Sex;
  outgoing: Sex | null;
} {
  const [current, setCurrent] = useState(sex);
  const [outgoing, setOutgoing] = useState<Sex | null>(null);

  useEffect(() => {
    if (sex === current) return;
    if (reducedMotion) {
      setCurrent(sex);
      setOutgoing(null);
      return;
    }
    setOutgoing(current);
    setCurrent(sex);
    const timer = setTimeout(() => {
      setOutgoing(null);
    }, FORMAVISION_MOTION_SPEC.sexToggleMs);
    return () => clearTimeout(timer);
  }, [sex, current, reducedMotion]);

  return { current, outgoing };
}

export function FormaVisionAnatomicalFloor({
  sex,
  className,
  girths = null,
  view = defaultFloorView(),
  reducedMotion = false,
}: FormaVisionAnatomicalFloorProps) {
  const { current, outgoing } = useSexPlate(sex, reducedMotion);
  const ticks = realLandmarkTicks(girths);
  const packSrc = picassoPackSrc(current, view);
  const label = current === 'male' ? 'Male' : 'Female';
  const toggleMs = reducedMotion ? 0 : FORMAVISION_MOTION_SPEC.sexToggleMs;

  return (
    <div
      data-testid={FORMAVISION_ANATOMICAL_FLOOR_TESTID}
      data-sex={current}
      data-view={view}
      data-floor="picasso-pack"
      data-pack-src={packSrc}
      data-pose="anatomical"
      className={`relative flex h-full min-h-[200px] w-full items-center justify-center overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: FORMA_VISION_HEX.navy }}
    >
      <style>{`@keyframes fv-plate-enter{from{transform:scale(0.985)}to{transform:scale(1)}}@media (prefers-reduced-motion:reduce){.fv-plate-enter{animation:none}}`}</style>
      <div className="relative h-full w-full">
        {outgoing ? (
          <img
            src={picassoPackSrc(outgoing, view)}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{
              opacity: 0,
              transition: `opacity ${toggleMs}ms ease`,
            }}
          />
        ) : null}
        <img
          data-testid="formavision-picasso-plate"
          src={packSrc}
          alt={`${label} anatomical body outline`}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{
            opacity: 1,
            transition:
              outgoing && toggleMs > 0
                ? `opacity ${toggleMs}ms ease`
                : undefined,
          }}
        />
        {ticks.length > 0 ? (
          <div
            data-testid="formavision-anatomical-landmark-ticks"
            className="pointer-events-none absolute inset-0"
          >
            {ticks.map((tick) => (
              <span
                key={tick.key}
                data-landmark={tick.key}
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${tick.xPct}%`,
                  top: `${tick.yPct}%`,
                  backgroundColor: FORMA_VISION_HEX.teal,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
