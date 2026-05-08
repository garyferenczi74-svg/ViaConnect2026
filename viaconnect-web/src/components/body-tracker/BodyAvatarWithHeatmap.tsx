'use client';

// Prompt #85n v2: per-region heat-map. Each of 12 body parts gets its
// own overlay div, double-clipped by mask-image (avatar contour) +
// clip-path (region boundary), with a color computed from that
// region's individual change. Replaces the v1 5-band approach which
// uniformly tinted full horizontal stripes across the figure.
//
// The clip-path polygon coordinates are first-pass estimates from the
// prompt brief; visual calibration against the actual rendered avatar
// is expected after Gary's localhost review. The mask handles body-
// contour edges so polygons can be slightly larger than the body part
// without color bleed past the silhouette.
//
// The wrapper carries lg:w-auto so its rendered width tracks the
// avatar img's intrinsic width on desktop. Without that, lg:max-w-none
// + w-full would let the wrapper be wider than the centered img and
// the absolute-inset-0 overlays would carry clip-path coordinates in
// wrapper-space rather than img-space, throwing every polygon off the
// anatomy. Mobile and tablet already match wrapper width to img width
// via w-full + max-w-[200px] / md:max-w-[240px] + img w-full.
//
// Fallback: if the avatar SVG ships with filter-emitted opaque alpha
// (per the Solution B path in the prompt brief), drop the
// WebkitMaskImage / maskImage entries on the per-region style block
// and add mixBlendMode: 'multiply' instead. The clip-path will still
// constrain each color to its body part; multiply blends against the
// avatar's dark anatomy strokes so colors only appear on visible
// figure pixels.

import { useMemo } from 'react';
import {
  getRegionFill,
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

interface RegionPolygon {
  readonly id: string;
  readonly clipPath: string;
}

// Region IDs match the BODY_PARTS keys in composition/page.tsx so the
// same change-data record drives the callout cards and the per-region
// heat overlay. r_ / l_ prefixes are image-side, not anatomical.
const REGIONS_BY_GENDER: Record<'male' | 'female', readonly RegionPolygon[]> = {
  male: [
    { id: 'neck',      clipPath: 'polygon(40% 6%, 60% 6%, 60% 13%, 40% 13%)' },
    { id: 'shoulders', clipPath: 'polygon(25% 13%, 75% 13%, 75% 18%, 25% 18%)' },
    { id: 'chest',     clipPath: 'polygon(32% 18%, 68% 18%, 68% 28%, 32% 28%)' },
    { id: 'waist',     clipPath: 'polygon(35% 28%, 65% 28%, 65% 38%, 35% 38%)' },
    { id: 'r_bicep',   clipPath: 'polygon(68% 15%, 82% 15%, 82% 30%, 68% 30%)' },
    { id: 'l_bicep',   clipPath: 'polygon(18% 15%, 32% 15%, 32% 30%, 18% 30%)' },
    { id: 'r_forearm', clipPath: 'polygon(72% 30%, 88% 30%, 88% 45%, 72% 45%)' },
    { id: 'l_forearm', clipPath: 'polygon(12% 30%, 28% 30%, 28% 45%, 12% 45%)' },
    { id: 'r_quad',    clipPath: 'polygon(50% 42%, 65% 42%, 65% 62%, 50% 62%)' },
    { id: 'l_quad',    clipPath: 'polygon(35% 42%, 50% 42%, 50% 62%, 35% 62%)' },
    { id: 'r_calf',    clipPath: 'polygon(52% 62%, 64% 62%, 64% 82%, 52% 82%)' },
    { id: 'l_calf',    clipPath: 'polygon(36% 62%, 48% 62%, 48% 82%, 36% 82%)' },
  ],
  female: [
    { id: 'neck',      clipPath: 'polygon(42% 8%, 58% 8%, 58% 14%, 42% 14%)' },
    { id: 'shoulders', clipPath: 'polygon(28% 14%, 72% 14%, 72% 19%, 28% 19%)' },
    { id: 'chest',     clipPath: 'polygon(32% 19%, 68% 19%, 68% 30%, 32% 30%)' },
    { id: 'waist',     clipPath: 'polygon(35% 30%, 65% 30%, 65% 40%, 35% 40%)' },
    { id: 'r_bicep',   clipPath: 'polygon(68% 16%, 80% 16%, 80% 30%, 68% 30%)' },
    { id: 'l_bicep',   clipPath: 'polygon(20% 16%, 32% 16%, 32% 30%, 20% 30%)' },
    { id: 'r_forearm', clipPath: 'polygon(70% 30%, 84% 30%, 84% 44%, 70% 44%)' },
    { id: 'l_forearm', clipPath: 'polygon(16% 30%, 30% 30%, 30% 44%, 16% 44%)' },
    { id: 'r_quad',    clipPath: 'polygon(50% 44%, 66% 44%, 66% 64%, 50% 64%)' },
    { id: 'l_quad',    clipPath: 'polygon(34% 44%, 50% 44%, 50% 64%, 34% 64%)' },
    { id: 'r_calf',    clipPath: 'polygon(52% 64%, 63% 64%, 63% 82%, 52% 82%)' },
    { id: 'l_calf',    clipPath: 'polygon(37% 64%, 48% 64%, 48% 82%, 37% 82%)' },
  ],
};

export function BodyAvatarWithHeatmap({
  gender,
  changeData,
  metric,
  className,
}: BodyAvatarWithHeatmapProps) {
  const avatarUrl = AVATAR_URLS[gender];
  const regions = REGIONS_BY_GENDER[gender];

  const regionFills = useMemo(
    () =>
      regions.map((r) => ({
        ...r,
        fill: getRegionFill(r.id, changeData, metric),
      })),
    [regions, changeData, metric],
  );

  return (
    <div
      className={`relative mx-auto flex w-full max-w-[200px] items-center justify-center md:max-w-[240px] lg:h-full lg:w-auto lg:max-w-none ${className ?? ''}`}
      data-testid="body-avatar-heatmap"
    >
      <img
        src={avatarUrl}
        alt={`${gender === 'male' ? 'Male' : 'Female'} body composition avatar`}
        className="h-auto w-full max-w-full select-none object-contain lg:h-full lg:max-h-full lg:w-auto"
        draggable={false}
      />
      {regionFills.map((region) => (
        <div
          key={region.id}
          aria-hidden="true"
          data-region={region.id}
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
            WebkitClipPath: region.clipPath,
            clipPath: region.clipPath,
            backgroundColor: region.fill,
            // FALLBACK (Solution B): if the alpha mask reveals the full
            // bounding box of each region (the avatar SVG ships with
            // filter-emitted opaque alpha), drop the eight WebkitMask /
            // maskImage entries above and add:
            //   mixBlendMode: 'multiply',
            // The clip-path stays in place so each color still confines
            // to its body part; multiply blends the color against the
            // avatar's dark anatomy strokes so the tint only appears
            // where the figure has visible pixels.
          }}
        />
      ))}
    </div>
  );
}
