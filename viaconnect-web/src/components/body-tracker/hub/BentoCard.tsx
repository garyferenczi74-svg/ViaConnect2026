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
      className={`min-h-[180px] ${surface.gridClass}`}
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
            <span className="text-[10px] uppercase tracking-wide text-white/55">
              {surface.metricLabel}
            </span>
          </span>
        </div>
      ) : null}

      <div className={`mt-auto flex flex-col gap-1 ${isFeatured ? '' : 'pb-10 pr-16'}`}>
        <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
          {surface.title}
        </h3>
        <p className={`text-[12px] leading-relaxed text-white/[0.62] md:text-[13px] ${isFeatured ? '' : 'line-clamp-2'}`}>
          {surface.description}
        </p>
      </div>

      {/* Gary (2026-06-11): Open pill background halved so the card media reads
          through it, matching the nutrition hub Open pills. */}
      <div className={`inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-md transition-all duration-200 group-hover:border-[#5B8DEF]/55 group-hover:bg-[#2A4C9E]/20 motion-reduce:transition-none ${isFeatured ? 'self-start' : 'absolute bottom-4 right-4 md:bottom-5 md:right-5'}`}>
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
