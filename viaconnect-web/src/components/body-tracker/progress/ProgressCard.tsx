'use client';

// Prompt 201 (2026-06-15): the Progress bento card shell. It composes the SHARED
// primitives without forking them: the 183f tapered luminous edge
// (hub-card-frame), the CardMedia video/gradient seam, the legibility scrim, and
// the glass recipe, the same composition NutritionHub's HubTile uses. Unlike the
// navigation BentoCard, this is a WORKING-surface card: it exposes a generic
// content slot plus an icon chip (top left) and an agent attribution chip (top
// right, resolved through getDisplayName, never a hardcoded name).

import type { LucideIcon } from 'lucide-react';
import { CardMedia } from '@/components/body-tracker/hub/CardMedia';
import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';
import { getDisplayName } from '@/lib/getDisplayName';
import '@/components/body-tracker/hub/hub-card-frame.css';

// Teal and orange radial gradient seams reusing the hub palette rgba values (no
// new colors): teal 45,165,160 for analysis and signal cards, orange 183,94,24
// for the action card.
export const PROGRESS_TEAL_GRADIENT =
  'bg-[radial-gradient(120%_120%_at_0%_0%,rgba(45,165,160,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]';
export const PROGRESS_ORANGE_GRADIENT =
  'bg-[radial-gradient(110%_110%_at_0%_100%,rgba(183,94,24,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]';

export interface ProgressCardProps {
  readonly icon?: LucideIcon;
  readonly accent?: 'teal' | 'orange';
  readonly attributionSlug?: string;
  readonly metricChip?: string;
  readonly media?: SurfaceMedia;
  readonly mediaLogKey?: string;
  readonly gradientClass?: string;
  readonly muted?: boolean;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly children: React.ReactNode;
}

export function ProgressCard({
  icon: Icon,
  accent = 'teal',
  attributionSlug,
  metricChip,
  media,
  mediaLogKey,
  gradientClass,
  muted = false,
  className,
  contentClassName,
  children,
}: ProgressCardProps) {
  const fallbackGradient =
    gradientClass ?? (accent === 'orange' ? PROGRESS_ORANGE_GRADIENT : PROGRESS_TEAL_GRADIENT);

  // Muted (Safety) card: no luminous edge, no media seam, low emphasis so it
  // reads as a footnote rather than an instrument.
  if (muted) {
    return (
      <div
        className={`relative isolate flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1E3054]/25 p-4 backdrop-blur-md md:p-5 ${className ?? ''}`}
      >
        {children}
      </div>
    );
  }

  const frameClass = accent === 'orange' ? 'hub-card-frame hub-card-frame--orange' : 'hub-card-frame';
  const chip = metricChip ?? (attributionSlug ? getDisplayName(attributionSlug) : null);
  const iconColor = accent === 'orange' ? 'text-[#B75E18]' : 'text-[#2DA5A0]';

  return (
    <div
      className={`${frameClass} relative isolate flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md ${className ?? ''}`}
    >
      {/* z 0: per card media seam. Real media when wired, gradient otherwise. */}
      {media ? (
        <CardMedia media={media} logKey={mediaLogKey} />
      ) : (
        <CardMedia media={{ kind: 'gradient', gradientClass: fallbackGradient }} />
      )}

      {/* z 1: legibility scrim over any media frame. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1A2744]/85 via-[#1A2744]/30 to-transparent"
      />

      {/* z 2: content, with an optional icon chip (top left) and attribution or
          metric chip (top right). */}
      <div className={`relative z-[2] flex h-full flex-col p-4 md:p-5 ${contentClassName ?? ''}`}>
        {Icon || chip ? (
          <div className="mb-3 flex items-start justify-between gap-2">
            {Icon ? (
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] backdrop-blur-sm ${iconColor}`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </span>
            ) : (
              <span />
            )}
            {chip ? (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm">
                {chip}
              </span>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export default ProgressCard;
