/**
 * src/lib/genetics/lifemetricsImport.ts
 *
 * Pure mapper for inbound LifeMetrics (y0urbrand tenant 355) events into
 * ViaConnect My Genetics units. Lives next to genemetricsImportPayload.ts.
 * The outbound POST /api/genex/genemetrics poller is unchanged.
 *
 * Gary units (2026-08-23):
 *   SNPs -> user_variants. Incoming panel aliases
 *     methylation / genex_m / GENEX-M / genex-m / reference -> GeneXM (methylation)
 *     nutrition / nutrigen_dx / GENEX-N -> NutrigenDX (nutrition)
 *     peptide_iq -> peptide
 *     cannabis_iq -> cannabis
 *   HormoneIQ: Precision Analytical / DUTCH / HormoneIQ provenance only
 *     -> lab_biomarkers. Never SNP rows. Never Quest or Labcorp names.
 *   EpigenHQ: TruDiagnostics / Age Rate / epigenetic clocks
 *     -> user_epigenetic_markers. Not SNPs.
 *   insight_report.generation_succeeded is metadata only.
 *   Family-to-surface routing lives in lifemetricsReportMap.ts.
 *   Demo Client 4634 / demo@genemetrics.com is never written (demo guard).
 *   UNKNOWN is not 0. Unclassified units stay unknown and are not written.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import { normalizeObservedPanelKey } from './panelKeyAliases';
import { isDutchOrHormoneIqSource } from './hormoneObservedCount';
import { epigenMarkerKeyFor } from './epigenMarkerMap';
import type { PanelKey } from './panelLabels';
import type { EpigenDirection, EpigeneticMarkerInput } from './epigenResultStore';
import type { ConfirmedBiomarker } from '@/lib/labs/labUploadStore';
import type { GenemetricsVariantInput } from './genemetricsImportPayload';

export const LIFEMETRICS_INGEST_EVENTS = [
  'genetics_result.uploaded',
  'genome_result.processing_succeeded',
  'lab_results.received',
  'lab_order.results_ready',
  'insight_report.generation_succeeded',
] as const;

export type LifemetricsIngestEvent = (typeof LIFEMETRICS_INGEST_EVENTS)[number];

const SNP_PANEL_KEYS: readonly PanelKey[] = [
  'methylation',
  'nutrition',
  'peptide',
  'cannabis',
];

const WRITE_PANEL_ALIASES: Record<string, PanelKey> = {
  'genex-n': 'nutrition',
  genex_n: 'nutrition',
  genexn: 'nutrition',
};

const QUEST_OR_LABCORP = /\b(quest|labcorp|lab-?corp)\b/i;
const TRUDIAG_OR_AGERATE =
  /trudiagnostics?|tru[\s-]?diag|age[\s-]?rate|epigen(?:etic)?[\s-]?clock|epigenhq|epigen[_-\s]?hq/i;
const HORMONE_PANEL_HINT = /hormone|dutch|precision\s*analytical/i;
const EPIGEN_PANEL_HINT = /epigen|clock|trudiag|age[\s-]?rate/i;

export interface LifemetricsSnpInput {
  userId: string;
  panel: PanelKey;
  gene: string;
  rsid: string;
  genotype: string;
  riskLevel: string;
  category: string;
  clinicalSummary: string;
}

export interface LifemetricsHormoneInput extends ConfirmedBiomarker {
  collectionDate: string | null;
}

export interface LifemetricsMappedImport {
  eventId: string | null;
  eventType: string | null;
  tenantId: string | null;
  metadataOnly: boolean;
  unknownReason: string | null;
  variants: LifemetricsSnpInput[];
  hormoneMarkers: LifemetricsHormoneInput[];
  epigeneticMarkers: EpigeneticMarkerInput[];
  hormoneLabName: string | null;
  hormoneSourceType: string | null;
  hormoneSourceFilename: string | null;
  hormoneCollectionDate: string | null;
  epigeneticLabName: string | null;
  epigeneticMeasuredOn: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function compact(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function isLifemetricsIngestEvent(value: string | null): value is LifemetricsIngestEvent {
  return Boolean(value && (LIFEMETRICS_INGEST_EVENTS as readonly string[]).includes(value));
}

export function extractLifemetricsEventId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const data = isRecord(payload.data) ? payload.data : null;
  const inner = isRecord(payload.payload) ? payload.payload : null;
  return (
    asString(payload.event_id) ??
    asString(payload.eventId) ??
    asString(payload.id) ??
    (data ? asString(data.event_id) ?? asString(data.id) : null) ??
    (inner ? asString(inner.event_id) ?? asString(inner.id) : null)
  );
}

export function extractLifemetricsEventType(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return (
    asString(payload.event) ??
    asString(payload.event_type) ??
    asString(payload.type) ??
    asString(payload.action)
  );
}

export function extractLifemetricsTenantId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const tenant = payload.tenant_id ?? payload.tenantId ?? payload.tenant;
  if (typeof tenant === 'number' && Number.isFinite(tenant)) return String(tenant);
  return asString(tenant);
}

function resolveSnpPanelKey(raw: string | null): PanelKey | null {
  if (!raw) return null;
  const extra = WRITE_PANEL_ALIASES[raw.trim().toLowerCase()] ?? WRITE_PANEL_ALIASES[compact(raw)];
  if (extra) return extra;
  const key = normalizeObservedPanelKey(raw);
  if (key && (SNP_PANEL_KEYS as readonly string[]).includes(key)) return key;
  return null;
}

function provenanceText(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' ');
}

export function isQuestOrLabcorpProvenance(
  sourceType: string | null | undefined,
  labName: string | null | undefined,
  sourceFilename: string | null | undefined,
): boolean {
  return QUEST_OR_LABCORP.test(`${sourceType ?? ''} ${labName ?? ''} ${sourceFilename ?? ''}`);
}

export function isEpigeneticPartnerProvenance(
  sourceType: string | null | undefined,
  labName: string | null | undefined,
  sourceFilename: string | null | undefined,
  panelHint: string | null | undefined,
): boolean {
  return TRUDIAG_OR_AGERATE.test(
    `${sourceType ?? ''} ${labName ?? ''} ${sourceFilename ?? ''} ${panelHint ?? ''}`,
  );
}

function hasRsid(row: Record<string, unknown>): boolean {
  return Boolean(asString(row.rsid) ?? asString(row.rs_id) ?? asString(row.snp));
}

function collectArrays(root: Record<string, unknown>): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const bags: unknown[] = [
    root.variants,
    root.snps,
    root.markers,
    root.results,
    root.biomarkers,
    root.labs,
    root.lab_results,
    root.clocks,
    root.epigenetic_markers,
    root.panels,
  ];
  if (isRecord(root.data)) {
    bags.push(
      root.data.variants,
      root.data.snps,
      root.data.markers,
      root.data.results,
      root.data.biomarkers,
      root.data.labs,
      root.data.clocks,
      root.data.panels,
    );
  }
  if (isRecord(root.payload)) {
    bags.push(
      root.payload.variants,
      root.payload.snps,
      root.payload.markers,
      root.payload.results,
      root.payload.biomarkers,
      root.payload.labs,
      root.payload.clocks,
      root.payload.panels,
    );
  }
  if (isRecord(root.result)) {
    bags.push(
      root.result.variants,
      root.result.snps,
      root.result.markers,
      root.result.results,
      root.result.biomarkers,
      root.result.clocks,
    );
  }

  for (const bag of bags) {
    if (!Array.isArray(bag)) continue;
    for (const item of bag) {
      if (!isRecord(item)) continue;
      if (Array.isArray(item.variants)) {
        for (const variant of item.variants) {
          if (isRecord(variant)) {
            out.push({
              ...variant,
              panel: variant.panel ?? item.panel ?? item.panel_key ?? item.panel_code,
              lab_name: variant.lab_name ?? item.lab_name,
              source_type: variant.source_type ?? item.source_type,
            });
          }
        }
        continue;
      }
      out.push(item);
    }
  }
  return out;
}

function rowProvenance(row: Record<string, unknown>, fallback: {
  labName: string | null;
  sourceType: string | null;
  sourceFilename: string | null;
  panelHint: string | null;
}): { labName: string | null; sourceType: string | null; sourceFilename: string | null; panelHint: string | null } {
  return {
    labName:
      asString(row.lab_name) ??
      asString(row.labName) ??
      asString(row.lab) ??
      asString(row.vendor) ??
      fallback.labName,
    sourceType:
      asString(row.source_type) ??
      asString(row.sourceType) ??
      asString(row.source) ??
      fallback.sourceType,
    sourceFilename:
      asString(row.source_filename) ??
      asString(row.sourceFilename) ??
      asString(row.filename) ??
      fallback.sourceFilename,
    panelHint:
      asString(row.panel) ??
      asString(row.panel_key) ??
      asString(row.panel_code) ??
      asString(row.unit) ??
      fallback.panelHint,
  };
}

function mapSnpRow(
  row: Record<string, unknown>,
  userId: string,
  panelHint: string | null,
): LifemetricsSnpInput | null {
  const rsid = asString(row.rsid) ?? asString(row.rs_id) ?? asString(row.snp);
  const genotype = asString(row.genotype) ?? asString(row.call) ?? asString(row.alleles);
  if (!rsid || !genotype) return null;
  const panel = resolveSnpPanelKey(
    asString(row.panel) ?? asString(row.panel_key) ?? asString(row.panel_code) ?? panelHint,
  );
  if (!panel) return null;
  return {
    userId,
    panel,
    gene: asString(row.gene) ?? asString(row.gene_symbol) ?? rsid,
    rsid,
    genotype,
    riskLevel: asString(row.risk_level) ?? asString(row.riskLevel) ?? 'unknown',
    category: asString(row.category) ?? panel,
    clinicalSummary:
      asString(row.clinical_significance) ??
      asString(row.clinical_note) ??
      asString(row.clinical_summary) ??
      '',
  };
}

function mapHormoneRow(
  row: Record<string, unknown>,
  provenance: ReturnType<typeof rowProvenance>,
): LifemetricsHormoneInput | null {
  if (hasRsid(row)) return null;
  if (isQuestOrLabcorpProvenance(provenance.sourceType, provenance.labName, provenance.sourceFilename)) {
    return null;
  }
  if (
    !isDutchOrHormoneIqSource(
      provenance.sourceType,
      provenance.labName,
      provenance.sourceFilename,
    ) &&
    !HORMONE_PANEL_HINT.test(provenance.panelHint ?? '')
  ) {
    return null;
  }
  if (
    !isDutchOrHormoneIqSource(
      provenance.sourceType,
      provenance.labName,
      provenance.sourceFilename,
    )
  ) {
    return null;
  }
  const name = asString(row.name) ?? asString(row.marker) ?? asString(row.analyte);
  const value = asNumber(row.value) ?? asNumber(row.result) ?? asNumber(row.reading);
  if (!name || value === null) return null;
  return {
    name,
    value,
    unit: asString(row.unit),
    referenceLow: asNumber(row.reference_low) ?? asNumber(row.ref_low) ?? asNumber(row.low),
    referenceHigh: asNumber(row.reference_high) ?? asNumber(row.ref_high) ?? asNumber(row.high),
    confidence: 'high',
    collectionDate:
      asString(row.collection_date) ??
      asString(row.collected_on) ??
      asString(row.measured_on) ??
      asString(row.date),
  };
}

function mapEpigenRow(
  row: Record<string, unknown>,
  provenance: ReturnType<typeof rowProvenance>,
): EpigeneticMarkerInput | null {
  if (hasRsid(row)) return null;
  if (
    !isEpigeneticPartnerProvenance(
      provenance.sourceType,
      provenance.labName,
      provenance.sourceFilename,
      provenance.panelHint,
    )
  ) {
    return null;
  }
  const label =
    asString(row.marker_key) ??
    asString(row.markerKey) ??
    asString(row.marker) ??
    asString(row.name) ??
    asString(row.clock);
  if (!label) return null;
  const markerKey = epigenMarkerKeyFor(label) ?? (label.includes('-') ? label : null);
  if (!markerKey) return null;
  const valueNum = asNumber(row.value) ?? asNumber(row.value_num) ?? asNumber(row.result);
  const valueText = asString(row.value_text) ?? asString(row.level);
  if (valueNum === null && !valueText) return null;
  const directionRaw = asString(row.direction);
  const direction: EpigenDirection | null =
    directionRaw === 'higher' || directionRaw === 'lower' || directionRaw === 'typical'
      ? directionRaw
      : null;
  return {
    markerKey,
    valueNum,
    valueText,
    unit: asString(row.unit),
    direction,
  };
}

export function emptyMappedImport(partial: Partial<LifemetricsMappedImport> = {}): LifemetricsMappedImport {
  return {
    eventId: partial.eventId ?? null,
    eventType: partial.eventType ?? null,
    tenantId: partial.tenantId ?? null,
    metadataOnly: partial.metadataOnly ?? false,
    unknownReason: partial.unknownReason ?? null,
    variants: [],
    hormoneMarkers: [],
    epigeneticMarkers: [],
    hormoneLabName: null,
    hormoneSourceType: null,
    hormoneSourceFilename: null,
    hormoneCollectionDate: null,
    epigeneticLabName: null,
    epigeneticMeasuredOn: null,
  };
}

/**
 * Map a LifeMetrics webhook or pull payload into ViaConnect write units.
 * userId must already be the exclusive resolved member. The mapper never
 * invents a destination user.
 */
