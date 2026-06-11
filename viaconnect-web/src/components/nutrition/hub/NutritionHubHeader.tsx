'use client';

// Prompt 183 Task 3 (2026-06-10): My Nutrition hub header chrome.
//
// Mirrors the My Biology hub header (BodyTrackerHub.tsx header block):
// eyebrow pill with the bullet dot, H1, subline, and the "Guided by
// <agent>" pill top right with a Sparkles icon, hidden on mobile via
// hidden md:inline-flex. Presentational only; no data.
//
// The guide name flows through getDisplayName('gordon') per the standing
// rule that every agent slug reference in client-facing copy resolves
// through getDisplayName rather than a hardcoded string.

import { Sparkles } from 'lucide-react';
import { getDisplayName } from '@/lib/getDisplayName';

export function NutritionHubHeader() {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2DA5A0]">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#2DA5A0]"
          />
          MY NUTRITION
        </p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight text-white md:text-[26px]">
          Your nutrition at a glance
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62] md:text-[14px]">
          Eight surfaces, one hub. Tap any tile to dive in.
        </p>
      </div>
      <span
        aria-hidden="true"
        className="hidden flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75 backdrop-blur-sm md:inline-flex"
      >
        <Sparkles className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
        Guided by {getDisplayName('gordon')}
      </span>
    </header>
  );
}

export default NutritionHubHeader;
