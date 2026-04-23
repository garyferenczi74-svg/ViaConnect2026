// Prompt #118 — Shared types + helpers for region registries.

import type { RegionDefinition, RegionId, BodyView } from "../BodyGraphic.types";

export function filterByView<T extends RegionDefinition>(regions: readonly T[], view: BodyView): T[] {
  return regions.filter((r) => r.hasView.includes(view));
}

export function filterByGroup<T extends RegionDefinition>(regions: readonly T[], group: RegionDefinition["anatomicalGroup"]): T[] {
  return regions.filter((r) => r.anatomicalGroup === group);
}

export function indexById<T extends RegionDefinition>(regions: readonly T[]): Map<RegionId, T> {
  const m = new Map<RegionId, T>();
  for (const r of regions) m.set(r.id, r);
  return m;
}

export function sortByDisplayOrder<T extends RegionDefinition>(regions: readonly T[]): T[] {
  return [...regions].sort((a, b) => a.displayOrder - b.displayOrder);
}
