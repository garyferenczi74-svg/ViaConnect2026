'use client';

// Prompt #157k: SVG quadratic-Bezier leader line connecting one
// pinned / peeked card to the body region centroid. Stroke is teal
// at 50% opacity; pathLength animates 0 to 1 on mount, 1 to 0 on
// unmount, with a 100ms delay so the card surface lands first and
// the line draws in.

import { motion } from 'framer-motion';

import {
  LEADER_TRANSITION,
  LEADER_VARIANTS,
  LEADER_VARIANTS_REDUCED,
  Z_LEADER_LINE,
} from './constants';
import type { BodyRegionId } from './types';

interface LeaderLineProps {
  readonly regionId: BodyRegionId;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
  readonly container: { readonly width: number; readonly height: number };
  readonly reducedMotion: boolean;
}

export function LeaderLine({ regionId, from, to, container, reducedMotion }: LeaderLineProps) {
  const variants = reducedMotion ? LEADER_VARIANTS_REDUCED : LEADER_VARIANTS;

  // Quadratic Bezier with control point pulled toward the leader's
  // midpoint plus a small offset so the curve arcs slightly. The
  // offset direction is perpendicular to the leader so the arc
  // routes around the figure rather than over it.
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const arc = Math.min(20, dist * 0.15);
  const controlX = midX + (dy / (dist || 1)) * (from.x < to.x ? -arc : arc);
  const controlY = midY - (dx / (dist || 1)) * (from.x < to.x ? -arc : arc);

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      width={container.width}
      height={container.height}
      viewBox={`0 0 ${container.width} ${container.height}`}
      className="pointer-events-none absolute left-0 top-0"
      style={{ zIndex: Z_LEADER_LINE }}
    >
      <motion.path
        key={regionId}
        d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
        fill="none"
        stroke="rgba(45, 165, 160, 0.7)"
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={reducedMotion ? { duration: 0.15 } : LEADER_TRANSITION}
      />
    </svg>
  );
}
