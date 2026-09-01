'use client';

// Prompt 230, Task 11: vendor identity mark for first-class wearable tiles
// (Whoop, Oura, Apple Health, Hume Body Pod, Google Health, Garmin, Clair
// Health). LEX gate is hard: an entry only renders its real local asset
// once WEARABLE_MARK_ASSETS[id].lexCleared === true. Every entry ships
// lexCleared: false today, so production renders the Lucide fallback for
// all tiles -- no real vendor logo image file is committed in this task. See
// public/logos/wearables/README-provenance.md for the source + clearance
// status recorded per vendor. This keeps the branch shippable with zero
// legal exposure; the actual official marks land only after Lex signs off
// (a later, separate change that flips lexCleared -> true per vendor and
// adds the asset file). Clair Health is Coming soon only; no Lex-cleared
// mark and no partner logo file.

import { Circle, Heart, HeartPulse, Moon, Scan, Watch, type LucideIcon } from 'lucide-react';

export interface WearableMarkAsset {
  /** Local, stored-not-hotlinked path under /public/logos/wearables/. */
  src: string;
  /** Hard gate: only true once LEX has cleared this vendor's mark for use. */
  lexCleared: boolean;
}

// Ship every entry lexCleared: false until LEX signs off per vendor. Do not
// flip any of these to true, and do not add a real image file at any of
// these src paths, without a recorded LEX clearance in
// public/logos/wearables/README-provenance.md.
export const WEARABLE_MARK_ASSETS: Record<string, WearableMarkAsset | undefined> = {
  whoop: { src: '/logos/wearables/whoop.svg', lexCleared: false },
  oura: { src: '/logos/wearables/oura.svg', lexCleared: false },
  apple_health: { src: '/logos/wearables/apple-health.svg', lexCleared: false },
  hume: { src: '/logos/wearables/hume.svg', lexCleared: false },
  google_health: { src: '/logos/wearables/google-health.svg', lexCleared: false },
  garmin: { src: '/logos/wearables/garmin.svg', lexCleared: false },
  clair: { src: '/logos/wearables/clair.svg', lexCleared: false },
};

// Keyed by tile id, matching WEARABLE_TILE_SPECS.icon in wearable-tiles.ts
// exactly (task-11-brief.md:16 pins whoop AND garmin to Watch; the model
// file agrees -- both list icon: 'Watch'). Whoop and garmin intentionally
// share a fallback: Lucide fallbacks need not be visually unique per
// vendor, since the real per-vendor logos will differ once Lex clears
// them. Any id outside this map -- including an unrecognized vendor id --
// renders the safe default (Circle) rather than throwing or rendering
// nothing.
const FALLBACK_ICON: Partial<Record<string, LucideIcon>> = {
  whoop: Watch,
  oura: Circle,
  apple_health: Heart,
  hume: Scan,
  google_health: HeartPulse,
  garmin: Watch,
  clair: Moon,
};

const SAFE_DEFAULT_ICON: LucideIcon = Circle;

export interface WearableBrandMarkProps {
  id: string;
  className?: string;
}

export function WearableBrandMark({ id, className }: WearableBrandMarkProps) {
  const asset = WEARABLE_MARK_ASSETS[id];
  if (asset && asset.lexCleared) {
    return <img src={asset.src} alt="" data-vendor-mark={id} className={className} />;
  }

  const Icon = FALLBACK_ICON[id] ?? SAFE_DEFAULT_ICON;
  const classes = ['text-white/80', className].filter(Boolean).join(' ');
  return (
    <Icon
      className={classes}
      strokeWidth={1.5}
      aria-hidden="true"
      data-vendor-mark="fallback"
    />
  );
}

export default WearableBrandMark;
