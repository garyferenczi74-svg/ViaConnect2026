'use client';

// Prompt 205: the single shared bento tile shell. One source of truth for the
// hub-card-frame chrome used by My Biology (BentoCard), the Genetic Blueprint
// (GeneticsHubTile), and the Connected Sources page. Layers back to front:
//   z 0: optional CardMedia seam (gradient placeholder or real media)
//   z 1: optional legibility scrim
//   z 2: content column (children)
// The root is a div by default, or a Next.js Link when href is set, so nav
// tiles keep hover and focus on the anchor itself.

import Link from 'next/link';
import { CardMedia } from '@/components/body-tracker/hub/CardMedia';
import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';
import '@/components/body-tracker/hub/hub-card-frame.css';

const FRAME_BASE =
  'hub-card-frame relative isolate flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md';

const FRAME_INTERACTIVE =
  'group transition-all duration-200 ease-out hover:border-white/[0.16] hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]';

interface BentoTileProps {
  children: React.ReactNode;
  // Extra classes for the root frame (min height, grid column span, etc.).
  className?: string;
  // Adds the hover, focus, and group treatment used by navigation tiles.
  interactive?: boolean;
  // When set, the root renders as a Next.js Link instead of a div.
  href?: string;
  ariaLabel?: string;
  dataHubCard?: string;
  // z 0 media. When media is provided it renders; otherwise, if gradientClass
  // is provided, a gradient placeholder seam renders; if neither, no media layer.
  media?: SurfaceMedia;
  gradientClass?: string;
  mediaLogKey?: string;
  // z 1 legibility scrim. Defaults to true so text stays readable over media.
  scrim?: boolean;
  // Extra classes for the z 2 content column.
  contentClassName?: string;
}

export function BentoTile({
  children,
  className,
  interactive = false,
  href,
  ariaLabel,
  dataHubCard,
  media,
  gradientClass,
  mediaLogKey,
  scrim = true,
  contentClassName,
}: BentoTileProps) {
  const rootClass = `${FRAME_BASE}${interactive ? ` ${FRAME_INTERACTIVE}` : ''}${className ? ` ${className}` : ''}`;

  const inner = (
    <>
      {media ? (
        <CardMedia media={media} logKey={mediaLogKey} />
      ) : gradientClass !== undefined ? (
        <CardMedia media={{ kind: 'gradient', gradientClass }} />
      ) : null}

      {scrim ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1A2744]/85 via-[#1A2744]/30 to-transparent"
        />
      ) : null}

      <div
        className={`relative z-[2] flex h-full flex-col p-4 md:p-5${contentClassName ? ` ${contentClassName}` : ''}`}
      >
        {children}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} data-hub-card={dataHubCard} className={rootClass}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={rootClass} data-hub-card={dataHubCard}>
      {inner}
    </div>
  );
}

export default BentoTile;
