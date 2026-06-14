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
// Prompt 193f (2026-06-13): below md the six panel cards collapse into a compact
// two column grid (the hero stays full width above them); md and up is unchanged.
// See the Layout note below and BlueprintPanelCard for the compact card treatment.
//
// Layout. SOURCE ORDER EQUALS MOBILE ORDER: the hero first, then the six panels in
// the array order. Below md the inner grid is the unchanged Prompt 193f compact TWO
// column grid: the hero spans full width (col-span-2) and the six panel cards sit
// side by side in three rows of two, in source/array order (no order classes apply
// below md). At md and up the grid is five columns by two rows: the hero runs full
// height on the LEFT at about 40% width (col-span-2 row-span-2), with the six panels
// in a 3 by 2 grid to its right, reordered for desktop only via md:order to:
//   row 1 -> GeneXM, NutrigenDX, HormoneIQ
//   row 2 -> EpigenHQ, PeptideIQ, CannabisIQ
// The array order is the mobile order and MUST NOT be reordered; the desktop visual
// order lives entirely in the md:order utilities.
//
// The card is mounted into the My Genetics hub as a full width band (lg:col-span-12),
// so it spans the whole container above Your Variants and the action row.
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

        {/* The nested seven card bento.
            Prompt 193f (2026-06-13): mobile (below md) is a compact TWO column grid
            so the six panel cards sit side by side, three rows of two, instead of
            full width stacked tiles. That roughly halves the section height on a
            phone and matches the Wellness Analytics two across reference. The hero
            stays full width above them (col-span-2, no md prefix), in source/array
            order with no order classes below md.
            Prompt 193g (2026-06-14): at md and up the grid is five columns by two
            rows. The hero keeps col-span-2 (now 40% at md) and md:row-span-2 so it
            runs full height on the left, and the six panels fill the right 3 by 2
            grid, reordered for DESKTOP ONLY via md:order to GeneXM, NutrigenDX,
            HormoneIQ then EpigenHQ, PeptideIQ, CannabisIQ. The two formerly wide
            cards (array index 4 and 5) drop their md:col-span-2 so all six panels are
            uniform single cells. The panel cards switch to their own compact
            presentation below md; see BlueprintPanelCard. */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5 md:grid-rows-2">
          <BlueprintHeroCard className="col-span-2 md:row-span-2 md:order-1" />
          <BlueprintPanelCard meta={PANEL_BENTO_META[0]} className="md:order-4" />
          <BlueprintPanelCard meta={PANEL_BENTO_META[1]} className="md:order-5" />
          <BlueprintPanelCard meta={PANEL_BENTO_META[2]} className="md:order-6" />
          <BlueprintPanelCard meta={PANEL_BENTO_META[3]} className="md:order-7" />
          <BlueprintPanelCard meta={PANEL_BENTO_META[4]} className="md:order-2" />
          <BlueprintPanelCard meta={PANEL_BENTO_META[5]} className="md:order-3" />
        </div>
      </GeneticsHubTile>
    </section>
  );
}

export default GeneticBlueprintBento;
