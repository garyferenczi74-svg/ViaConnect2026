'use client';

// Prompt #157k: teal glow stroke painted on the muscle region whose
// card is currently active. Layered above the heat-map masks so both
// remain visible. Pulses on a 2.4s loop unless reduced motion is on.

import { motion } from 'framer-motion';

import {
  GLOW_PULSE,
  GLOW_TRANSITION,
  GLOW_VARIANTS,
  GLOW_VARIANTS_REDUCED,
  Z_GLOW_RING,
} from './constants';
import type { BodyRegionId, RegionHitRect } from './types';

interface RegionGlowRingProps {
  readonly regionId: BodyRegionId;
  readonly rect: RegionHitRect;
  readonly container: { readonly width: number; readonly height: number };
  readonly reducedMotion: boolean;
}

export function RegionGlowRing({ regionId, rect, container, reducedMotion }: RegionGlowRingProps) {
  const variants = reducedMotion ? GLOW_VARIANTS_REDUCED : GLOW_VARIANTS;

  const x = (rect.xPct / 100) * container.width - ((rect.widthPct / 100) * container.width) / 2;
  const y = (rect.yPct / 100) * container.height - ((rect.heightPct / 100) * container.height) / 2;
  const w = (rect.widthPct / 100) * container.width;
  const h = (rect.heightPct / 100) * container.height;
  const rx = Math.min(w, h) / 2;

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      width={container.width}
      height={container.height}
      viewBox={`0 0 ${container.width} ${container.height}`}
      className="pointer-events-none absolute left-0 top-0"
      style={{ zIndex: Z_GLOW_RING }}
    >
      <motion.rect
        key={regionId}
        x={x}
        y={y}
        width={w}
        height={h}
        rx={rx}
        ry={rx}
        fill="none"
        stroke="rgba(45, 165, 160, 0.7)"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 6px rgba(45, 165, 160, 0.5))' }}
        initial={variants.initial}
        animate={
          reducedMotion
            ? variants.animate
            : { ...variants.animate, ...GLOW_PULSE }
        }
        exit={variants.exit}
        transition={reducedMotion ? { duration: 0.15 } : GLOW_TRANSITION}
      />
    </svg>
  );
}
