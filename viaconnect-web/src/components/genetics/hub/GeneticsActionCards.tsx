'use client';

// Prompt 191 Task D (2026-06-12): the four My Genetics conversion / navigation
// cards. Each is a small bento tile that mirrors the My Nutrition hub's
// SaveMyMealTile / NutritionGeneticsTile idiom: a centered heading block on the
// card's true vertical center (pointer events pass through it) and a bottom
// anchored CTA chip pinned with mt-auto + pt-4.
//
// Every card is one true anchor: a Next.js <Link> wraps the shared
// GeneticsHubTile, so middle click and cmd / ctrl click open a new tab and a
// plain click navigates normally. The bottom chip is purely presentational
// (the whole card is the Link); there is no nested anchor or button, so there
// are NO nested interactive elements inside the Link.
//
// Destinations (all real routes):
//   UploadDnaCard       -> /genetics/upload   (the real DNA raw file flow)
//   UploadLabCard       -> /plugins/labs      (the Connect Lab Results page)
//   SnpFormulationsCard -> /shop#category-snp (the SNP support catalog anchor)
//   OrderPanelsCard     -> /shop              (the full storefront)
// Prompt 204 (2026-06-17): the Lab card previously duplicated the DNA href and
// misrouted lab uploads to the genetic upload page. It now routes to the real
// Connect Lab Results surface (/plugins/labs); the DNA card is unchanged.
//
// Theme continuity: DNA reads TEAL and Lab reads ORANGE, matching the current
// /genetics page (the GENETICS_CARD_MEDIA.uploadDna seam was switched to teal
// in this task for exactly this reason). SNP stays orange; Order panels reads
// teal. The bottom chips no longer tint by accent. They reuse the section
// sub-nav tab (teal border, teal label, 44px pill) so they match the tabs
// used on the rest of the site. Visible labels are shortened; the link
// accessible name keeps the original chip phrase.
//
// Standing rules honored: tokens only (Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, Orange #B75E18, white opacity neutrals), Lucide strokeWidth 1.5,
// Instrument Sans inherited, no emojis, no em or en dashes, TypeScript strict
// (no any). Presentation only: no fetch, no write path, no new table.

