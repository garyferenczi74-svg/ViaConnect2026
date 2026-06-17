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
// teal.
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

type Accent = 'teal' | 'orange' | 'blue';

// One shared shell so all four cards stay pixel identical in structure and only
// differ by copy, destination, media seam, accent, and CTA icon. The shell
// itself owns the centered heading block and the bottom anchored chip; callers
// pass content only. This is the genetics analogue of NutritionHub's
// SaveMyMealTile / NutritionGeneticsTile, collapsed to one parameterized shell.
interface ActionCardProps {
  href: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaIcon: LucideIcon;
  media: SurfaceMedia;
  mediaLogKey: string;
  accent: Accent;
  // Brightens the subheading (description) to full white. Used on the cards whose
  // background media makes the default 62 percent white too dim (Gary 2026-06-13).
  brightSubheading?: boolean;
  className?: string;
}

// Accent maps the two themes to their token tinted chip treatments. Teal and
// Orange are both real design tokens; the focus ring keeps the teal accent on
// both so keyboard focus reads consistently across the hub.
const ACCENT_CHIP: Record<Accent, string> = {
  teal: 'border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.14] text-[#2DA5A0] group-hover:border-[#2DA5A0]/60 group-hover:bg-[#2DA5A0]/20',
  orange:
    'border-[#B75E18]/45 bg-[#B75E18]/20 text-[#B75E18] group-hover:border-[#B75E18]/65 group-hover:bg-[#B75E18]/30',
  // Blue (the Deep Navy token #1A2744) outline on a very see-through white glass
  // fill (8 percent), with BRIGHT WHITE label text. The base chip className adds
  // backdrop-blur-md so the video stays visible but frosted; the white text caries
  // a soft shadow so it reads over the moving video at this low fill.
  blue: 'border-[#1A2744]/60 bg-white/[0.08] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] group-hover:border-[#1A2744]/80 group-hover:bg-white/[0.16]',
};

function ActionCard({
  href,
  title,
  description,
  ctaLabel,
  ctaIcon: CtaIcon,
  media,
  mediaLogKey,
  accent,
  brightSubheading,
  className,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      aria-label={`${title}. ${description}`}
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
          <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
            {title}
          </h3>
          <p
            className={`text-[12px] leading-relaxed md:text-[13px] ${
              brightSubheading ? 'text-white' : 'text-white/[0.62]'
            }`}
          >
            {description}
          </p>
        </div>

        {/* Bottom anchored CTA chip. Presentational only (the Link above owns
            navigation); min height keeps the visual touch target at 44px. */}
        <div className="mt-auto flex pt-4">
          <span
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-medium backdrop-blur-md transition-all duration-200 ${ACCENT_CHIP[accent]}`}
          >
            <CtaIcon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{ctaLabel}</span>
          </span>
        </div>
      </GeneticsHubTile>
    </Link>
  );
}

// Upload Your DNA Test -> the real DNA raw file upload flow. BLUE accent.
export function UploadDnaCard({ className }: { className?: string }) {
  return (
    <ActionCard
      href="/genetics/upload"
      title="Upload Your DNA Test"
      description="23andMe, AncestryDNA, and other raw files"
      ctaLabel="Upload DNA"
      ctaIcon={Upload}
      media={GENETICS_CARD_MEDIA.uploadDna}
      mediaLogKey="uploadDna"
      accent="blue"
      brightSubheading
      className={className}
    />
  );
}

// Upload Lab Results -> the Connect Lab Results page (Prompt 204 fix). BLUE accent.
export function UploadLabCard({ className }: { className?: string }) {
  return (
    <ActionCard
      href="/plugins/labs"
      title="Upload Lab Results"
      description="Blood panels, biomarkers, and lab reports"
      ctaLabel="Upload Labs"
      ctaIcon={FileText}
      media={GENETICS_CARD_MEDIA.uploadLab}
      mediaLogKey="uploadLab"
      accent="blue"
      brightSubheading
      className={className}
    />
  );
}

// Browse Genetic SNP Support Formulations -> the SNP support catalog anchor.
// BLUE accent, shopping cart CTA icon.
export function SnpFormulationsCard({ className }: { className?: string }) {
  return (
    <ActionCard
      href="/shop#category-snp"
      title="Browse Genetic SNP Support Formulations"
      description="Methylation cofactors, neurotransmitter, detox and more"
      ctaLabel="Browse Catalog"
      ctaIcon={ShoppingCart}
      media={GENETICS_CARD_MEDIA.snpFormulations}
      mediaLogKey="snpFormulations"
      accent="blue"
      className={className}
    />
  );
}

// Unlock Your Genetic Blueprint -> the full storefront. BLUE accent, arrow CTA
// icon.
export function OrderPanelsCard({ className }: { className?: string }) {
  return (
    <ActionCard
      href="/shop"
      title="Unlock Your Genetic Blueprint"
      description="Explore all six GeneX360 panels"
      ctaLabel="View Panels"
      ctaIcon={ArrowRight}
      media={GENETICS_CARD_MEDIA.orderPanels}
      mediaLogKey="orderPanels"
      accent="blue"
      className={className}
    />
  );
}
