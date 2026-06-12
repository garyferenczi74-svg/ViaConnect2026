'use client';

// Prompt 191 Task D (2026-06-12): the dominant My Genetics hero card.
//
// This single card IS both the spec's "Your Genetic Blueprint" hero (Section 3)
// AND the "GeneX360 Complete" card (Sections 5 / 9). The two are merged on
// purpose: running two competing dominant cards would split the eye, and a
// separate per user "blueprint status" hero would have to fabricate progress we
// do not have a real source for. One honest hero that doubles as the GeneX360
// Complete entry point avoids both problems.
//
// The WHOLE card is one true anchor: a Next.js <Link> to GENEX360_SHOP_HREF
// (/shop/genex360) wraps the shared GeneticsHubTile. Because the only
// interactive element is this one link, a whole card anchor is correct and
// supports middle click and cmd / ctrl click to open in a new tab, with normal
// same tab navigation on a plain click. This deliberately replaces the current
// page's JS only fake link (a generic element given link semantics plus a click
// handler), which the spec forbids.
//
// Content mirrors the current page's GeneX360 Complete treatment: the "Most
// Popular" pill, the six panel name chips (with their trademark marks), the
// GeneX360 description copy, and a "500+ variants" line. "GeneX360™
// Complete" is kept literally present in the markup: it is the named element the
// acceptance criterion checks. The ™ trademark mark is allowed and is NOT
// an em or en dash.
//
// Standing rules honored: tokens only (Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, Orange #B75E18, white opacity neutrals), Lucide strokeWidth 1.5,
// Instrument Sans inherited, no emojis, no em or en dashes, TypeScript strict
// (no any). Presentation only: no fetch, no write path, no new table.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GeneticsHubTile } from './GeneticsHubTile';
import { GENETICS_CARD_MEDIA } from './geneticsHubMedia';
import { GENEX360_SHOP_HREF } from './geneticsHubLinks';

// The six GeneX360 sub panel names, carried verbatim (with their trademark
// marks) from the current /genetics page PANELS[0].subPanels so the chip set
// matches what the storefront already teaches.
const PANEL_CHIPS = [
  'GeneX-M™',
  'NutrigenDX™',
  'HormoneIQ™',
  'EpigenHQ™',
  'PeptideIQ™',
  'CannabisIQ™',
] as const;

// GeneX360 description copy, carried verbatim from PANELS[0].description.
const BLUEPRINT_BLURB = 'The full suite of 6 genetic panels in one comprehensive test';

interface GeneticBlueprintHeroCardProps {
  className?: string;
}

export function GeneticBlueprintHeroCard({ className }: GeneticBlueprintHeroCardProps) {
  return (
    <Link
      href={GENEX360_SHOP_HREF}
      aria-label="Your Genetic Blueprint. Explore GeneX360 Complete, the full suite of six genetic panels."
      className={`group block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] ${className ?? ''}`}
    >
      <GeneticsHubTile
        media={GENETICS_CARD_MEDIA.hero}
        mediaLogKey="hero"
        className="h-full min-h-[280px] transition-colors duration-300 group-hover:border-[#2DA5A0]/40 md:min-h-[360px]"
        contentClassName="justify-between gap-5"
      >
        {/* Top block: eyebrow, hero title, blurb. */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2DA5A0]">
            Your DNA, decoded
          </span>
          <h2 className="text-2xl font-semibold leading-tight text-white md:text-3xl">
            Your Genetic Blueprint
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-white/70 md:text-sm">
            {BLUEPRINT_BLURB}
          </p>
        </div>

        {/* Middle block: the named GeneX360 Complete element + the Most Popular
            pill, then the six panel chips, then the variants line. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-white md:text-lg">
              GeneX360&trade; Complete
            </span>
            <span
              className="inline-flex items-center rounded-full border border-[#2DA5A0]/30 px-2.5 py-0.5 text-[11px] font-medium text-[#2DA5A0]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(45,165,160,0.20), rgba(183,94,24,0.15))',
              }}
            >
              Most Popular
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PANEL_CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/55"
              >
                {chip}
              </span>
            ))}
          </div>

          <span className="text-[12px] tabular-nums text-white/55">500+ variants</span>
        </div>

        {/* Bottom block: the call to action affordance. Presentational only (the
            whole card is the Link); it carries no nested anchor or button. */}
        <div className="mt-auto flex items-center gap-2 pt-1 text-[13px] font-semibold text-white md:text-sm">
          <span>Explore GeneX360&trade; Complete</span>
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={1.5}
          />
        </div>
      </GeneticsHubTile>
    </Link>
  );
}

export default GeneticBlueprintHeroCard;
