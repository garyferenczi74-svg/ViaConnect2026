'use client';

// Prompt 191 Task B (2026-06-12): My Genetics hub header chrome.
//
// Mirrors the My Nutrition hub header (NutritionHubHeader.tsx), which in
// turn mirrors the My Biology hub header: eyebrow pill with the bullet
// dot, H1, subline, and the "Guided by <agent>" pill top right with a
// Sparkles icon, hidden on mobile via hidden md:inline-flex.
// Presentational only; no data.
//
// Hannah is the genomics agent guiding My Genetics. The guide name flows
// through getDisplayName('hannah') per the standing rule that every agent
// slug reference in client-facing copy resolves through getDisplayName
// rather than a hardcoded string.

import { Sparkles } from 'lucide-react';
import { getDisplayName } from '@/lib/getDisplayName';

export function GeneticsHubHeader() {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2DA5A0]">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#2DA5A0]"
          />
          MY GENETICS
        </p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight text-white md:text-[26px]">
          Your genetics at a glance
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62] md:text-[14px]">
          Your variants and tests, one hub. Tap any tile to dive in.
        </p>
      </div>
      <span
        aria-hidden="true"
        className="hidden flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75 backdrop-blur-sm md:inline-flex"
      >
        <Sparkles className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
        Guided by {getDisplayName('hannah')}
      </span>
    </header>
  );
}

export default GeneticsHubHeader;
