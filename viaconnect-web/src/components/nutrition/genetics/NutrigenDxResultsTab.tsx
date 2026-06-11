'use client';

// Prompt 187 Task 4 (2026-06-11): Tab 1 scaffold for the Nutrition by
// Genetics page. NO real or mock marker data renders here, ever. Prompt 188
// (NutrigenDX panel ingestion) fills this tab against the exported
// NutrigenDxResultSet contract in src/lib/nutrition/genetics/types.ts
// (panelId, collectedDate, processedDate, markers, findings). Until then the
// tab has exactly two states: PENDING (a paid kit with no delivered results)
// and EMPTY.
//
// The empty state also carries the two quiet links that used to live on the
// hub's genetics expand panel (See NutrigenDX panels at /genetics, Review
// Nutrition Results at /nutrition/guide), so nothing from the old panel is
// lost.

import Link from 'next/link';
import { Dna, FlaskConical, Upload } from 'lucide-react';
import { useSetNutritionTab } from '@/components/nutrition/NutritionTabs';

export interface NutrigenDxResultsTabProps {
  readonly nutrigenDxPending: boolean;
}

export function NutrigenDxResultsTab({ nutrigenDxPending }: NutrigenDxResultsTabProps) {
  // Primary ?tab= switcher, used by the empty state's upload handoff button.
  const setTab = useSetNutritionTab();

  if (nutrigenDxPending) {
    return (
      <div className="rounded-2xl border border-[#2DA5A0]/30 bg-[#1E3054] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10"
          >
            <FlaskConical className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight text-white md:text-base">
              Your NutrigenDX results are processing
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62]">
              Your sample is with the lab. Your results will appear here as soon as they are
              ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
        >
          <Dna className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight text-white md:text-base">
            No NutrigenDX results yet
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62]">
            Your NutrigenDX results will appear here once your testing is complete.
          </p>

          <button
            type="button"
            onClick={() => setTab('upload')}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.18] px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md transition-all duration-200 hover:border-[#2DA5A0]/60 hover:bg-[#2DA5A0]/[0.28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            <Upload aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            <span>Have results from another company? Upload them here.</span>
          </button>

          <div className="mt-4 flex flex-col gap-2 text-[12px] sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/genetics"
              className="text-white/55 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              See NutrigenDX panels
            </Link>
            <Link
              href="/nutrition/guide"
              className="text-white/55 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Review Nutrition Results
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NutrigenDxResultsTab;
