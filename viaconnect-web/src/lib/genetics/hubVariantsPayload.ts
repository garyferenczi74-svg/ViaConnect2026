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
import {
  resolveGeneticsUploadState,
  type GeneticsUploadState,
} from './geneticsUploadState';
import { variantRowChip, type VariantRowChipKind } from './variantRowChip';
import type { VariantProvenance } from './variantProvenance';

export interface HubEpigeneticMarker {
  markerKey: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
}

export interface HubVariantHonestyFields {
  stored_panel_key?: string | null;
  chip?: VariantRowChipKind;
  provenance?: VariantProvenance | null;
  is_sample?: boolean | null;
}

export interface HubVariantsPayload<TVariant extends { panel_key: string }> {
  variantsByPanel: Partial<Record<PanelKey, Array<TVariant & { panel_key: PanelKey }>>>;
  brandedPanels: PanelKey[];
  observedByPanel: ObservedByPanel;
  totalVariants: number | null;
  loadStatus: ObservedLoadStatus;
  hormoneMarkers: HubHormoneMarker[];
  epigeneticMarkers: HubEpigeneticMarker[];
  geneticsUploadState: GeneticsUploadState;
  geneticsUploaded: boolean;
}

const SNP_COUNT_PANELS: ReadonlySet<PanelKey> = new Set([
  'methylation',
  'nutrition',
  'peptide',
  'cannabis',
]);

export function groupVariantsByObservedPanel<TVariant extends { panel_key: string }>(
  rows: TVariant[],
): Partial<Record<PanelKey, Array<TVariant & { panel_key: PanelKey } & HubVariantHonestyFields>>> {
  const grouped: Partial<
    Record<PanelKey, Array<TVariant & { panel_key: PanelKey } & HubVariantHonestyFields>>
  > = {};
  for (const row of rows) {
    const key = normalizeObservedPanelKey(row.panel_key);
    const stored =
      'stored_panel_key' in row && typeof row.stored_panel_key === 'string'
        ? row.stored_panel_key
        : row.panel_key;
    const honestyRow = row as TVariant & HubVariantHonestyFields;
    const chip = variantRowChip({
      is_sample: honestyRow.is_sample,
      genotype:
        'genotype' in row && typeof row.genotype === 'string' ? row.genotype : null,
      status: 'status' in row && typeof row.status === 'string' ? row.status : null,
      stored_panel_key: stored,
      remapMiss: !key,
    });
    if (!key) continue;
    const next = {
      ...row,
      panel_key: key,
      stored_panel_key: stored,
      chip,
    };
    (grouped[key] ??= []).push(next);
  }
  return grouped;
}

/** Rows whose panel_key did not remap. Those are Unanalyzed, never 0. */
export function countUnmappedVariantRows<TVariant extends { panel_key: string }>(
  rows: TVariant[],
): number {
  let count = 0;
  for (const row of rows) {
    if (!normalizeObservedPanelKey(row.panel_key)) count += 1;
  }
  return count;
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
    geneticsUploadState: 'none',
    geneticsUploaded: false,
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
    geneticsUploadState: 'none',
    geneticsUploaded: false,
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
    geneticsUploadState: 'none',
    geneticsUploaded: false,
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
  realKitIngest?: boolean;
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
  const unmappedCount = args.variantsReadFailed
    ? 0
    : countUnmappedVariantRows(args.variantRows ?? []);
  let anyMappedSnp = false;
  for (const key of PANEL_KEYS) {
    if (!SNP_COUNT_PANELS.has(key)) continue;
    if ((variantsByPanel[key] ?? []).length > 0) anyMappedSnp = true;
  }
  const allRemapMiss =
    !args.variantsReadFailed &&
    unmappedCount > 0 &&
    !anyMappedSnp &&
    (args.variantRows ?? []).length > 0;

  for (const key of PANEL_KEYS) {
    if (!SNP_COUNT_PANELS.has(key)) continue;
    if (args.variantsReadFailed || allRemapMiss) {
      snpCounts[key] = null;
      continue;
    }
    snpCounts[key] = (variantsByPanel[key] ?? []).length;
  }

  const observedByPanel = mergeObservedByPanel({
    ...snpCounts,
    hormone: args.hormoneReadFailed ? null : hormoneMarkers.length,
    epigenetic: args.epigeneticReadFailed
      ? null
      : countDistinctEpigeneticMarkers(epigeneticMarkers.map((row) => row.markerKey)),
  });

  const geneticsUploadState = args.variantsReadFailed
    ? resolveGeneticsUploadState({
        variantRows: [],
        realKitIngest: args.realKitIngest === true,
      })
    : resolveGeneticsUploadState({
        variantRows: (args.variantRows ?? []) as Array<{ is_sample?: boolean | null }>,
        realKitIngest: args.realKitIngest === true,
      });

  return {
    variantsByPanel,
    brandedPanels: args.brandedPanels,
    observedByPanel,
    totalVariants: sumObservedCounts(observedByPanel),
    loadStatus: 'ok',
    hormoneMarkers,
    epigeneticMarkers,
    geneticsUploadState,
    geneticsUploaded: geneticsUploadState === 'uploaded',
  };
}
