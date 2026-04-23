"use client";

// Prompt #118 — Top-level Body Graphic component.

import { useCallback, useState, type FC } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BodyCanvas } from "./BodyCanvas";
import { GenderToggle } from "./GenderToggle";
import { ViewToggle } from "./ViewToggle";
import { GraphicControls } from "./GraphicControls";
import { RegionDetailPanel } from "./RegionDetailPanel";
import { useBodyGraphicState } from "./hooks/useBodyGraphicState";
import { useRegionInteraction } from "./hooks/useRegionInteraction";
import { motionPresets, REDUCED_MOTION } from "./utils/motion-presets";
import type { BodyGraphicProps, RegionId } from "./BodyGraphic.types";

export const BodyGraphic: FC<BodyGraphicProps> = ({
  mode, gender, onGenderChange, view, onViewChange,
  overlayData = {}, onRegionClick: onRegionClickExt,
  selectedRegion: selectedRegionExt, highlightedRegions = [],
  showLabels: showLabelsExt, showAnatomicalDetail: showDetailExt,
  size = "standard", className, onInteractionEvent,
}) => {
  const { prefersReducedMotion } = useBodyGraphicState();
  const { log } = useRegionInteraction({ mode, gender, view });

  const [internalSelected, setInternalSelected] = useState<RegionId | null>(null);
  const selectedRegion = selectedRegionExt !== undefined ? selectedRegionExt : internalSelected;

  const [showLabels, setShowLabels] = useState<boolean>(!!showLabelsExt);
  const [showAnatomicalDetail, setShowAnatomicalDetail] = useState<boolean>(showDetailExt ?? true);

  const fireEvent = useCallback(
    (type: Parameters<NonNullable<typeof onInteractionEvent>>[0]["type"], payload?: Record<string, unknown>) => {
      onInteractionEvent?.({ type, payload, timestamp: Date.now() });
    },
    [onInteractionEvent],
  );

  const handleRegionClick = useCallback((regionId: RegionId) => {
    log(regionId, "click");
    fireEvent("region-click", { regionId });
    if (onRegionClickExt) onRegionClickExt(regionId);
    else setInternalSelected((prev) => (prev === regionId ? null : regionId));
  }, [log, fireEvent, onRegionClickExt]);

  const handleRegionHover = useCallback((regionId: RegionId | null) => {
    if (regionId) log(regionId, "hover");
    fireEvent("region-hover", { regionId });
  }, [log, fireEvent]);

  const handleCloseDetail = useCallback(() => {
    fireEvent("panel-close");
    if (!onRegionClickExt) setInternalSelected(null);
  }, [onRegionClickExt, fireEvent]);

  const canvasMotion = prefersReducedMotion
    ? { initial: false, animate: {}, exit: {}, transition: REDUCED_MOTION }
    : motionPresets.genderSwap;

  const paddingClass = size === "compact" ? "p-4" : size === "large" ? "p-8" : "p-6";

  return (
    <div
      className={`relative flex flex-col gap-6 lg:flex-row bg-[#1A2744] rounded-2xl ${paddingClass} ${className ?? ""}`}
      data-mode={mode}
      data-gender={gender}
      data-view={view}
    >
      {/* Top toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <ViewToggle value={view} onChange={(v) => { fireEvent("view-change", { view: v }); onViewChange(v); }} />
        </div>
        <div className="pointer-events-auto">
          <GenderToggle value={gender} onChange={(g) => { fireEvent("gender-change", { gender: g }); onGenderChange(g); }} />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center min-h-[500px] pt-20 pb-16 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${gender}-${view}`}
            initial={canvasMotion.initial}
            animate={canvasMotion.animate}
            exit={canvasMotion.exit}
            transition={canvasMotion.transition}
            className="w-full h-full flex items-center justify-center"
          >
            <BodyCanvas
              mode={mode}
              gender={gender}
              view={view}
              overlayData={overlayData}
              selectedRegion={selectedRegion}
              highlightedRegions={highlightedRegions}
              showLabels={showLabels}
              showAnatomicalDetail={showAnatomicalDetail}
              onRegionClick={handleRegionClick}
              onRegionHover={handleRegionHover}
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <GraphicControls
            showLabels={showLabels}
            showAnatomicalDetail={showAnatomicalDetail}
            onToggleLabels={() => { setShowLabels((x) => !x); fireEvent("label-toggle", { showLabels: !showLabels }); }}
            onToggleAnatomicalDetail={() => setShowAnatomicalDetail((x) => !x)}
          />
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedRegion && (
          <RegionDetailPanel
            regionId={selectedRegion}
            overlayData={overlayData[selectedRegion]}
            mode={mode}
            onClose={handleCloseDetail}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