import Link from 'next/link';
import { ArrowRight, ShoppingCart, Upload, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';
import { GeneticsHubTile } from './GeneticsHubTile';
import { GENETICS_CARD_MEDIA } from './geneticsHubMedia';
import {
  CONSUMER_CARD_SUBHEAD,
  CONSUMER_CARD_TITLE,
} from '@/lib/ui/consumerChrome';
import {
  GENETICS_ACTION_CTA_COPY,
  GENETICS_ACTION_TAB_CTA_CLASS,
} from './geneticsActionTabCta';

// One shared shell so all four cards stay pixel identical in structure and only
// differ by copy, destination, media seam, and CTA icon. The shell itself owns
// the centered heading block and the bottom anchored chip; callers pass content
// only. This is the genetics analogue of NutritionHub's SaveMyMealTile /
// NutritionGeneticsTile, collapsed to one parameterized shell.
interface ActionCardProps {
  href: string;
  title: string;
  description: string;
  ctaLabel: string;
  // Full original chip phrase. The visible label is shortened; this stays in
  // the link accessible name so the meaning of the control is unchanged.
  ctaAriaLabel: string;
  ctaIcon: LucideIcon;
  media: SurfaceMedia;
  mediaLogKey: string;
  // Brightens the subheading (description) to full white. Used on the cards whose
  // background media makes the default 62 percent white too dim (Gary 2026-06-13).
  brightSubheading?: boolean;
  className?: string;
}

function ActionCard({
  href,
  title,
  description,
  ctaLabel,
  ctaAriaLabel,
  ctaIcon: CtaIcon,
  media,
  mediaLogKey,
  brightSubheading,
  className,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      aria-label={`${title}. ${description}. ${ctaAriaLabel}`}
      className={`group block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] ${className ?? ''}`}
    >
      <GeneticsHubTile
        media={media}
        mediaLogKey={mediaLogKey}
        className="h-full transition-colors duration-200 group-hover:border-white/20"
        contentClassName="items-center text-center"
      >
        {/* Heading block on the card's TRUE vertical center; pointer events pass
            through so the whole card stays one clean anchor. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-1">
          <h3 className={CONSUMER_CARD_TITLE}>
            {title}
          </h3>
          <p
            className={`${CONSUMER_CARD_SUBHEAD} ${
              brightSubheading ? 'text-white' : ''
            }`}
          >
            {description}
          </p>
        </div>

        {/* Bottom anchored CTA chip. Presentational only (the Link above owns
            navigation). Styled as the section sub-nav tab: 44px pill, 14px
            icon, teal active border. The short visible label is not the
            accessible name; ctaAriaLabel on the Link keeps the full phrase. */}
        <div className="mt-auto flex pt-4">
          <span data-genetics-action-cta="" className={GENETICS_ACTION_TAB_CTA_CLASS}>
            <CtaIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>{ctaLabel}</span>
          </span>
        </div>
      </GeneticsHubTile>
    </Link>
  );
}

// Upload Your DNA Test -> the real DNA raw file upload flow.
export function UploadDnaCard({ className }: { className?: string }) {
  return (
    <ActionCard
      href="/genetics/upload"
      title="Upload Your DNA Test"
      description="23andMe, AncestryDNA, and other raw files"
      ctaLabel={GENETICS_ACTION_CTA_COPY.uploadDna.visible}
      ctaAriaLabel={GENETICS_ACTION_CTA_COPY.uploadDna.aria}
      ctaIcon={Upload}
      media={GENETICS_CARD_MEDIA.uploadDna}
      mediaLogKey="uploadDna"
      brightSubheading
      className={className}
    />
  );
}

// Upload Lab Results -> the Connect Lab Results page (Prompt 204 fix).
export function UploadLabCard({ className }: { className?: string }) {
  return (
    <ActionCard
      href="/plugins/labs"
      title="Upload Lab Results"
      description="Blood panels, biomarkers, and lab reports"
      ctaLabel={GENETICS_ACTION_CTA_COPY.uploadLabs.visible}
      ctaAriaLabel={GENETICS_ACTION_CTA_COPY.uploadLabs.aria}
      ctaIcon={FileText}
      media={GENETICS_CARD_MEDIA.uploadLab}
      mediaLogKey="uploadLab"
      brightSubheading
      className={className}
    />
  );
}

// Browse Genetic SNP Support Formulations -> the SNP support catalog anchor.
// Shopping cart CTA icon.
export function SnpFormulationsCard({ className }: { className?: string }) {
  return (
    <ActionCard
      href="/shop#category-snp"
      title="Browse Genetic SNP Support Formulations"
      description="Methylation cofactors, neurotransmitter, detox and more"
      ctaLabel={GENETICS_ACTION_CTA_COPY.catalog.visible}
      ctaAriaLabel={GENETICS_ACTION_CTA_COPY.catalog.aria}
      ctaIcon={ShoppingCart}
      media={GENETICS_CARD_MEDIA.snpFormulations}
      mediaLogKey="snpFormulations"
      className={className}
    />
  );
}

// Unlock Your Genetic Blueprint -> the full storefront. Arrow CTA icon.
export function OrderPanelsCard({ className }: { className?: string }) {
  return (
    <ActionCard
      href="/shop"
      title="Unlock Your Genetic Blueprint"
      description="Explore all six GeneX360 panels"
      ctaLabel={GENETICS_ACTION_CTA_COPY.panels.visible}
      ctaAriaLabel={GENETICS_ACTION_CTA_COPY.panels.aria}
      ctaIcon={ArrowRight}
      media={GENETICS_CARD_MEDIA.orderPanels}
      mediaLogKey="orderPanels"
      className={className}
    />
  );
}
