// Pure builders for GET /api/genetics/variants.
// Groups remapped / Genemetrics panel_key spellings onto hub PanelKey pills,
// attaches HormoneIQ and EpigenHQ observed counts from their own tables, and
// keeps UNKNOWN distinct from honest empty.
//
// Marketing catalog sizes (panels.ts markerCount, HERO_BENTO_META) are not
// inputs here. user_variants SNP length never becomes the HormoneIQ count.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import { PANEL_KEYS, type PanelKey } from './panelLabels';
import { normalizeObservedPanelKey } from './panelKeyAliases';
import {
  emptyObservedByPanel,
  mergeObservedByPanel,
  sumObservedCounts,
  unknownObservedByPanel,
  type ObservedByPanel,
  type ObservedLoadStatus,
} from './observedPanelCounts';
import type { HubHormoneMarker } from './hormoneObservedCount';
import { uniqueHormoneMarkers, type HormoneMarkerSourceRow } from './hormoneObservedCount';

export interface HubEpigeneticMarker {
  markerKey: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
}

export interface HubVariantsPayload<TVariant extends { panel_key: string }> {
  variantsByPanel: Partial<Record<PanelKey, Array<TVariant & { panel_key: PanelKey }>>>;
  brandedPanels: PanelKey[];
  observedByPanel: ObservedByPanel;
  totalVariants: number | null;
  loadStatus: ObservedLoadStatus;
  hormoneMarkers: HubHormoneMarker[];
  epigeneticMarkers: HubEpigeneticMarker[];
}

const SNP_COUNT_PANELS: ReadonlySet<PanelKey> = new Set([
  'methylation',
  'nutrition',
  'peptide',
  'cannabis',
]);

export function groupVariantsByObservedPanel<TVariant extends { panel_key: string }>(
  rows: TVariant[],
): Partial<Record<PanelKey, Array<TVariant & { panel_key: PanelKey }>>> {
  const grouped: Partial<Record<PanelKey, Array<TVariant & { panel_key: PanelKey }>>> = {};
  for (const row of rows) {
    const key = normalizeObservedPanelKey(row.panel_key);
    if (!key) continue;
    const next = { ...row, panel_key: key };
    (grouped[key] ??= []).push(next);
  }
  return grouped;
}

export function countDistinctEpigeneticMarkers(
  markerKeys: Array<string | null | undefined>,
): number {
  const keys = new Set<string>();
  for (const raw of markerKeys) {
    const key = raw?.trim();
    if (key) keys.add(key);
  }
  return keys.size;
}

export function unauthorizedHubPayload<TVariant extends { panel_key: string }>(): HubVariantsPayload<TVariant> {
  return {
    variantsByPanel: {},
    brandedPanels: [],
    observedByPanel: unknownObservedByPanel(),
    totalVariants: null,
    loadStatus: 'unauthorized',
    hormoneMarkers: [],
    epigeneticMarkers: [],
  };
}

export function errorHubPayload<TVariant extends { panel_key: string }>(): HubVariantsPayload<TVariant> {
  return {
    variantsByPanel: {},
    brandedPanels: [],
    observedByPanel: unknownObservedByPanel(),
    totalVariants: null,
    loadStatus: 'error',
    hormoneMarkers: [],
    epigeneticMarkers: [],
  };
}

export function emptyOkHubPayload<TVariant extends { panel_key: string }>(): HubVariantsPayload<TVariant> {
  return {
    variantsByPanel: {},
    brandedPanels: [],
    observedByPanel: emptyObservedByPanel(),
    totalVariants: 0,
    loadStatus: 'ok',
    hormoneMarkers: [],
    epigeneticMarkers: [],
  };
}

export interface BuildHubVariantsArgs<TVariant extends { panel_key: string }> {
  variantRows: TVariant[] | null;
  variantsReadFailed: boolean;
  hormoneRows: HormoneMarkerSourceRow[] | null;
  hormoneReadFailed: boolean;
  epigeneticRows: HubEpigeneticMarker[] | null;
  epigeneticReadFailed: boolean;
  brandedPanels: PanelKey[];
}

/**
 * Assemble the hub payload from independently loaded sources.
 * A failed source marks only that panel UNKNOWN. A successful empty source
 * is 0. HormoneIQ never uses variantRows.length.
 */
export function buildHubVariantsPayload<TVariant extends { panel_key: string }>(
  args: BuildHubVariantsArgs<TVariant>,
): HubVariantsPayload<TVariant> {
  if (args.variantsReadFailed && args.hormoneReadFailed && args.epigeneticReadFailed) {
    return errorHubPayload();
  }

  const variantsByPanel = args.variantsReadFailed
    ? {}
    : groupVariantsByObservedPanel(args.variantRows ?? []);

  const hormoneMarkers = args.hormoneReadFailed
    ? []
    : uniqueHormoneMarkers(args.hormoneRows ?? []);

  const epigeneticMarkers = args.epigeneticReadFailed
    ? []
    : (args.epigeneticRows ?? []).filter((row) => row.markerKey.trim().length > 0);

  const snpCounts: Partial<Record<PanelKey, number | null>> = {};
  for (const key of PANEL_KEYS) {
    if (!SNP_COUNT_PANELS.has(key)) continue;
    snpCounts[key] = args.variantsReadFailed
      ? null
      : (variantsByPanel[key] ?? []).length;
  }

  const observedByPanel = mergeObservedByPanel({
    ...snpCounts,
    hormone: args.hormoneReadFailed ? null : hormoneMarkers.length,
    epigenetic: args.epigeneticReadFailed
      ? null
      : countDistinctEpigeneticMarkers(epigeneticMarkers.map((row) => row.markerKey)),
  });

  return {
    variantsByPanel,
    brandedPanels: args.brandedPanels,
    observedByPanel,
    totalVariants: sumObservedCounts(observedByPanel),
    loadStatus: 'ok',
    hormoneMarkers,
    epigeneticMarkers,
  };
}
