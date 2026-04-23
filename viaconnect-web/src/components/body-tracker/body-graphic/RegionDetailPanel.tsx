"use client";

// Prompt #118 — Region detail panel. Right-side on desktop, bottom sheet on
// mobile. Renders metric summary + Arnold coaching blurb (Kelsey-gated) +
// DSHEA disclaimer when required (US S/F claims).

import type { FC } from "react";
import { X, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { motionPresets, REDUCED_MOTION } from "./utils/motion-presets";
import { useBodyGraphicState } from "./hooks/useBodyGraphicState";
import { useArnoldBlurb } from "./hooks/useArnoldBlurb";
import { getDisplayName } from "./utils/region-lookup";
import { DSHEADisclaimer } from "@/components/compliance/DSHEADisclaimer";
import type { BodyMode, RegionId, RegionOverlayData } from "./BodyGraphic.types";

interface Props {
  regionId: RegionId;
  overlayData?: RegionOverlayData;
  mode: BodyMode;
  onClose: () => void;
  locale?: "en" | "fr";
}

export const RegionDetailPanel: FC<Props> = ({ regionId, overlayData, mode, onClose, locale = "en" }) => {
  const { prefersReducedMotion } = useBodyGraphicState();
  const arnold = useArnoldBlurb({
    regionId,
    mode,
    metricValue: overlayData?.rawValue,
    metricUnit: overlayData?.unit,
    trend: overlayData?.trend,
  });

  const TrendIcon = overlayData?.trend === "up" ? TrendingUp
    : overlayData?.trend === "down" ? TrendingDown
    : Minus;

  return (
    <motion.aside
      {...(prefersReducedMotion ? { initial: false, transition: REDUCED_MOTION } : motionPresets.panelSlideIn)}
      role="complementary"
      aria-label={`Details for ${getDisplayName(regionId, locale)}`}
      className="fixed inset-y-0 right-0 z-20 w-full sm:w-96 lg:relative lg:inset-auto lg:w-auto
                 bg-[#1E3054] border-l border-slate-700 lg:rounded-2xl lg:border shadow-xl flex flex-col"
      style={{ borderColor: "rgba(45,165,160,0.15)" }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-700 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{getDisplayName(regionId, locale)}</h3>
          <p className="text-xs text-slate-500 capitalize">{mode}</p>
        </div>
        <button type="button" aria-label="Close panel" onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800">
          <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <section aria-label="Metric summary" className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
          <div className="flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-wider text-slate-400">Latest</div>
            <TrendIcon className="h-4 w-4 text-slate-400" strokeWidth={1.5} aria-hidden />
          </div>
          {overlayData?.rawValue !== undefined ? (
            <div className="mt-1 text-3xl font-semibold text-slate-100">
              {overlayData.rawValue}
              <span className="ml-1 text-base font-normal text-slate-400">{overlayData.unit ?? ""}</span>
            </div>
          ) : (
            <div className="mt-1 text-sm text-slate-500">No measurement yet. Log one to get Arnold coaching.</div>
          )}
          {overlayData?.lastMeasuredAt && (
            <div className="mt-1 text-xs text-slate-500">Measured {new Date(overlayData.lastMeasuredAt).toLocaleDateString()}</div>
          )}
        </section>

        <section aria-label="Arnold coaching" className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            <div className="text-xs uppercase tracking-wider text-slate-400">Arnold</div>
          </div>
          {arnold.loading && <div className="mt-2 h-8 animate-pulse rounded bg-slate-800" />}
          {arnold.error && <div className="mt-2 text-sm text-slate-400">Keep at it, champ.</div>}
          {arnold.data && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{arnold.data.blurb}</p>
          )}
        </section>
      </div>

      {arnold.data?.disclaimer_required && (
        <DSHEADisclaimer surface="body-graphic-region-panel" surfaceId={regionId} jurisdiction="US" />
      )}
    </motion.aside>
  );
};
