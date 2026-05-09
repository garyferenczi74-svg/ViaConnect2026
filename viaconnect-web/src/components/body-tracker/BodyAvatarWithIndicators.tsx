'use client';

// Prompt #85n v3 + #154 + Gary directive 2026-05-08: teal-line
// silhouette with 12 radial-gradient glow markers. Replaces the prior
// rasterized photo + bright Tailwind pill stickers that the design
// audit (29 issues) flagged as the headline visual debt: photographic
// avatar tuned for line-drawing pills + three competing color systems
// + cheap-sticker pill rendering.
//
// Two changes here:
//
//   1. Avatar is now an inline teal-line vector silhouette
//      (BodyTrackerSilhouette), brand-aligned, transparent backing,
//      stroke at rgba(45,165,160,...) opacity ramps. No external
//      asset fetch.
//
//   2. Indicators redesigned as radial-gradient glow markers: 40px
//      round, no border, no shadow, soft fade to transparent at 70%
//      radius. The glow blends with the silhouette stroke instead of
//      stamping on top of it. Color hex sourced from OVAL_HEX so
//      pills + callout badges + legend stay in lockstep.
//
// #154 §5: position table is in src/lib/body-tracker/heatMap
// Positions.ts so future tuning passes touch one file. Coordinates
// recalibrated for the new silhouette geometry (viewBox 400x800).
//
// Wrapper className still carries lg:w-auto so the desktop wrapper
// width tracks the silhouette's rendered width (preserveAspectRatio
// lets the silhouette letterbox naturally inside the wrapper); mobile
// + tablet match wrapper width to silhouette width via w-full +
// max-w-[200px] / md:max-w-[240px].

import { BodyTrackerSilhouette } from './BodyTrackerSilhouette';
import { HEATMAP_POSITIONS_BY_SEX } from '@/lib/body-tracker/heatMapPositions';
import { OVAL_HEX, type OvalColor } from '@/lib/body-tracker/heatmap-colors';

interface BodyAvatarWithIndicatorsProps {
  gender: 'male' | 'female';
  regionStatuses: Record<string, OvalColor>;
  className?: string;
}

function buildGlow(color: OvalColor): string {
  const hex = OVAL_HEX[color];
  return `radial-gradient(circle, ${hex}E6 0%, ${hex}66 35%, ${hex}1A 60%, transparent 75%)`;
}

export function BodyAvatarWithIndicators({
  gender,
  regionStatuses,
  className,
}: BodyAvatarWithIndicatorsProps) {
  const positions = HEATMAP_POSITIONS_BY_SEX[gender];

  return (
    <div
      className={`relative mx-auto flex w-full max-w-[200px] items-center justify-center md:max-w-[240px] lg:h-full lg:w-auto lg:max-w-none ${className ?? ''}`}
      data-testid="body-avatar-indicators"
    >
      <BodyTrackerSilhouette
        gender={gender}
        className="h-auto w-full max-w-full select-none lg:h-full lg:max-h-full lg:w-auto"
      />
      {Object.entries(regionStatuses).map(([regionId, color]) => {
        const pos = positions[regionId];
        if (!pos) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn(`[BodyTracker] No heat map position for segment "${regionId}" on ${gender} figure`);
          }
          return null;
        }
        return (
          <div
            key={regionId}
            data-region={regionId}
            data-color={color}
            aria-hidden="true"
            className="pointer-events-none absolute h-10 w-10 rounded-full"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, -50%)',
              background: buildGlow(color),
            }}
          />
        );
      })}
    </div>
  );
}
