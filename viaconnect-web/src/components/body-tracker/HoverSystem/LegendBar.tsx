'use client';

// Prompt #157k + #157m + #157q: tappable legend bar of region-name chips.
// Two layouts share the same underlying button + state model:
//
//   layout="row" (default, mobile + tablet): horizontal scrollable
//     toolbar of chips above the KPI strip. Same as the original
//     #157k LegendBar.
//
//   layout="ring" (desktop): 12 pills positioned on an elliptical
//     ring around the avatar at 30 degree intervals, clockwise from
//     12 o'clock. Per #157q the ring is an ellipse rather than a
//     circle: the horizontal radius (--ring-rx) follows the avatar's
//     half-width and the vertical radius (--ring-ry) follows the
//     avatar's half-height, each plus 16px breathing room. The
//     avatar fills the avatar-container's height (lg:h-full on the
//     SegmentalHeatMap wrapper) so 100cqh maps to the avatar's
//     rendered height; --avatar-width is derived from --avatar-height
//     using the canonical 1:2.1 portrait aspect ratio per #157h.
//     Each pill's translation is calc(--ring-rx * xFactor) on x and
//     calc(--ring-ry * yFactor) on y, where xFactor and yFactor are
//     pre-computed sin/-cos of the angular position. Pills stay
//     upright (translate-only, no rotation). The parent must be the
//     positioning context (relative + container-query host).
//
// Both layouts read pinnedIds + hoveredId from the same Zustand
// store so the active state stays in sync between the row legend
// (mobile) and the ring legend (desktop).

import type { CSSProperties } from 'react';
import { ALL_BODY_REGION_IDS, REGION_LABELS } from './constants';
import type { BodyRegionId } from './types';

interface LegendBarProps {
  readonly pinnedIds: readonly BodyRegionId[];
  readonly hoveredId: BodyRegionId | null;
  readonly onActivate: (id: BodyRegionId) => void;
  readonly className?: string;
  readonly layout?: 'row' | 'ring';
}

interface RingPosition {
  readonly id: BodyRegionId;
  readonly xFactor: number;
  readonly yFactor: number;
}

// 12 positions, clockwise from 12 o'clock. Anatomical reading:
// neck top, chest at 1, right arm chain (R bicep, R forearm),
// right leg chain (R quad, R calf), waist at 6, left leg chain
// (L calf, L quad), left arm chain (L forearm, L bicep), shoulders
// at 11 capping the upper-left to balance chest at 1.
//
// Prompt #157q: xFactor and yFactor are unitless multipliers in
// the range [-1, 1] derived from each pill's angular position
// (xFactor = sin(angle), yFactor = -cos(angle); negative cos
// because screen y increases downward and 12 o'clock has y less
// than the center). At render time each factor multiplies the
// ring's horizontal or vertical radius to place the pill on the
// ellipse. Pre-computed; do not recompute at runtime.
const RING_POSITIONS: readonly RingPosition[] = [
  { id: 'neck',      xFactor:  0.000, yFactor: -1.000 },
  { id: 'chest',     xFactor:  0.500, yFactor: -0.866 },
  { id: 'r_bicep',   xFactor:  0.866, yFactor: -0.500 },
  { id: 'r_forearm', xFactor:  1.000, yFactor:  0.000 },
  { id: 'r_quad',    xFactor:  0.866, yFactor:  0.500 },
  { id: 'r_calf',    xFactor:  0.500, yFactor:  0.866 },
  { id: 'waist',     xFactor:  0.000, yFactor:  1.000 },
  { id: 'l_calf',    xFactor: -0.500, yFactor:  0.866 },
  { id: 'l_quad',    xFactor: -0.866, yFactor:  0.500 },
  { id: 'l_forearm', xFactor: -1.000, yFactor:  0.000 },
  { id: 'l_bicep',   xFactor: -0.866, yFactor: -0.500 },
  { id: 'shoulders', xFactor: -0.500, yFactor: -0.866 },
];

const PILL_BASE =
  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,165,160,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3054]';

function pillStateClasses(isPinned: boolean, isHovered: boolean): string {
  if (isPinned) {
    return 'border-[rgba(45,165,160,0.6)] bg-[rgba(45,165,160,0.18)] text-[#7AD7D2]';
  }
  if (isHovered) {
    return 'border-[rgba(45,165,160,0.45)] bg-[rgba(30,48,84,0.6)] text-[rgba(229,235,245,0.85)]';
  }
  return 'border-[rgba(45,165,160,0.2)] bg-[rgba(30,48,84,0.4)] text-[rgba(229,235,245,0.7)] hover:bg-[rgba(30,48,84,0.6)]';
}

function buildAriaLabel(id: BodyRegionId, isPinned: boolean): string {
  return `${REGION_LABELS[id]} region${isPinned ? ', pinned' : ''}`;
}

export function LegendBar({
  pinnedIds,
  hoveredId,
  onActivate,
  className,
  layout = 'row',
}: LegendBarProps) {
  if (layout === 'ring') {
    return (
      <div
        role="toolbar"
        aria-label="Body region ring"
        className={`pointer-events-none ${className ?? ''}`}
        style={{
          containerType: 'size',
          '--avatar-height': '100cqh',
          '--avatar-width': 'calc(var(--avatar-height) / 2.1)',
          '--ring-rx': 'calc(var(--avatar-width) / 2 + 16px)',
          '--ring-ry': 'calc(var(--avatar-height) / 2 + 16px)',
        } as CSSProperties}
      >
        {RING_POSITIONS.map(({ id, xFactor, yFactor }) => {
          const isPinned = pinnedIds.includes(id);
          const isHovered = hoveredId === id;
          return (
            <button
              key={id}
              type="button"
              data-region={id}
              aria-pressed={isPinned}
              aria-label={buildAriaLabel(id, isPinned)}
              onClick={() => onActivate(id)}
              className={`pointer-events-auto absolute whitespace-nowrap ${PILL_BASE} ${pillStateClasses(isPinned, isHovered)}`}
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translateX(calc(var(--ring-rx) * ${xFactor})) translateY(calc(var(--ring-ry) * ${yFactor}))`,
              }}
            >
              {REGION_LABELS[id]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Body region quick access"
      className={`flex w-full items-center gap-2 overflow-x-auto px-2 py-1 scroll-smooth lg:flex-wrap lg:overflow-visible ${className ?? ''}`}
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {ALL_BODY_REGION_IDS.map((id) => {
        const isPinned = pinnedIds.includes(id);
        const isHovered = hoveredId === id;
        return (
          <button
            key={id}
            type="button"
            data-region={id}
            aria-pressed={isPinned}
            aria-label={buildAriaLabel(id, isPinned)}
            onClick={() => onActivate(id)}
            className={`shrink-0 ${PILL_BASE} ${pillStateClasses(isPinned, isHovered)}`}
            style={{ scrollSnapAlign: 'start' }}
          >
            {REGION_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
