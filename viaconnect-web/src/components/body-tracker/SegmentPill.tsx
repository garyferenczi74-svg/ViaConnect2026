'use client';

// Prompt #153 MT-06: individual SVG pill rendered inside the parent
// BodyFigureSvg's viewBox. Pills live in the same coordinate space
// as the avatar image so they scale and align together at every
// breakpoint. Status drives fill color via the STATUS_FILL map; the
// stroke width follows the platform-wide 1.5 standard.

import { motion } from 'framer-motion';
import type { SegmentStatus } from '@/lib/body-tracker/segments';
import type { SegmentCoordinate } from '@/lib/body-tracker/segmentCoordinates';

interface SegmentPillProps {
  coordinate: SegmentCoordinate;
  status: SegmentStatus;
  testId?: string;
}

const STATUS_FILL: Record<SegmentStatus, string> = {
  fat_loss:  '#4ADE80',
  no_change: '#F4D03F',
  fat_gain:  '#F87171',
};

export function SegmentPill({ coordinate, status, testId }: SegmentPillProps) {
  const { x, y, pillWidth, pillHeight } = coordinate;
  const rx = pillHeight / 2;

  return (
    <motion.g
      data-testid={testId}
      data-status={status}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <rect
        x={x - pillWidth / 2}
        y={y - pillHeight / 2}
        width={pillWidth}
        height={pillHeight}
        rx={rx}
        ry={rx}
        fill={STATUS_FILL[status]}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={1.5}
      />
    </motion.g>
  );
}
