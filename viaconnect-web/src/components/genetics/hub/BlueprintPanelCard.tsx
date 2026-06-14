'use client';

// Prompt 193d (2026-06-12): the inner cards of the Your Genetic Blueprint bento.
// These render INSIDE the one large Blueprint card (GeneticBlueprintBento owns the
// outer GeneticsHubTile chrome: the media seam, the legibility scrim, the frame),
// so each inner card is a light surface (a bordered, faintly tinted panel) rather
// than a second full hub tile. Each is still a navigable entry point: the whole
// inner card is a Next.js <Link>. BlueprintPanelCard renders one of the six panel
// cards; BlueprintHeroCard renders the dominant GeneX360 Complete card with the
// Most Popular badge, the 500+ variants stat, and the primary call to action.
//
// Prompt 193f (2026-06-13): below md BlueprintPanelCard renders a COMPACT variant
// for the two column mobile grid: a frosted Card surface (no per card photo), a
// leading accent icon, the panel name, and the count chip; the descriptor and the
// background media are gated to md and up, where the card is byte for byte the
// Prompt 193d card. BlueprintHeroCard is untouched at every width.
//
// Display name, descriptor, and count come from PANEL_BY_SLUG (panels.ts) and are
// never duplicated here. The trademark mark is shown on first mention in an
// aria-hidden span so the accessible name stays clean; the trademark symbol is
// allowed and is not an em or en dash.
//
// Legibility: the outer large card already lays a navy scrim over its media, so
// text on these inner cards reads at WCAG AA. The inner cards add only a faint
// accent tint, never live text directly on busy media.
//
// Standing rules honored: tokens only (Deep Navy #1A2744, Teal #2DA5A0, Orange
// #B75E18, white opacity neutrals), Lucide strokeWidth 1.5, Instrument Sans
// inherited, no emojis, no em or en dashes, TypeScript strict (no any).

import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { PANEL_BY_SLUG } from '@/data/genex360/panels';
import { blueprintPanelHref, HERO_BENTO_META, type PanelBentoMeta } from './blueprintBentoData';
import { CardMedia } from '@/components/body-tracker/hub/CardMedia';
import { GENETICS_CARD_MEDIA } from './geneticsHubMedia';

// Whole inner card link chrome: a focus visible ring on the Card surface and a
// full height block so the card fills its grid cell (the hero fills its 2 by 2
// span, the panels fill their single cells).
const CARD_LINK =
  'group block h-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]';

interface BlueprintPanelCardProps {
  meta: PanelBentoMeta;
  className?: string;
}

