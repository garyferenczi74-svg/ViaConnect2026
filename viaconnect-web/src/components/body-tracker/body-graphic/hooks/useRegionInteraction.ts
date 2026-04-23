"use client";

// Prompt #118 — Region interaction helper. Logs telemetry to
// /api/body-graphic/interaction on every click/hover/focus/long-press.

import { useCallback } from "react";
import type { BodyMode, BodyView, Gender, RegionId } from "../BodyGraphic.types";

export function useRegionInteraction(context: {
  mode: BodyMode; gender: Gender; view: BodyView;
}) {
  const log = useCallback((regionId: RegionId, interactionType: "click" | "hover" | "focus" | "long-press") => {
    if (typeof window === "undefined") return;
    // Fire-and-forget
    fetch("/api/body-graphic/interaction", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ region_id: regionId, interaction_type: interactionType, ...context }),
    }).catch(() => {/* telemetry is non-critical */});
  }, [context]);

  return { log };
}