export function mapLifemetricsImport(
  payload: unknown,
  userId: string,
): LifemetricsMappedImport {
  const eventId = extractLifemetricsEventId(payload);
  const eventType = extractLifemetricsEventType(payload);
  const tenantId = extractLifemetricsTenantId(payload);
  const base = emptyMappedImport({ eventId, eventType, tenantId });

  if (!userId.trim()) {
    return { ...base, unknownReason: 'unresolved_user' };
  }
  if (eventType === 'insight_report.generation_succeeded') {
    return { ...base, metadataOnly: true };
  }
  if (!isRecord(payload)) {
    return { ...base, unknownReason: 'unclassified_payload' };
  }

  const rootProvenance = {
    labName:
      asString(payload.lab_name) ??
      asString(payload.labName) ??
      (isRecord(payload.data) ? asString(payload.data.lab_name) : null) ??
      (isRecord(payload.payload) ? asString(payload.payload.lab_name) : null),
    sourceType:
      asString(payload.source_type) ??
      asString(payload.sourceType) ??
      (isRecord(payload.data) ? asString(payload.data.source_type) : null) ??
      (isRecord(payload.payload) ? asString(payload.payload.source_type) : null),
    sourceFilename:
      asString(payload.source_filename) ??
      asString(payload.filename) ??
      (isRecord(payload.data) ? asString(payload.data.source_filename) : null),
    panelHint:
      asString(payload.panel) ??
      asString(payload.panel_key) ??
      (isRecord(payload.data) ? asString(payload.data.panel) ?? asString(payload.data.panel_key) : null) ??
      (isRecord(payload.payload) ? asString(payload.payload.panel) ?? asString(payload.payload.panel_key) : null),
  };

  const rows = collectArrays(payload);
  const variants: LifemetricsSnpInput[] = [];
  const hormoneMarkers: LifemetricsHormoneInput[] = [];
  const epigeneticMarkers: EpigeneticMarkerInput[] = [];
  const seenSnp = new Set<string>();
  const seenHormone = new Set<string>();
  const seenEpigen = new Set<string>();

  let hormoneLabName: string | null = null;
  let hormoneSourceType: string | null = null;
  let hormoneSourceFilename: string | null = null;
  let hormoneCollectionDate: string | null = null;
  let epigeneticLabName: string | null = null;
  let epigeneticMeasuredOn: string | null = null;

  for (const row of rows) {
    const provenance = rowProvenance(row, rootProvenance);
    if (hasRsid(row)) {
      const snp = mapSnpRow(row, userId, provenance.panelHint);
      if (!snp) continue;
      const key = `${snp.panel}:${snp.rsid}`;
      if (seenSnp.has(key)) continue;
      seenSnp.add(key);
      variants.push(snp);
      continue;
    }

    const hormone = mapHormoneRow(row, provenance);
    if (hormone) {
      const key = hormone.name.toLowerCase();
      if (seenHormone.has(key)) continue;
      seenHormone.add(key);
      hormoneMarkers.push(hormone);
      hormoneLabName = hormoneLabName ?? provenance.labName;
      hormoneSourceType = hormoneSourceType ?? provenance.sourceType;
      hormoneSourceFilename = hormoneSourceFilename ?? provenance.sourceFilename;
      hormoneCollectionDate = hormoneCollectionDate ?? hormone.collectionDate;
      continue;
    }

    const epigen = mapEpigenRow(row, provenance);
    if (epigen) {
      if (seenEpigen.has(epigen.markerKey)) continue;
      seenEpigen.add(epigen.markerKey);
      epigeneticMarkers.push(epigen);
      epigeneticLabName = epigeneticLabName ?? provenance.labName;
      epigeneticMeasuredOn =
        epigeneticMeasuredOn ??
        asString(row.measured_on) ??
        asString(row.collection_date) ??
        asString(row.date);
    }
  }

  const classified = variants.length + hormoneMarkers.length + epigeneticMarkers.length;
  return {
    ...base,
    variants,
    hormoneMarkers,
    epigeneticMarkers,
    hormoneLabName,
    hormoneSourceType,
    hormoneSourceFilename,
    hormoneCollectionDate,
    epigeneticLabName,
    epigeneticMeasuredOn,
    unknownReason: classified === 0 && rows.length > 0 ? 'unclassified_units' : null,
  };
}

