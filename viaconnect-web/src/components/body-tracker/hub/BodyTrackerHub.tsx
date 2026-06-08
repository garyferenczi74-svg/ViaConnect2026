'use client';

// Prompt 180 (2026-06-08): My Biology Hub composer.
//
// Renders, top to bottom:
//   1. Header (eyebrow + h1 + subhead + Guided by Arnold pill).
//   2. GuidanceStrip (Getting Started / Refresh placeholder).
//   3. The six surface bento grid mapped from SURFACES.
//   4. ConnectionsStrip (apps and wearables data layer).
//
// Grid layout per Section 5:
//   Mobile (under 560px): single column, source order.
//   Tablet (560 to 1024px): two columns, Dashboard and Metabolic each
//     span both, the rest take one.
//   Desktop (1024px+): six columns, auto rows ~180px, Dashboard
//     featured at col span 4 / row span 2; Body Composition + Progress
//     stack on the right; Weight + Milestones + Metabolic form the
//     bottom triad. Source order preserved so grid auto placement
//     produces this without explicit lines.

import { Sparkles } from 'lucide-react';
import { SURFACES } from './hubConfig';
import { BentoCard } from './BentoCard';
import { GuidanceStrip } from './GuidanceStrip';
import { ConnectionsStrip } from './ConnectionsStrip';
import { useHubMetrics } from './useHubMetrics';

export function BodyTrackerHub() {
  const { metrics } = useHubMetrics();

  return (
    <div className="font-[Instrument_Sans] flex flex-col gap-4 md:gap-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2DA5A0]">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[#2DA5A0]"
            />
            My Biology
          </p>
          <h1 className="mt-1 text-[22px] font-semibold leading-tight text-white md:text-[26px]">
            Your biology at a glance
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62] md:text-[14px]">
            Six surfaces, one hub. Tap any tile to dive in.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="hidden flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75 backdrop-blur-sm md:inline-flex"
        >
          <Sparkles className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
          Guided by Arnold
        </span>
      </header>

      {/* Getting Started strip (placeholder per Section 11). */}
      <GuidanceStrip />

      {/* The six surface bento grid. */}
      <div
        className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5 lg:grid-cols-6 lg:auto-rows-[180px] lg:gap-[14px]"
        aria-label="Body Tracker surfaces"
      >
        {SURFACES.map((surface) => (
          <BentoCard
            key={surface.id}
            surface={surface}
            metricValue={(metrics as Record<string, string | undefined>)[surface.metricKey]}
          />
        ))}
      </div>

      {/* Connections strip (foundation layer). */}
      <ConnectionsStrip />
    </div>
  );
}

export default BodyTrackerHub;
