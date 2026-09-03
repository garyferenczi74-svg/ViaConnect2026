'use client';

// Designed anatomical 2D floor — loading / hard-failure ONLY.
// Never a Ready scan result. Never a third-party stock person (PR #181 Picasso pack).
// Soft volume + muscle-line read + plasma teal chrome-lock rim.
// Product 3D stays scan-morphed mesh (Brief 58). This is the shroud only.

import { useId } from 'react';
import type { CircumferenceMeasurements } from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import type { FloorPlateView } from '@/lib/formavision/motion/floorMotionSpec';
import {
  type AnatomicalFloorRole,
  floorRoleCopy,
} from '@/lib/formavision/tier/floorRoleCopy';
import {
  ANATOMICAL_FLOOR_VIEWBOX,
  anatomicalBuild,
  realLandmarkTicks,
} from './anatomicalFloorGeometry';

export const FORMAVISION_ANATOMICAL_FLOOR_TESTID = 'formavision-anatomical-floor';

export interface FormaVisionAnatomicalFloorProps {
  sex: Sex;
  className?: string;
  girths?: CircumferenceMeasurements | null;
  // Kept for call-site compatibility. The designed SVG is a single A-pose
  // outline; view does not swap in a stock photograph.
  view?: FloorPlateView;
  reducedMotion?: boolean;
  floorRole?: AnatomicalFloorRole;
}

export function FormaVisionAnatomicalFloor({
  sex,
  className,
  girths = null,
  view,
  reducedMotion = false,
  floorRole = 'loading',
}: FormaVisionAnatomicalFloorProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const volumeId = `fv-anatomical-volume-${uid}`;
  const glowId = `fv-anatomical-glow-${uid}`;
  const build = anatomicalBuild(sex);
  const ticks = realLandmarkTicks(girths);
  const caption = floorRoleCopy(floorRole);
  const label = sex === 'male' ? 'Male' : 'Female';

  return (
    <div
      data-testid={FORMAVISION_ANATOMICAL_FLOOR_TESTID}
      data-sex={sex}
      data-view={view ?? 'rear'}
      data-floor="anatomical-2d"
      data-floor-role={floorRole}
      data-pose="a-pose"
      data-crop="ankles"
      data-reduced-motion={reducedMotion ? 'true' : undefined}
      className={`relative flex h-full min-h-[200px] w-full items-center justify-center overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: FORMA_VISION_HEX.navy }}
    >
      <svg
        viewBox={ANATOMICAL_FLOOR_VIEWBOX}
        className="h-full max-h-full w-auto max-w-full"
        role="img"
        aria-label={`${label} ${caption}`}
      >
        <defs>
          <radialGradient id={volumeId} cx="50%" cy="30%" r="58%">
            <stop offset="0%" stopColor="#2E4568" />
            <stop offset="52%" stopColor={FORMA_VISION_HEX.card} />
            <stop offset="100%" stopColor={FORMA_VISION_HEX.navy} />
          </radialGradient>
          <filter id={glowId} x="-20%" y="-12%" width="140%" height="124%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.1" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.176  0 0 0 0 0.647  0 0 0 0 0.627  0 0 0 0.85 0"
              result="teal"
            />
            <feMerge>
              <feMergeNode in="teal" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g data-testid="formavision-anatomical-volume" fill={`url(#${volumeId})`}>
          {build.volumes.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g
          data-testid="formavision-anatomical-muscle-lines"
          fill="none"
          stroke="#8EC8C4"
          strokeWidth={0.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.88}
        >
          {build.muscleLines.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <path
          data-testid="formavision-anatomical-contour"
          d={build.contour}
          fill="none"
          stroke={FORMA_VISION_HEX.teal}
          strokeWidth={1.5}
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
        {ticks.length > 0 ? (
          <g data-testid="formavision-anatomical-landmark-ticks">
            {ticks.map((tick) => (
              <circle
                key={tick.key}
                data-landmark={tick.key}
                cx={tick.x}
                cy={tick.y}
                r={2.4}
                fill={FORMA_VISION_HEX.teal}
              />
            ))}
          </g>
        ) : null}
      </svg>
      <p
        data-testid="formavision-floor-caption"
        role="status"
        className="pointer-events-none absolute bottom-2 left-1/2 z-10 w-[min(92%,18rem)] -translate-x-1/2 text-center text-[10px] leading-relaxed text-white/55"
      >
        {caption}
      </p>
    </div>
  );
}
