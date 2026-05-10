'use client';

// Prompt #157k: floating tappable legend bar of region-name chips.
// Provides keyboard + accessible alternative to precise muscle-zone
// hits on the figure. Active chips reflect the pinnedIds set with
// aria-pressed + a teal border accent.

import { ALL_BODY_REGION_IDS, REGION_LABELS } from './constants';
import type { BodyRegionId } from './types';

interface LegendBarProps {
  readonly pinnedIds: readonly BodyRegionId[];
  readonly hoveredId: BodyRegionId | null;
  readonly onActivate: (id: BodyRegionId) => void;
  readonly className?: string;
}

export function LegendBar({ pinnedIds, hoveredId, onActivate, className }: LegendBarProps) {
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
            aria-label={`${REGION_LABELS[id]} region${isPinned ? ', pinned' : ''}`}
            onClick={() => onActivate(id)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,165,160,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3054] ${
              isPinned
                ? 'border-[rgba(45,165,160,0.6)] bg-[rgba(45,165,160,0.18)] text-[#7AD7D2]'
                : isHovered
                  ? 'border-[rgba(45,165,160,0.45)] bg-[rgba(30,48,84,0.6)] text-[rgba(229,235,245,0.85)]'
                  : 'border-[rgba(45,165,160,0.2)] bg-[rgba(30,48,84,0.4)] text-[rgba(229,235,245,0.7)] hover:bg-[rgba(30,48,84,0.6)]'
            }`}
            style={{ scrollSnapAlign: 'start' }}
          >
            {REGION_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
