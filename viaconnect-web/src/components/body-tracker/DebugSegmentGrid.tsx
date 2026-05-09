'use client';

// Prompt #153 MT-08: dev-only landmark overlay. Renders a magenta
// crosshair and ID label at every segment center so coordinate
// values can be visually tuned against the rendered avatar. The
// component itself is always present in the codebase, but the
// SegmentalBodyFatAnalysis composer only mounts it when its
// showDebugGrid prop is true AND process.env.NODE_ENV is
// 'development', so it never reaches production.

import {
  COORDINATES_BY_SEX,
} from '@/lib/body-tracker/segmentCoordinates';
import { ALL_SEGMENTS, type Sex } from '@/lib/body-tracker/segments';

interface DebugSegmentGridProps {
  sex: Sex;
}

export function DebugSegmentGrid({ sex }: DebugSegmentGridProps) {
  const map = COORDINATES_BY_SEX[sex];
  return (
    <g data-testid="debug-segment-grid">
      {ALL_SEGMENTS.map((id) => {
        const c = map[id];
        return (
          <g key={id}>
            <line
              x1={c.x - 8}
              y1={c.y}
              x2={c.x + 8}
              y2={c.y}
              stroke="#FF00FF"
              strokeWidth={1.5}
            />
            <line
              x1={c.x}
              y1={c.y - 8}
              x2={c.x}
              y2={c.y + 8}
              stroke="#FF00FF"
              strokeWidth={1.5}
            />
            <text x={c.x + 10} y={c.y + 3} fontSize={8} fill="#FF00FF">
              {id}
            </text>
          </g>
        );
      })}
    </g>
  );
}
