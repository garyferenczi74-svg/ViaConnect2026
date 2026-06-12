'use client';

// Prompt 191 Task C (2026-06-12): the shared genetics bento tile shell.
//
// Extracted verbatim from the My Nutrition hub's local HubTile pattern so the
// genetics bento (Your Variants now, the GeneX360 / upload / formulation cards
// in the next task) all sit on the exact same three layer card chrome. Layers
// back to front:
//   z 0: CardMedia, the per card media seam (gradient placeholder by default,
//        an image or video when a real asset is wired in geneticsHubMedia).
//   z 1: a legibility scrim so content stays readable over any future frame.
//   z 2: the content column.
// The hub-card-frame.css pseudo elements paint the tapered luminous edge ring
// on the root, identical to both existing hubs.
//
// This is presentation only: it opens no write path, fetches nothing, and adds
// no table. Importing CardMedia + SurfaceMedia + hub-card-frame.css from the
// body-tracker hub is reuse of existing files (allowed); none are modified.
//
// Standing rules honored: tokens only (Card #1E3054, Deep Navy #1A2744),
// Instrument Sans inherited, no emojis, no em or en dashes, TypeScript strict
// (no any).

import { CardMedia } from '@/components/body-tracker/hub/CardMedia';
import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';
import '@/components/body-tracker/hub/hub-card-frame.css';

interface GeneticsHubTileProps {
  children: React.ReactNode;
  // Gradient placeholder used when no full media descriptor is passed. When
  // both are omitted the tile still renders an empty gradient seam.
  gradientClass?: string;
  // Optional real media descriptor from geneticsHubMedia. When present,
  // CardMedia renders it (failing open to its own gradientClass); when absent,
  // the gradient placeholder built from gradientClass renders instead.
  media?: SurfaceMedia;
  mediaLogKey?: string;
  className?: string;
  // Optional classes for the z 2 content column (e.g. items-center text-center
  // for a centered tile). Omitted leaves the default top aligned column.
  contentClassName?: string;
}

export function GeneticsHubTile({
  children,
  gradientClass,
  media,
  mediaLogKey,
  className,
  contentClassName,
}: GeneticsHubTileProps) {
  return (
    <div
      className={`hub-card-frame relative isolate flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md ${className ?? ''}`}
    >
      {/* z 0: per card media seam. Real media when wired, gradient otherwise. */}
      {media ? (
        <CardMedia media={media} logKey={mediaLogKey} />
      ) : (
        <CardMedia media={{ kind: 'gradient', gradientClass: gradientClass ?? '' }} />
      )}

      {/* z 1: legibility scrim over any media frame. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1A2744]/85 via-[#1A2744]/30 to-transparent"
      />

      {/* z 2: content. */}
      <div className={`relative z-[2] flex h-full flex-col p-4 md:p-5 ${contentClassName ?? ''}`}>
        {children}
      </div>
    </div>
  );
}

export default GeneticsHubTile;