export function BlueprintPanelCard({ meta, className }: BlueprintPanelCardProps) {
  const panel = PANEL_BY_SLUG[meta.slug];
  // Short count chip, derived from the panel markerCount plus the unit noun, so
  // the count stays in sync with panels.ts and is never duplicated copy.
  const countChip = `${panel.markerCount} ${meta.unit}`;
  // One discernible accessible name folding the visible content into a phrase.
  const accessibleName = `${panel.displayName}, ${panel.subtitle}, ${countChip}, view panel`;
  // An optional per card background media (only some panels carry one). When
  // present, the card layers CardMedia + a scrim behind the content; otherwise it
  // stays a flat tinted surface.
  const media = meta.media;
  // Prompt 193f: the leading Lucide icon for the compact mobile card. It shows only
  // below md (the desktop 193d card carries no icon, by Gary's 193d decision). Teal
  // for the assessment panels, orange for the two educational panels, matching the
  // data accent so the compact grid keeps the same educational distinction.
  const Icon = meta.icon;
  const accentText = meta.accent === 'orange' ? 'text-[#B75E18]' : 'text-[#2DA5A0]';

  return (
    <Link
      href={blueprintPanelHref(meta.slug)}
      aria-label={accessibleName}
      className={`${CARD_LINK} ${className ?? ''}`}
    >
      {/* Prompt 193f: below md this is a COMPACT card in a two column grid: a
          frosted Card surface (no per card photo, matching the Wellness Analytics
          reference), a leading icon, the panel name, and the count chip. At md and
          up it is UNCHANGED from Prompt 193d: the per card media fills it (the
          frosted fill drops to transparent) and the descriptor returns. */}
      <div className="relative isolate flex h-full flex-col justify-between gap-2 overflow-hidden rounded-xl border border-white/[0.12] bg-[#1E3054]/80 p-3 transition-colors duration-300 group-hover:border-[#2DA5A0]/50 md:bg-transparent">
        {/* z0: the optional background media (image or video). Gated to md and up
            inside an absolutely positioned wrapper so the compact mobile card stays
            a calm frosted surface and the video neither loads nor plays on a phone,
            while the md+ fill and z order stay byte for byte the Prompt 193d card
            (the wrapper is absolute, so it never joins the flex flow). */}
        {media ? (
          <div className="absolute inset-0 z-0 hidden md:block">
            <CardMedia media={media} logKey={`blueprint-${meta.slug}`} />
          </div>
        ) : null}
        {/* z1: a light navy tint only, NO backdrop blur, so the video stays sharp
            and watchable. Readability comes from this light wash plus the strong
            text shadow on the type below, never from blurring or heavily darkening
            the frame. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-[#1A2744]/35"
        />
        {/* z2: content. The white type carries a soft shadow so it holds up over a
            bright frame without needing to darken the glass. */}
        <div className="relative z-[2] flex flex-col gap-1.5">
          {/* Prompt 193f: leading icon, compact mobile card only (hidden at md+, so
              the Prompt 193d desktop card stays icon free). */}
          <Icon
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 ${accentText} drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] md:hidden`}
            strokeWidth={1.5}
          />
          <h3 className="text-[13px] font-semibold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
            {panel.displayName}
            <span aria-hidden="true">&trade;</span>
          </h3>
          {/* Descriptor: md and up only. Dropped on the compact mobile card so the
              cards stay short and equal height; the full descriptor still lives on
              the panel report and in this card's accessible name. */}
          <p className="hidden text-[11px] leading-snug text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] md:block line-clamp-2">
            {panel.subtitle}
          </p>
        </div>
        <div className="relative z-[2] flex items-center justify-between gap-2">
          <span className="rounded-full border border-white/15 bg-[#1A2744]/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/85">
            {countChip}
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.5}
          />
        </div>
      </div>
    </Link>
  );
}

interface BlueprintHeroCardProps {
  className?: string;
}

export function BlueprintHeroCard({ className }: BlueprintHeroCardProps) {
  const meta = HERO_BENTO_META;
  return (
    <Link
      href={meta.href}
      aria-label="GeneX360 Complete, the full suite of six genetic panels, 500+ variants. Explore GeneX360 Complete."
      className={`${CARD_LINK} ${className ?? ''}`}
    >
      <div className="relative isolate flex h-full flex-col justify-between gap-4 overflow-hidden rounded-xl border border-[#2DA5A0]/30 p-4 transition-colors duration-300 group-hover:border-[#2DA5A0]/60">
        {/* z0: the GeneX360 Complete DNA video media. CardMedia plays it muted,
            looped, playsInline, IntersectionObserver gated, and fails open to the
            MEDIA_TEAL_TL gradient under reduced motion or any load failure. */}
        <CardMedia media={GENETICS_CARD_MEDIA.genex360Complete} logKey="blueprint-complete" />
        {/* z1: legibility scrim. Darker at the top and bottom where the text sits,
            lighter through the middle so the white DNA video reads in the gap. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-gradient-to-t from-[#1A2744]/90 via-[#1A2744]/50 to-[#1A2744]/80"
        />
        {/* z2 Top: the named GeneX360 Complete element + the Most Popular badge,
            the one line blurb, and the suite stats. */}
        <div className="relative z-[2] flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-white md:text-xl">
              GeneX360<span aria-hidden="true">&trade;</span> Complete
            </span>
            <span className="inline-flex items-center rounded-full border border-[#1A2744]/60 bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-md [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
              {meta.badge}
            </span>
          </div>
          <p className="max-w-md text-[13px] leading-relaxed text-white/80 md:text-sm">
            The full suite of 6 genetic panels in one comprehensive test
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-white/70">
            <span className="tabular-nums">{meta.primaryStat}</span>
            <span aria-hidden="true" className="text-white/30">
              &middot;
            </span>
            <span className="tabular-nums">{meta.secondaryStat}</span>
          </div>
        </div>
        {/* z2 Bottom: the master brand tagline and the primary call to action. */}
        <div className="relative z-[2] flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2DA5A0]">
            {meta.tagline}
          </span>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-white md:text-sm">
            <span>
              Explore GeneX360<span aria-hidden="true">&trade;</span> Complete
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
