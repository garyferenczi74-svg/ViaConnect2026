'use client';

// Prompt #85n fix: avatar heat-map using the avatar image as a CSS mask.
//
// Layer 1 (bottom): the avatar img itself, untinted.
// Layer 2 (top): horizontal color bands clipped to the body silhouette via
// mask-image of the same avatar URL. The mask hides every pixel outside
// the body so a simple full-width band appears to follow every muscle line
// and limb contour without per-region SVG paths.
//
// Replaces the prior 12-rectangle SVG overlay (avatarOverlayPaths.ts +
// inline svg <path> elements) which sat as blocky tiles on top of the
// figure and ignored anatomy.
//
// Fallback: if the avatar SVG ships with an opaque background and the
// mask reveals everything, swap WebkitMaskImage / maskImage with
// mixBlendMode: 'multiply' on the overlay div per the Solution B path in
// the prompt brief; the band colors will then tint the dark anatomy
// strokes via blend rather than via alpha mask.

import { useMemo } from 'react';
import {
  getZoneFill,
  type Metric,
  type RegionChangeData,
} from '@/lib/body-tracker/heatmap-colors';

interface BodyAvatarWithHeatmapProps {
  gender: 'male' | 'female';
  changeData: RegionChangeData;
  metric: Metric;
  className?: string;
}

const AVATAR_URLS: Record<'male' | 'female', string> = {
  male:   'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Male%20Avatar.svg',
  female: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Female.svg',
};

interface BodyZone {
  readonly id: string;
  readonly top: number;
  readonly height: number;
  readonly regions: readonly string[];
}

// Five non-overlapping vertical bands tiling 0 to 100 percent of the
// avatar's rendered height. Region IDs match the BODY_PARTS keys in
// composition/page.tsx so the same change-data record drives both the
// callout cards and the masked overlay.
const BODY_ZONES: readonly BodyZone[] = [
  { id: 'head',       top:  0, height: 12, regions: ['neck', 'shoulders'] },
  { id: 'upper_body', top: 12, height: 16, regions: ['chest', 'r_bicep', 'l_bicep'] },
  { id: 'mid_body',   top: 28, height: 18, regions: ['waist', 'r_forearm', 'l_forearm'] },
  { id: 'upper_legs', top: 46, height: 24, regions: ['r_quad', 'l_quad'] },
  { id: 'lower_legs', top: 70, height: 30, regions: ['r_calf', 'l_calf'] },
];

export function BodyAvatarWithHeatmap({
  gender,
  changeData,
  metric,
  className,
}: BodyAvatarWithHeatmapProps) {
  const avatarUrl = AVATAR_URLS[gender];

  const zones = useMemo(
    () =>
      BODY_ZONES.map((z) => ({
        ...z,
        fill: getZoneFill(z.regions, changeData, metric),
      })),
    [changeData, metric],
  );

  return (
    <div
      className={`relative mx-auto flex w-full max-w-[200px] items-center justify-center md:max-w-[240px] lg:h-full lg:max-w-none ${className ?? ''}`}
      data-testid="body-avatar-heatmap"
    >
      <img
        src={avatarUrl}
        alt={`${gender === 'male' ? 'Male' : 'Female'} body composition avatar`}
        className="h-auto w-full max-w-full select-none object-contain lg:h-full lg:max-h-full lg:w-auto"
        draggable={false}
      />
      <div
        aria-hidden="true"
        data-testid="heatmap-mask-layer"
        className="pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: `url(${avatarUrl})`,
          maskImage: `url(${avatarUrl})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          // FALLBACK (Solution B): the male avatar SVG embeds a base64 PNG
          // behind feColorMatrix filters that emit fully opaque alpha across
          // the SVG bounding box. If the alpha mask reveals the full
          // rectangle (5 horizontal stripes ignoring anatomy), delete the
          // 8 mask* / WebkitMask* lines above and replace with:
          //   mixBlendMode: 'multiply',
          // Multiply blends the band colors against the avatar's dark
          // anatomy strokes so colors appear only where the figure has
          // visible pixels.
        }}
      >
        {zones.map((zone) => (
          <div
            key={zone.id}
            data-zone={zone.id}
            className="absolute left-0 right-0"
            style={{
              top: `${zone.top}%`,
              height: `${zone.height}%`,
              backgroundColor: zone.fill,
            }}
          />
        ))}
      </div>
    </div>
  );
}
