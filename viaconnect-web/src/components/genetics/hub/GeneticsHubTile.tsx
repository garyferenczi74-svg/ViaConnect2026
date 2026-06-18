'use client';

// Prompt 191 Task C, refactored in Prompt 205: this is now a thin wrapper over
// the shared BentoTile so all bento surfaces share one source of truth. The
// rendered output (frame chrome, media seam, scrim, content column) is
// unchanged from the previous inline implementation.
//
// Standing rules honored: tokens only (Card #1E3054, Deep Navy #1A2744),
// Instrument Sans inherited, no emojis, no em or en dashes, TypeScript strict.

import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';
import { BentoTile } from '@/components/ui/BentoTile';

interface GeneticsHubTileProps {
  children: React.ReactNode;
  // Gradient placeholder used when no full media descriptor is passed. When
  // both are omitted the tile still renders an empty gradient seam.
  gradientClass?: string;
  // Optional real media descriptor. When present CardMedia renders it; when
  // absent the gradient placeholder built from gradientClass renders instead.
  media?: SurfaceMedia;
  mediaLogKey?: string;
  className?: string;
  // Optional classes for the z 2 content column.
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
    <BentoTile
      className={`min-h-[200px]${className ? ` ${className}` : ''}`}
      media={media}
      gradientClass={media ? undefined : gradientClass ?? ''}
      mediaLogKey={mediaLogKey}
      contentClassName={contentClassName}
    >
      {children}
    </BentoTile>
  );
}

export default GeneticsHubTile;
