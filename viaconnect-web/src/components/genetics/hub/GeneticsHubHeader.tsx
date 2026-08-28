'use client';

// Prompt 191 Task B (2026-06-12): My Genetics hub header chrome.
//
// Mirrors the My Nutrition hub header (NutritionHubHeader.tsx), which in
// turn mirrors the My Biology hub header: eyebrow pill with the bullet
// dot, H1, subline, and a clickable HannahAIGuidedByChip top right.
// The chip is visible on mobile and desktop. Presentational only.
//
// The genomics guide chip copy flows through getDisplayName('hannahai')
// inside HannahAIGuidedByChip. Clicking the chip opens a compact popover
// anchored under the pill.

import { HannahAIGuidedByChip } from '@/components/hannah/HannahAIGuidedByChip';

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
          The Next Revolution in Wellness is Personalization. Tap any tile to dive in.
        </p>
      </div>
      <HannahAIGuidedByChip />
    </header>
  );
}

export default GeneticsHubHeader;
