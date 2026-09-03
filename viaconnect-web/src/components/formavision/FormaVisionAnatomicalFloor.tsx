'use client';

// Always-paint designed anatomical 2D floor (Brief 59 / Jeffery AMEND).
// Bundled SVG — no remote Supabase Male/Female Avatar.svg (#177 miss).
// Soft volume + muscle-line read + plasma teal chrome-lock rim.
// Product 3D stays scan-morphed mesh (Brief 58). This is the floor only.

import { useId } from 'react';
import type { CircumferenceMeasurements } from '@/lib/body-tracker/circumference';
import type { Sex } from '@/lib/formavision/geometry/types';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  ANATOMICAL_FLOOR_VIEWBOX,
  anatomicalContourPath,
  anatomicalMuscleLines,
  anatomicalVolumePath,
  realLandmarkTicks,
} from './anatomicalFloorGeometry';

export const FORMAVISION_ANATOMICAL_FLOOR_TESTID = 'formavision-anatomical-floor';

export interface FormaVisionAnatomicalFloorProps {
  sex: Sex;
  className?: string;
  girths?: CircumferenceMeasurements | null;
}

export function FormaVisionAnatomicalFloor({
  sex,
  className,
  girths = null,
}: FormaVisionAnatomicalFloorProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const volumeId = `fv-anatomical-volume-${uid}`;
  const glowId = `fv-anatomical-glow-${uid}`;
  const contour = anatomicalContourPath(sex);
  const volume = anatomicalVolumePath(sex);
  const muscleLines = anatomicalMuscleLines(sex);
  const ticks = realLandmarkTicks(girths);
  const label = sex === 'male' ? 'Male' : 'Female';

  return (
    <div
      data-testid={FORMAVISION_ANATOMICAL_FLOOR_TESTID}
      data-sex={sex}
      data-floor="anatomical-2d"
      data-pose="a-pose"
      data-crop="ankles"
      className={`flex h-full min-h-[200px] w-full items-center justify-center ${className ?? ''}`}
      style={{ backgroundColor: FORMA_VISION_HEX.navy }}
    >
      <svg
        viewBox={ANATOMICAL_FLOOR_VIEWBOX}
        className="h-full max-h-full w-auto max-w-full"
        role="img"
        aria-label={`${label} anatomical body outline`}
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
        <path
          data-testid="formavision-anatomical-volume"
          d={volume}
          fill={`url(#${volumeId})`}
        />
        <g
          data-testid="formavision-anatomical-muscle-lines"
          fill="none"
          stroke="#8EC8C4"
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.72}
        >
          {muscleLines.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <path
          data-testid="formavision-anatomical-contour"
          d={contour}
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
    </div>
  );
}
