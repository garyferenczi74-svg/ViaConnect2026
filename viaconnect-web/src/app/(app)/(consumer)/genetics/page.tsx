// Prompt 191 Task E (2026-06-12): /genetics is now a thin wrapper around the
// My Genetics bento hub. The prior long scroll page (the full bleed mobile hero
// background, the inline panel + variant data, the Your Variants explorer
// section, the SNP catalog section, the inline DNA + lab dropzones, the GeneX360
// Complete hero, the six standalone panel cards, and the order CTA) is
// superseded here: the hub assembles the Task A to D pieces into the banded
// bento, and the six per panel cards are absorbed into the Your Variants card's
// six test pill tabs. The sibling /genetics/upload and /genetics/[panelId]
// routes are untouched and still reachable.
//
// This is a SERVER component (no client directive), so exporting metadata is
// safe. The hub body sits on plain Deep Navy (#1A2744). A Suspense boundary
// wraps the hub because YourVariantsCard calls useSearchParams (to read
// ?test=), which requires a Suspense ancestor or the production build errors.

import { Suspense } from 'react';
import { GeneticsHub } from '@/components/genetics/hub/GeneticsHub';

export const metadata = {
  title: 'My Genetics',
};

export default function GeneticsPage() {
  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <Suspense fallback={<div className="h-12" />}>
        <GeneticsHub />
      </Suspense>
    </div>
  );
}
