// Prompt #124 P6: Corpus-manifest helper.
//
// Defines which reference-corpus artifact kinds are REQUIRED vs OPTIONAL
// for a given SKU, and reports coverage gaps so Steve + marketing know
// what to photograph during the Phase A shoot. Pure function set; no I/O.
//
// The required set is a baseline. Certain kinds are conditionally required:
//   - 'hologram' only for SKUs that ship with an authentication hologram
//   - 'blister_pack' only for SKUs packaged as tablets/capsules
//   - 'box_face' only for SKUs that ship in a branded outer box
//
// Callers supply per-SKU hints; without hints, only the universal
// baseline is enforced.

import { ARTIFACT_KINDS, type ArtifactKind } from './types';

export const UNIVERSAL_REQUIRED: ReadonlyArray<ArtifactKind> = [
  'studio_front',
  'studio_back',
  'label_front',
  'label_back',
  'studio_top',
  'studio_bottom',
  'batch_template',
];

export const SIDE_KINDS: ReadonlyArray<ArtifactKind> = [
  'studio_left',
  'studio_right',
];

export interface SkuPackagingHints {
  /** True if the authentic SKU ships with an authentication hologram. */
  hasHologram?: boolean;
  /** True if the SKU is packaged in a blister pack (tablets/capsules). */
  hasBlisterPack?: boolean;
  /** True if the SKU ships in a branded outer box. */
  hasBox?: boolean;
  /** True if the SKU ships with a product insert / leaflet. */
  hasInsert?: boolean;
  /** True if the SKU carries a QR code that resolves to FarmCeutica URLs. */
  hasQrCode?: boolean;
}

export interface CoverageReport {
  sku: string;
  required: ArtifactKind[];
  optional: ArtifactKind[];
  present: ArtifactKind[];
  missingRequired: ArtifactKind[];
  unapprovedRequired: ArtifactKind[];
  percentRequiredComplete: number;
}

export interface CorpusEntrySummary {
  sku: string;
  artifactKind: ArtifactKind;
  approved: boolean;
  retired: boolean;
}

/**
 * Compute the required set for a SKU, given packaging hints. The baseline
 * applies to every SKU; hints add conditional kinds.
 */
export function requiredKindsForSku(hints: SkuPackagingHints = {}): ArtifactKind[] {
  const req: ArtifactKind[] = [...UNIVERSAL_REQUIRED];
  if (hints.hasHologram)    req.push('hologram');
  if (hints.hasBlisterPack) req.push('blister_pack');
  if (hints.hasBox)         req.push('box_face');
  if (hints.hasInsert)      req.push('insert');
  if (hints.hasQrCode)      req.push('qr_code_sample');
  return req;
}

/**
 * Optional kinds for a SKU: side profiles + reseller_mark (for gray-market
 * detection) + any kind from ARTIFACT_KINDS not in the required set.
 */
export function optionalKindsForSku(hints: SkuPackagingHints = {}): ArtifactKind[] {
  const required = new Set(requiredKindsForSku(hints));
  const optional: ArtifactKind[] = [...SIDE_KINDS, 'reseller_mark'];
  // Anything from the enum not already required and not already in optional.
  for (const k of ARTIFACT_KINDS) {
    if (!required.has(k) && !optional.includes(k)) optional.push(k);
  }
  return optional;
}

/**
 * Given corpus entries for a SKU, return a coverage report.
 * - `present` = artifact_kinds that have at least one approved, non-retired entry
 * - `missingRequired` = required kinds with zero entries (approved or not)
 * - `unapprovedRequired` = required kinds that have entries but none approved
 */
export function computeCoverage(
  sku: string,
  entries: readonly CorpusEntrySummary[],
  hints: SkuPackagingHints = {},
): CoverageReport {
  const required = requiredKindsForSku(hints);
  const optional = optionalKindsForSku(hints);

  const byKind = new Map<ArtifactKind, CorpusEntrySummary[]>();
  for (const e of entries.filter((x) => x.sku === sku)) {
    if (!byKind.has(e.artifactKind)) byKind.set(e.artifactKind, []);
    byKind.get(e.artifactKind)!.push(e);
  }

  const present: ArtifactKind[] = [];
  for (const [kind, list] of byKind.entries()) {
    const hasApproved = list.some((e) => e.approved && !e.retired);
    if (hasApproved) present.push(kind);
  }

  const missingRequired = required.filter((k) => !byKind.has(k));
  const unapprovedRequired = required.filter(
    (k) => byKind.has(k) && !byKind.get(k)!.some((e) => e.approved && !e.retired),
  );

  const requiredPresent = required.filter((k) => present.includes(k)).length;
  const percentRequiredComplete = required.length === 0
    ? 100
    : Math.round((requiredPresent / required.length) * 100);

  return {
    sku,
    required,
    optional,
    present,
    missingRequired,
    unapprovedRequired,
    percentRequiredComplete,
  };
}

/**
 * Aggregate coverage across many SKUs. Returns one CoverageReport per SKU
 * plus an overall summary.
 */
export interface AggregateCoverage {
  perSku: CoverageReport[];
  totalSkus: number;
  fullyCoveredSkus: number;
  averageRequiredComplete: number;
}

export function aggregateCoverage(
  skus: ReadonlyArray<{ sku: string; hints?: SkuPackagingHints }>,
  entries: readonly CorpusEntrySummary[],
): AggregateCoverage {
  const perSku = skus.map((s) => computeCoverage(s.sku, entries, s.hints));
  const fully = perSku.filter((r) => r.percentRequiredComplete === 100).length;
  const avg = perSku.length === 0
    ? 0
    : Math.round(perSku.reduce((acc, r) => acc + r.percentRequiredComplete, 0) / perSku.length);
  return {
    perSku,
    totalSkus: skus.length,
    fullyCoveredSkus: fully,
    averageRequiredComplete: avg,
  };
}
