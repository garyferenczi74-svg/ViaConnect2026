"use client";

// Prompt #118 — SVG render orchestration. Picks the right SVG asset by
// (gender, view) and threads the overlay fills + interactive flags down.

import { useMemo, type FC } from "react";
import { SVG_REGISTRY, type SvgKey } from "./assets";
import { colorScale, alphaFill } from "./utils/color-scale";
import type { BodyMode, BodyView, Gender, RegionId, RegionOverlayData } from "./BodyGraphic.types";

interface Props {
  mode: BodyMode;
  gender: Gender;
  view: BodyView;
  overlayData: Record<RegionId, RegionOverlayData>;
  selectedRegion: RegionId | null;
  highlightedRegions: RegionId[];
  showLabels: boolean;
  showAnatomicalDetail: boolean;
  onRegionClick: (regionId: RegionId) => void;
  onRegionHover?: (regionId: RegionId | null) => void;
}

export const BodyCanvas: FC<Props> = ({
  mode, gender, view, overlayData, selectedRegion, highlightedRegions,
  showAnatomicalDetail, onRegionClick, onRegionHover,
}) => {
  const key = `${gender}-${view}` as SvgKey;
  const SvgComponent = SVG_REGISTRY[key];

  const regionOverlayFills = useMemo(() => {
    const fills: Record<RegionId, string> = {};
    for (const [rid, data] of Object.entries(overlayData)) {
      const base = data.color ?? colorScale(data.value, data.status);
      fills[rid] = alphaFill(base, 0.5);
    }
    return fills;
  }, [overlayData]);

  const allHighlights = useMemo(() => {
    const set = new Set(highlightedRegions);
    if (selectedRegion) set.add(selectedRegion);
    return Array.from(set);
  }, [highlightedRegions, selectedRegion]);

  return (
    <SvgComponent
      showAnatomicalDetail={showAnatomicalDetail}
      showCompositionRegions={mode === "composition"}
      showMuscleRegions={mode === "muscle"}
      onRegionClick={onRegionClick}
      onRegionHover={onRegionHover}
      highlightedRegions={allHighlights}
      regionOverlayFills={regionOverlayFills}
      className="text-[#2DA5A0] w-full h-auto max-h-[700px]"
    />
  );
};
