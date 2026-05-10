'use client';

// Prompt #157k + #157m + #157q + #157r: tappable legend bar of
// region-name chips. Two layouts share the same underlying button
// + state model:
//
//   layout="row" (default, mobile + tablet): horizontal scrollable
//     toolbar of chips above the KPI strip. Same as the original
//     #157k LegendBar.
//
//   layout="ring" (desktop): 12 pills positioned at anatomical
//     anchors around the avatar's silhouette. Per #157r the prior
//     mathematical orbit (#157m circle, #157q ellipse) is replaced
//     with explicit (xPct, yPct, side) anchors so each pill sits
//     next to its muscle rather than on a uniform geometric curve.
//     The parent passes a className that sizes the overlay to
//     match the avatar's bounding box (aspect-ratio matched,
//     centered horizontally) so the percent-based anchors align
//     with the rendered silhouette. side controls the pill's
//     translation off the anchor so it never overlaps the body:
//     left -> pill sits to the left of the anchor x,
//     right -> pill sits to the right,
//     top -> pill sits above the anchor y,
//     bottom -> pill sits below. Pills stay upright (translate
//     only, no rotation). Sex-agnostic positions; the perimeter
//     anchor map is the same for male and female silhouettes
//     because the outline shape is similar at the label-position
//     resolution.
//
// Both layouts read pinnedIds + hoveredId from the same Zustand
// store so the active state stays in sync between the row legend
// (mobile) and the ring legend (desktop).

import { ALL_BODY_REGION_IDS, REGION_LABELS } from './constants';
import type { BodyRegionId } from './types';

type AnchorSide = 'left' | 'right' | 'top' | 'bottom';

interface LegendBarProps {
  readonly pinnedIds: readonly BodyRegionId[];
  readonly hoveredId: BodyRegionId | null;
  readonly onActivate: (id: BodyRegionId) => void;
  readonly className?: string;
  readonly layout?: 'row' | 'ring';
}

interface RingAnchor {
  readonly id: BodyRegionId;
  readonly xPct: number;
  readonly yPct: number;
  readonly side: AnchorSide;
}

// Prompt #157r: anatomical anchor positions for the 12 muscle-group
// pills. Coordinates are percent of the LegendBar overlay (which
// the parent sizes to match the avatar's bounding box via
// aspect-ratio). Each anchor's side controls how the pill is
// translated off the anchor point so the pill never overlaps the
// body silhouette. Centered-body labels (neck top, waist bottom)
// use top / bottom translation; paired side labels (shoulders /
// chest, biceps, forearms, quads, calves) use left / right.
// Shoulders + chest, both centered on the body in the underlying
// muscle anatomy, are split into upper-left / upper-right corner
// labels so the two pills do not stack vertically. xPct and yPct
// are tuned to hug the silhouette with 8 to 16 px of breathing
// room at the male avatar's actual 720x1152 viewBox ratio (the
// female 720x1008 viewBox is shorter, so female-side pills sit a
// touch farther outside the silhouette; acceptable since pills
// never overlap the body); the side translation pushes the pill
// body off the anchor in the direction indicated.
const RING_ANCHORS: readonly RingAnchor[] = [
  { id: 'neck',      xPct: 50, yPct:  4, side: 'top'    },
  { id: 'shoulders', xPct: 30, yPct: 18, side: 'left'   },
  { id: 'chest',     xPct: 70, yPct: 18, side: 'right'  },
  { id: 'l_bicep',   xPct: 18, yPct: 30, side: 'left'   },
  { id: 'r_bicep',   xPct: 82, yPct: 30, side: 'right'  },
  { id: 'l_forearm', xPct: 12, yPct: 42, side: 'left'   },
  { id: 'r_forearm', xPct: 88, yPct: 42, side: 'right'  },
  { id: 'waist',     xPct: 50, yPct: 50, side: 'top'    },
  { id: 'l_quad',    xPct: 22, yPct: 62, side: 'left'   },
  { id: 'r_quad',    xPct: 78, yPct: 62, side: 'right'  },
  { id: 'l_calf',    xPct: 28, yPct: 80, side: 'left'   },
  { id: 'r_calf',    xPct: 72, yPct: 80, side: 'right'  },
];

function getSideTranslation(side: AnchorSide): string {
  switch (side) {
    case 'left':   return 'translate(-100%, -50%)';
    case 'right':  return 'translate(0%, -50%)';
    case 'top':    return 'translate(-50%, -100%)';
    case 'bottom': return 'translate(-50%, 0%)';
  }
}

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
      >
        {RING_ANCHORS.map(({ id, xPct, yPct, side }) => {
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
                left: `${xPct}%`,
                top: `${yPct}%`,
                transform: getSideTranslation(side),
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
