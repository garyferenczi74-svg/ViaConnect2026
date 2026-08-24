// Brief 19: GENEX360 catalog sizes are the six panels.ts markerCounts.
// Never invent "500+ variants" or any other unbacked panel count.
//
// Order matches GENEX360_PANELS / PANEL_BY_SLUG source order:
//   GeneXM 20 SNPs, NutrigenDX 27 SNPs, HormoneIQ 29 DUTCH markers,
//   EpigenHQ 12 clocks, PeptideIQ 14 genes, CannabisIQ 10 genes.
//
// Marketing catalog sizes are not observed hub badges. Observed 0 stays
// Not analyzed (see formatObservedBadge). PR 32 / 42 own Demo and Unanalyzed.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import type { PanelSlug } from '@/data/genex360/types';
import { GENEX360_PANELS, PANEL_BY_SLUG } from '@/data/genex360/panels';
import { PANEL_LABELS, type PanelKey } from './panelLabels';

export const CATALOG_MARKER_COUNTS = [20, 27, 29, 12, 14, 10] as const;

export const CATALOG_SIZE_LABEL = CATALOG_MARKER_COUNTS.join(' / ');

/** Live markerCount list from panels.ts. Must equal CATALOG_MARKER_COUNTS. */
export function catalogMarkerCountsFromPanels(): readonly number[] {
  return GENEX360_PANELS.map((panel) => panel.markerCount);
}

export function catalogCountForPanel(panelKey: PanelKey): number {
  const slug = PANEL_LABELS[panelKey].slug as PanelSlug;
  return PANEL_BY_SLUG[slug].markerCount;
}

/**
 * Hub empty copy. Names the on-file catalog so empty never reads as
 * "this test has no panel."
 */
export function catalogOnFileLine(panelKey: PanelKey): string {
  const entry = PANEL_LABELS[panelKey];
  const count = catalogCountForPanel(panelKey);
  return `The ${entry.branded_label} catalog has ${count} ${entry.count_unit}. Empty here means not analyzed, not that the catalog is missing.`;
}

/** Hub header when every known panel is honest empty. Not "0 results". */
export function honestEmptyHeaderBadge(total: number | null): string | null {
  if (total === 0) return 'Not analyzed';
  return null;
}