export function toGenemetricsVariantInput(row: LifemetricsSnpInput): GenemetricsVariantInput {
  return {
    userId: row.userId,
    panel: row.panel,
    gene: row.gene,
    rsid: row.rsid,
    genotype: row.genotype,
    riskLevel: row.riskLevel,
    category: row.category,
    clinicalSummary: row.clinicalSummary,
  };
}

export function hormoneProvenanceForPersist(mapped: LifemetricsMappedImport): {
  labName: string;
  sourceType: string;
  sourceFilename: string | null;
} | null {
  if (mapped.hormoneMarkers.length === 0) return null;
  const labName = mapped.hormoneLabName ?? 'HormoneIQ';
  const sourceType = mapped.hormoneSourceType ?? 'hormone_iq';
  if (
    isQuestOrLabcorpProvenance(sourceType, labName, mapped.hormoneSourceFilename) ||
    !isDutchOrHormoneIqSource(sourceType, labName, mapped.hormoneSourceFilename)
  ) {
    return null;
  }
  return {
    labName,
    sourceType,
    sourceFilename: mapped.hormoneSourceFilename,
  };
}

export function summarizeMappedImport(mapped: LifemetricsMappedImport): {
  variants: number | null;
  hormoneMarkers: number | null;
  epigeneticMarkers: number | null;
} {
  if (mapped.unknownReason && mapped.variants.length === 0 && mapped.hormoneMarkers.length === 0) {
    return { variants: null, hormoneMarkers: null, epigeneticMarkers: null };
  }
  return {
    variants: mapped.variants.length,
    hormoneMarkers: mapped.hormoneMarkers.length,
    epigeneticMarkers: mapped.epigeneticMarkers.length,
  };
}

export function provenanceDebugLabel(mapped: LifemetricsMappedImport): string {
  return provenanceText([
    mapped.hormoneLabName,
    mapped.hormoneSourceType,
    mapped.epigeneticLabName,
  ]);
}
