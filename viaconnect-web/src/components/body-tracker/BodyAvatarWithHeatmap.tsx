'use client';

// Prompt #85n: BodyAvatar wrapped with a 12-region SVG heat-map overlay.
//
// Each region's fill is computed from getRegionFill, which keys off
// changeData + metric (fat or muscle) to return a red, yellow, or green
// rgba. The overlay is purely decorative (aria-hidden,
// pointer-events-none); the underlying numeric values surface in the 12
// flanking BodyPartCallout cards. SVG paths are approximate per the spec
// and ship in 0 to 400 / 0 to 800 viewBox space; #85n.1 calibrates each
// path against the actual avatar anatomy.

import { BodyAvatar } from './BodyAvatar';
import { BODY_REGIONS_OVERLAY } from './avatarOverlayPaths';
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

export function BodyAvatarWithHeatmap({
  gender,
  changeData,
  metric,
  className,
}: BodyAvatarWithHeatmapProps) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center ${className ?? ''}`}
      data-testid="body-avatar-heatmap"
    >
      <BodyAvatar gender={gender} />
      <svg
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {BODY_REGIONS_OVERLAY.map((region) => (
          <path
            key={region.id}
            data-region={region.id}
            d={gender === 'male' ? region.malePath : region.femalePath}
            fill={getRegionFill(region.id, changeData, metric)}
            stroke="none"
          />
        ))}
      </svg>
    </div>
  );
}
