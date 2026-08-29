'use client';

// Prompt 183 Task 3 (2026-06-10): My Nutrition hub header chrome.
//
// Mirrors GeneticsHubHeader: eyebrow pill with the bullet dot, H1,
// subline, and a single HannahAIGuidedByChip top right. The chip is
// visible on mobile and desktop. Presentational only; no data.
//
// Owner guide copy (Gordon) lives in Getting Started / guide surfaces,
// not as a second header pill stacked with HannahAI.

import { HannahAIGuidedByChip } from '@/components/hannah/HannahAIGuidedByChip';
import {
  CONSUMER_EYEBROW_TEAL,
  CONSUMER_HUB_H1,
  CONSUMER_HUB_SUBLINE,
} from '@/lib/ui/consumerChrome';

export function NutritionHubHeader() {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={CONSUMER_EYEBROW_TEAL}>
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#2DA5A0]"
          />
          MY NUTRITION
        </p>
        <h1 className={CONSUMER_HUB_H1}>
          Your nutrition at a glance
        </h1>
        <p className={CONSUMER_HUB_SUBLINE}>
          Eight surfaces, one hub. Tap any tile to dive in.
        </p>
      </div>
      <HannahAIGuidedByChip />
    </header>
  );
}

export default NutritionHubHeader;
