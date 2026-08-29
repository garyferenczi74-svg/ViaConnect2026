'use client';

// Prompt 180, refactored in Prompt 205: one card in the My Biology Hub bento.
// The frame chrome (hub-card-frame, media seam, scrim, content column) now comes
// from the shared BentoTile; this component supplies the nav content (metric
// chip, title, description, Open pill). Rendered output is unchanged.
//
// The whole card is a single Next.js Link via BentoTile href; the metric chip
// is presentational only and does not steal focus.

import { ChevronRight } from 'lucide-react';
import type { SurfaceCard } from './hubConfig';
import { BentoTile } from '@/components/ui/BentoTile';
import {
  CONSUMER_CARD_SUBHEAD,
  CONSUMER_CARD_TITLE,
  CONSUMER_METRIC_LABEL,
  CONSUMER_OPEN_PILL_GROUP,
} from '@/lib/ui/consumerChrome';

interface BentoCardProps {
  surface: SurfaceCard;
  metricValue?: string;
}

export function BentoCard({ surface, metricValue }: BentoCardProps) {
  const ariaLabel = metricValue
    ? `${surface.title}: ${metricValue} ${surface.metricLabel}`
    : surface.title;
  // Prompt 180e: the featured Dashboard card keeps Open in flow (bottom left
  // under the description). Every other card pins Open to the bottom right.
  const isFeatured = surface.id === 'dashboard';

  return (
    <BentoTile
      href={surface.href}
      ariaLabel={ariaLabel}
      dataHubCard={surface.id}
      interactive
      media={surface.media}
      className={`min-h-[200px] ${surface.gridClass}`}
      contentClassName="gap-3"
    >
      {metricValue ? (
        <div className="flex items-start justify-end">
          <span
            className="inline-flex max-w-[55%] flex-col items-end rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-right backdrop-blur-sm"
            aria-hidden="true"
          >
            <span className="font-mono text-[13px] font-semibold tabular-nums text-white">
              {metricValue}
            </span>
            <span className={CONSUMER_METRIC_LABEL}>
              {surface.metricLabel}
            </span>
          </span>
        </div>
      ) : null}

      <div className={`mt-auto flex flex-col gap-1 ${isFeatured ? '' : 'pb-14 pr-20'}`}>
        <h3 className={CONSUMER_CARD_TITLE}>
          {surface.id === 'composition' ? (
            // Prompt 210j: two-tone FormaVision wordmark + Body Composition.
            <>
              <span className="text-[#B75E18]">Forma</span>
              <span className="text-white">Vision</span>
              <span className="text-white"> Body Composition</span>
            </>
          ) : (
            surface.title
          )}
        </h3>
        <p className={`${CONSUMER_CARD_SUBHEAD} ${isFeatured ? '' : 'line-clamp-2'}`}>
          {surface.description}
        </p>
      </div>

      {/* Gary (2026-06-11): Open pill background halved so the card media reads
          through it, matching the nutrition hub Open pills. */}
      <div className={`${CONSUMER_OPEN_PILL_GROUP} ${isFeatured ? 'self-start' : 'absolute bottom-4 right-4 md:bottom-5 md:right-5'}`}>
        <span>Open</span>
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          strokeWidth={1.5}
        />
      </div>
    </BentoTile>
  );
}

export default BentoCard;
