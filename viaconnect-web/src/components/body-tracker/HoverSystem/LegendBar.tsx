'use client';

// Prompt #157k + #157m: tappable legend bar of region-name chips.
// Two layouts share the same underlying button + state model:
//
//   layout="row" (default, mobile + tablet): horizontal scrollable
//     toolbar of chips above the KPI strip. Same as the original
//     #157k LegendBar.
//
//   layout="ring" (desktop): 12 pills positioned on a circular ring
//     around the avatar at 30 degree intervals, clockwise from 12
//     o'clock. The ring radius is computed via container query
//     units (50cqh + 24px) so the ring scales with the avatar's
//     rendered height without JS observers; the parent must be the
//     positioning context (relative + container-query host).
//
// Both layouts read pinnedIds + hoveredId from the same Zustand
// store so the active state stays in sync between the row legend
// (mobile) and the ring legend (desktop).

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
  readonly angleDeg: number;
}

// 12 positions, clockwise from 12 o'clock. Anatomical reading:
// neck top, chest at 1, right arm chain (R bicep, R forearm),
// right leg chain (R quad, R calf), waist at 6, left leg chain
// (L calf, L quad), left arm chain (L forearm, L bicep), shoulders
// at 11 capping the upper-left to balance chest at 1.
const RING_POSITIONS: readonly RingPosition[] = [
  { id: 'neck',      angleDeg:   0 },
  { id: 'chest',     angleDeg:  30 },
  { id: 'r_bicep',   angleDeg:  60 },
  { id: 'r_forearm', angleDeg:  90 },
  { id: 'r_quad',    angleDeg: 120 },
  { id: 'r_calf',    angleDeg: 150 },
  { id: 'waist',     angleDeg: 180 },
  { id: 'l_calf',    angleDeg: 210 },
  { id: 'l_quad',    angleDeg: 240 },
  { id: 'l_forearm', angleDeg: 270 },
  { id: 'l_bicep',   angleDeg: 300 },
  { id: 'shoulders', angleDeg: 330 },
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
        style={{ containerType: 'size' }}
      >
        {RING_POSITIONS.map(({ id, angleDeg }) => {
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
                transform: `translate(-50%, -50%) rotate(${angleDeg}deg) translateY(calc(-50cqh - 24px)) rotate(${-angleDeg}deg)`,
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
