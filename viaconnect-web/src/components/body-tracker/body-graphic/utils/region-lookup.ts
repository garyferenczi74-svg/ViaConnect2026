// Prompt #118 — Region lookup helpers backed by the static registries.

import { allRegions, compositionRegions, muscleRegions, indexById, filterByView, sortByDisplayOrder } from "../regions";
import type { BodyMode, BodyView, RegionDefinition, RegionId } from "../BodyGraphic.types";

const ALL_BY_ID = indexById(allRegions);

export function getRegion(id: RegionId): RegionDefinition | undefined {
  return ALL_BY_ID.get(id);
}

export function getDisplayName(id: RegionId, locale: "en" | "fr" = "en"): string {
  const r = ALL_BY_ID.get(id);
  if (!r) return id;
  if (locale === "fr" && r.displayNameFr) return r.displayNameFr;
  return r.displayName;
}

export function regionsForContext(mode: BodyMode, view: BodyView): RegionDefinition[] {
  const base = mode === "composition" ? compositionRegions : muscleRegions;
  return sortByDisplayOrder(filterByView(base, view));
}

export function isValidRegion(id: string): id is RegionId {
  return ALL_BY_ID.has(id);
}

export function isBilateral(id: RegionId): boolean {
  return !!ALL_BY_ID.get(id)?.isBilateral;
}

export function getBilateralCounterpart(id: RegionId): RegionId | null {
  if (id.endsWith("-right")) return id.replace(/-right$/, "-left");
  if (id.endsWith("-left")) return id.replace(/-left$/, "-right");
  return null;
}
