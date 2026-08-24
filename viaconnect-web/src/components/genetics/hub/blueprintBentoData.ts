// Prompt 193d (2026-06-12): bento presentation metadata for the Your Genetic
// Blueprint card. Additive to the canonical Panel data in panels.ts. The display
// name, descriptor (subtitle), and marker count all come from PANEL_BY_SLUG after
// the Prompt 193d display rename, so this file never duplicates that copy. It
// holds only the per card presentation seam: the Lucide icon, the resolved link
// target, the count unit noun (combined with the panel markerCount into the short
// chip), and the accent (teal for the assessment panels, orange for the two
// educational panels). The hero (GeneX360 Complete) is a distinct entry because it
// is the whole suite rather than a single panel.
//
// The cards render INSIDE the one large Blueprint card (which carries the media
// seam and scrim), so they are light inner cards rather than full hub tiles; the
// accent here is the icon tint that distinguishes them, not a full tile gradient.
//
// Standing rules honored: Lucide outline icons, no emojis, no em or en dashes,
// TypeScript strict (no any).

import { Dna, Apple, Activity, Hourglass, HeartPulse, Leaf } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PanelSlug } from '@/data/genex360/types';
import { CATALOG_SIZE_LABEL } from '@/lib/genetics/catalogSizes';
import { GENEX360_BLUEPRINT_HREF } from './geneticsHubLinks';
import { MEDIA_TEAL_BR, MEDIA_TEAL_BL, MEDIA_ORANGE_BR } from './geneticsHubMedia';
import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';

// The single resolver for a panel card's link target: the standalone Blueprint
// explorer with that panel's tab preselected via the hash. The GeneX360PanelSection
// island reads `#<slug>` on load and selects the matching pill tab. Routed through
// this one helper so no card hardcodes a URL (consistent with Prompt 193c).
export function blueprintPanelHref(slug: PanelSlug): string {
  return `${GENEX360_BLUEPRINT_HREF}#${slug}`;
}

export type BentoAccent = 'teal' | 'orange';

export interface PanelBentoMeta {
  slug: PanelSlug;
  icon: LucideIcon; // Lucide outline icon for the inner card
  unit: string; // count chip unit noun, combined with panels.ts markerCount
  accent: BentoAccent; // icon tint: teal for assessment panels, orange for educational
  media?: SurfaceMedia; // optional per card background media (image or video) with a scrim
}

// The six panel cards in MOBILE / source order (the hero renders separately,
// first). Array index drives the desktop bento position: indices 0 to 1 are the
// top row small cards, 2 to 3 the middle row small cards, 4 to 5 the bottom row
// wide cards. Display name, subtitle, and markerCount come from
// PANEL_BY_SLUG[slug]; only the presentation seam lives here. The two educational
// panels (PeptideIQ, CannabisIQ) read orange so the accent carries the same
// educational distinction the panels already teach.
//
// Order set by Gary 2026-06-12: HormoneIQ and EpigenHQ on top, PeptideIQ and
// CannabisIQ in the middle, GeneXM and NutrigenDX as the two bottom wide cards.
export const PANEL_BENTO_META: PanelBentoMeta[] = [
  {
    slug: 'hormone-iq',
    icon: Activity,
    unit: 'markers',
    accent: 'teal',
    // Prompt 193d (2026-06-12): HormoneIQ carries its background hero video from
    // the Hero Videos bucket. CardMedia plays it muted, looped, playsInline, and
    // IntersectionObserver gated; reduced motion or any load failure falls open to
    // the MEDIA_TEAL_BR gradient (no poster set).
    media: {
      kind: 'video',
      src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/HormoneIQ%20Video.mp4',
      objectPosition: 'center',
      gradientClass: MEDIA_TEAL_BR,
    },
  },
  {
    slug: 'epigen-hq',
    icon: Hourglass,
    unit: 'clocks',
    accent: 'teal',
    // Prompt 193d (2026-06-12): EpigenHQ carries its background hero video from the
    // Hero Videos bucket. CardMedia plays it muted, looped, playsInline, and
    // IntersectionObserver gated; reduced motion or any load failure falls open to
    // the MEDIA_TEAL_BL gradient (no poster set).
    media: {
      kind: 'video',
      src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/an_attractive_older_fit_couple.mp4',
      objectPosition: 'center',
      gradientClass: MEDIA_TEAL_BL,
    },
  },
  {
    slug: 'peptide-iq',
    icon: HeartPulse,
    unit: 'genes',
    accent: 'orange',
    // Prompt 193d (2026-06-13): PeptideIQ carries a background hero image from the
    // Hero Images bucket. CardMedia fails open to the MEDIA_ORANGE_BR gradient.
    media: {
      kind: 'image',
      src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Doctor%201.png',
      objectPosition: 'center',
      gradientClass: MEDIA_ORANGE_BR,
    },
  },
  {
    slug: 'cannabis-iq',
    icon: Leaf,
    unit: 'genes',
    accent: 'orange',
    // Prompt 193d (2026-06-13): CannabisIQ carries a background hero video. The
    // asset is an .mp4 (kind video) even though it sits in the Hero Images bucket.
    // CardMedia plays it muted, looped, playsInline, IntersectionObserver gated,
    // and fails open to the MEDIA_ORANGE_BR gradient (no poster set).
    media: {
      kind: 'video',
      src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/CannabisIQ.mp4',
      objectPosition: 'center',
      gradientClass: MEDIA_ORANGE_BR,
    },
  },
  {
    slug: 'genex-m',
    icon: Dna,
    unit: 'SNPs',
    accent: 'teal',
    // Prompt 193d (2026-06-13): GeneXM carries a background hero video (an .mp4 in
    // the Hero Images bucket). CardMedia plays it muted, looped, playsInline,
    // IntersectionObserver gated, and fails open to the MEDIA_TEAL_BL gradient.
    media: {
      kind: 'video',
      src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Methylation%20Testing.mp4',
      objectPosition: 'center',
      gradientClass: MEDIA_TEAL_BL,
    },
  },
  {
    slug: 'nutrigen-dx',
    icon: Apple,
    unit: 'SNPs',
    accent: 'teal',
    // Prompt 193d (2026-06-13): NutrigenDX carries a background hero image from the
    // Hero Images bucket. CardMedia fails open to the MEDIA_TEAL_BR gradient.
    media: {
      kind: 'image',
      src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Food%203.png',
      objectPosition: 'center',
      gradientClass: MEDIA_TEAL_BR,
    },
  },
];

// The hero entry: the GeneX360 Complete suite. A distinct config because it is the
// whole suite, not a single panel. Links to the Blueprint explorer root, which
// opens on the default genex-m tab.
export interface HeroBentoMeta {
  href: string;
  badge: string;
  primaryStat: string;
  secondaryStat: string;
  tagline: string;
}

export const HERO_BENTO_META: HeroBentoMeta = {
  href: GENEX360_BLUEPRINT_HREF,
  badge: 'Most Popular',
  primaryStat: CATALOG_SIZE_LABEL,
  secondaryStat: '6 panels',
  tagline: 'Built For Your Biology',
};
