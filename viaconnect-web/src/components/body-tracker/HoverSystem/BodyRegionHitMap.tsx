'use client';

// Prompt #157k: invisible hit-zone overlay sitting on top of the body
// figure. Each region rendered as a button-wrapped transparent rect
// so keyboard users can Tab to a region, screen readers can announce
// the metric + classification, and pointer users get a 44+px touch
// target even on narrow muscles. Hit rects are sized via
// REGION_HIT_RECTS_BY_SEX so the rect always covers (or exceeds)
// the underlying mask without spilling onto neighbors.

import { useCallback } from 'react';

import { REGION_LABELS, REGION_HIT_RECTS_BY_SEX } from './constants';
import type {
  BodyRegionData,
  BodyRegionId,
  Sex,
  TriggerSource,
} from './types';

interface BodyRegionHitMapProps {
  readonly sex: Sex;
  readonly regionsById: Readonly<Partial<Record<BodyRegionId, BodyRegionData>>>;
  readonly hoverEnabled: boolean;
  readonly onActivate: (id: BodyRegionId, source: TriggerSource) => void;
  readonly onHoverChange: (id: BodyRegionId | null) => void;
  readonly container: { readonly width: number; readonly height: number };
  readonly className?: string;
}

export function BodyRegionHitMap({
  sex,
  regionsById,
  hoverEnabled,
  onActivate,
  onHoverChange,
  container,
  className,
}: BodyRegionHitMapProps) {
  const rects = REGION_HIT_RECTS_BY_SEX[sex];

  const buildAriaLabel = useCallback(
    (id: BodyRegionId): string => {
      const label = REGION_LABELS[id];
      const data = regionsById[id];
      if (!data) return `${label} region. Press Enter to pin.`;
      return `${label}, ${data.metric.value.toFixed(1)} ${data.metric.unit}, ${data.classification}. Press Enter to pin.`;
    },
    [regionsById],
  );

  return (
    <div
      role="group"
      aria-label="Body region hit map"
      className={`pointer-events-none absolute inset-0 ${className ?? ''}`}
    >
      {(Object.keys(rects) as BodyRegionId[]).map((id) => {
        const r = rects[id];
        const cx = (r.xPct / 100) * container.width;
        const cy = (r.yPct / 100) * container.height;
        const w = (r.widthPct / 100) * container.width;
        const h = (r.heightPct / 100) * container.height;
        // Floor the hit rect at 44 x 44 px (touch target minimum).
        const finalW = Math.max(w, 44);
        const finalH = Math.max(h, 44);
        const left = cx - finalW / 2;
        const top = cy - finalH / 2;

        return (
          <button
            key={id}
            type="button"
            data-region={id}
            aria-label={buildAriaLabel(id)}
            onClick={() => onActivate(id, 'figure')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate(id, 'keyboard');
              }
            }}
            onPointerEnter={
              hoverEnabled
                ? () => onHoverChange(id)
                : undefined
            }
            onPointerLeave={
              hoverEnabled
                ? () => onHoverChange(null)
                : undefined
            }
            className="pointer-events-auto absolute cursor-pointer rounded-md bg-transparent transition-colors focus:outline-none focus-visible:bg-[rgba(45,165,160,0.08)] focus-visible:ring-2 focus-visible:ring-[rgba(45,165,160,0.7)]"
            style={{ left, top, width: finalW, height: finalH }}
          />
        );
      })}
    </div>
  );
}
