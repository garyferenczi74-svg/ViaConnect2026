'use client';

// Prompt 193d (2026-06-12): the Your Genetic Blueprint card. ONE large card (the
// shared GeneticsHubTile chrome: media seam + legibility scrim + frame) that
// CONTAINS the section header and a seven card bento nested inside it: the
// GeneX360 Complete hero plus one inner card per panel (HormoneIQ, EpigenHQ,
// PeptideIQ, CannabisIQ, GeneXM, NutrigenDX). The seven cards live inside the
// large card, not as separate sibling tiles, exactly like the prior card held the
// GeneX360 Complete block inside it. The large card keeps the most prominent
// background media of the set (the hero DNA gradient) with its scrim, so the
// inner cards and the header read at WCAG AA over it.
//
// Layout. SOURCE ORDER EQUALS MOBILE ORDER: the hero first, then the six panels in
// the spec order. On mobile the inner grid is a single column; at sm it is two
// columns; at md and up it is the spec's four column asymmetric arrangement via
// col-span / row-span and CSS grid auto placement (no order or col-start needed):
//   hero        col-span-2 row-span-2  -> rows 1 to 2, cols 1 to 2 (the 2 by 2 anchor)
//   HormoneIQ                           -> row 1, col 3
//   EpigenHQ                            -> row 1, col 4
//   PeptideIQ                           -> row 2, col 3
//   CannabisIQ                          -> row 2, col 4
//   GeneXM      col-span-2              -> row 3, cols 1 to 2 (wide)
//   NutrigenDX  col-span-2              -> row 3, cols 3 to 4 (wide)
//
// The card is mounted into the My Genetics hub in the hero footprint
// (lg:col-span-4 lg:row-span-2), so it sits where the single hero card was.
//
// Standing rules honored: tokens only, Instrument Sans inherited, Lucide
// strokeWidth 1.5 (in the cards), no emojis, no em or en dashes, TypeScript strict.
// Presentation only: every card is a Link; no fetch, no write path, no new table.

import { GeneticsHubTile } from './GeneticsHubTile';
import { GENETICS_CARD_MEDIA } from './geneticsHubMedia';
import { BlueprintHeroCard, BlueprintPanelCard } from './BlueprintPanelCard';
import { PANEL_BENTO_META } from './blueprintBentoData';

interface GeneticBlueprintBentoProps {
  className?: string;
}

export function GeneticBlueprintBento({ className }: GeneticBlueprintBentoProps) {
  return (
    <section aria-labelledby="genetic-blueprint-heading" className={className}>
      {/* The one large Blueprint card. Carries the hero media + scrim + frame and
          contains everything: the header and the nested seven card bento. */}
      <GeneticsHubTile
        media={GENETICS_CARD_MEDIA.hero}
        mediaLogKey="blueprint"
        className="h-full"
        contentClassName="gap-5"
      >
        {/* Section header: eyebrow, title, subtitle. Kept above the bento; the
            bento replaces the old GeneX360 Complete block and its empty area. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2DA5A0]">
            Your DNA, decoded
          </span>
          <h2
            id="genetic-blueprint-heading"
            className="text-2xl font-semibold leading-tight text-white md:text-3xl"
          >
            Your Genetic Blueprint
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-white/70 md:text-sm">
            The full suite of 6 genetic panels in one comprehensive test
          </p>
        </div>

        {/* The nested seven card bento. Mobile: a single column in source order.
            sm: two columns. md and up: the four column asymmetric layout via
            col-span / row-span and grid auto placement. */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
          <BlueprintHeroCard className="sm:col-span-2 md:row-span-2" />
          <BlueprintPanelCard meta={PANEL_BENTO_META[0]} />
          <BlueprintPanelCard meta={PANEL_BENTO_META[1]} />
          <BlueprintPanelCard meta={PANEL_BENTO_META[2]} />
          <BlueprintPanelCard meta={PANEL_BENTO_META[3]} />
          <BlueprintPanelCard meta={PANEL_BENTO_META[4]} className="sm:col-span-2" />
          <BlueprintPanelCard meta={PANEL_BENTO_META[5]} className="sm:col-span-2" />
        </div>
      </GeneticsHubTile>
    </section>
  );
}

export default GeneticBlueprintBento;
