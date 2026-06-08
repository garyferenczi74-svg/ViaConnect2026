'use client';

// Prompt 180 (2026-06-08): one card in the My Biology Hub bento.
//
// Structure back to front (Section 6):
//   z 0: media layer (gradient, image, or video) via CardMedia.
//   z 1: legibility scrim so text stays readable over any frame.
//   z 2: content panel with the icon chip on the left and an optional
//        metric chip on the right; title, description, and the go
//        affordance below.
//
// A 2px top accent rule uses the card's accent token. The whole card
// is a single Next.js Link; the metric chip and icon chip are
// presentational only and do not steal focus.

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { SurfaceCard } from './hubConfig';
import { CardMedia } from './CardMedia';

interface BentoCardProps {
  surface: SurfaceCard;
  metricValue?: string;
}

const ACCENT_HEX: Record<SurfaceCard['accent'], string> = {
  teal: '#2DA5A0',
  orange: '#B75E18',
};

export function BentoCard({ surface, metricValue }: BentoCardProps) {
  const Icon = surface.icon;
  const accentHex = ACCENT_HEX[surface.accent];
  const ariaLabel = metricValue
    ? `${surface.title}: ${metricValue} ${surface.metricLabel}`
    : surface.title;

  return (
    <Link
      href={surface.href}
      aria-label={ariaLabel}
      className={`group relative isolate flex min-h-[180px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md transition-all duration-200 ease-out hover:border-white/[0.16] hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] ${surface.gridClass}`}
      data-hub-card={surface.id}
    >
      {/* 2px top accent rule. */}
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 z-[3] h-[2px]"
        style={{ backgroundColor: accentHex }}
      />

      {/* z 0: media layer. */}
      <CardMedia media={surface.media} />

      {/* z 1: legibility scrim over any media frame. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1A2744]/85 via-[#1A2744]/30 to-transparent"
      />

      {/* z 2: content panel. */}
      <div className="relative z-[2] flex h-full flex-col gap-3 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: accentHex }} />
          </span>
          {metricValue ? (
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
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-1">
          <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
            {surface.title}
          </h3>
          <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
            {surface.description}
          </p>
        </div>

        <div className="flex items-center gap-1 text-[12px] font-medium text-white/70 transition-colors group-hover:text-white motion-reduce:transition-none">
          <span>Open</span>
          <ChevronRight
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            strokeWidth={1.5}
          />
        </div>
      </div>
    </Link>
  );
}

export default BentoCard;
