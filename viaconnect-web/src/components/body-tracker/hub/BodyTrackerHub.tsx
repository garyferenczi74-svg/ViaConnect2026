'use client';

// Prompt 180 (2026-06-08): My Biology Hub composer.
//
// Renders, top to bottom:
//   1. Header (eyebrow + h1 + subhead + HannahAIGuidedByChip).
//   2. GuidanceStrip (Getting Started / Refresh placeholder).
//   3. The six surface bento grid mapped from SURFACES.
//   4. ConnectionsStrip (apps and wearables data layer).
//
// Grid layout (Prompt 221C):
//   Mobile: single column, source order.
//   Tablet (md): two columns; Dashboard spans both; remaining cards
//     take one (Weight / Milestones / Metabolic / Hormones = 2x2).
//   Desktop (lg): twelve columns, auto rows ~180px. Dashboard featured
//     at col span 8 / row span 2; Body Composition + Progress stack on
//     the right at col span 4; Weight + Milestones + Metabolic + Hormones
//     form an equal four-card row at col span 3 each.

import Link from 'next/link';
import { FlaskConical, ArrowRight } from 'lucide-react';
import { SURFACES } from './hubConfig';
import { BentoCard } from './BentoCard';
import { GuidanceStrip } from './GuidanceStrip';
import { ConnectionsStrip } from './ConnectionsStrip';
import { AssessmentRetakeCard } from './AssessmentRetakeCard';
import { useHubMetrics } from './useHubMetrics';
import { HannahAIGuidedByChip } from '@/components/hannah/HannahAIGuidedByChip';

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
            Your biology surfaces in one hub. Tap any tile to dive in.
          </p>
        </div>
        <HannahAIGuidedByChip />
      </header>

      {/* Getting Started strip (placeholder per Section 11). */}
      <GuidanceStrip />

      {/* Surface bento grid (221C: four-card bottom row on 12-col desktop). */}
      <div
        className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5 lg:grid-cols-12 lg:auto-rows-[180px] lg:gap-[14px]"
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

      {/* Lab Results entry (Prompt 204c). A slim link below the bento, so the
          validated six-card grid above is untouched. */}
      <Link
        href="/lab-results"
        className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 px-4 py-3 no-underline transition-colors hover:border-white/20"
      >
        <span className="flex items-center gap-2.5">
          <FlaskConical className="h-5 w-5 flex-none text-[#2DA5A0]" strokeWidth={1.5} />
          <span>
            <span className="block text-sm font-semibold text-white">Lab Results</span>
            <span className="block text-[12px] text-white/55">
              Your biomarkers with genetic optimal ranges and trends
            </span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 flex-none text-white/40" strokeWidth={1.5} />
      </Link>

      {/* Connections strip (foundation layer). */}
      <ConnectionsStrip />

      {/* Update Your Assessment card (mirrors the My Supplements design). */}
      <AssessmentRetakeCard />
    </div>
  );
}

export default BodyTrackerHub;
