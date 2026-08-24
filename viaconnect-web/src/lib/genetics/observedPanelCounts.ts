// Observed GENEX360 hub counts. Separate from panels.ts / HERO_BENTO_META
// marketing catalog sizes. A live badge is always an observed count from the
// member's stored results, or UNKNOWN (null). It is never a catalog size and
// never a fabricated 0 after an error.
//
// Units follow the test type:
//   GeneXM / genex_m     SNPs (methylation + PGx)
//   NutrigenDX           genetic nutrition markers
//   HormoneIQ            DUTCH hormone / metabolite markers (never SNP length)
//   EpigenHQ             clocks / CpG from user_epigenetic_markers
//   PeptideIQ/CannabisIQ genes
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import { PANEL_KEYS, PANEL_LABELS, type PanelKey } from './panelLabels';
import type { PanelCountUnit } from './panelLabels';
import { normalizeObservedPanelKey } from './panelKeyAliases';

/** Fail / null / remap miss badge. Never a number. Never dishonest "n/a". */
export const UNANALYZED_LABEL = 'Unanalyzed';

export type ObservedLoadStatus = 'ok' | 'error' | 'unauthorized';

export type ObservedCountStatus = 'ok' | 'unknown';

export interface ObservedPanelCount {
  panel_key: PanelKey;
  /** Observed rows for this test. Null means UNKNOWN, never display as 0. */
  count: number | null;
  unit: PanelCountUnit;
  status: ObservedCountStatus;
  /** Where the count was read. Marketing catalog is never a source. */
  source:
    | 'user_variants'
    | 'hormone_markers'
    | 'epigenetic_markers'
    | 'unknown';
}

export type ObservedByPanel = Record<PanelKey, ObservedPanelCount>;

export function unitForPanel(panelKey: PanelKey): PanelCountUnit {
  return PANEL_LABELS[panelKey].count_unit;
}

export function sourceForPanel(
  panelKey: PanelKey,
): ObservedPanelCount['source'] {
  if (panelKey === 'hormone') return 'hormone_markers';
  if (panelKey === 'epigenetic') return 'epigenetic_markers';
  return 'user_variants';
}

function makeCount(
  panelKey: PanelKey,
  count: number | null,
  status: ObservedCountStatus,
): ObservedPanelCount {
  return {
    panel_key: panelKey,
    count,
    unit: unitForPanel(panelKey),
    status,
    source: status === 'unknown' ? 'unknown' : sourceForPanel(panelKey),
  };
}

/** Honest empty: the read succeeded and this member has no results. */
export function emptyObservedByPanel(): ObservedByPanel {
  const out = {} as ObservedByPanel;
  for (const key of PANEL_KEYS) {
    out[key] = makeCount(key, 0, 'ok');
  }
  return out;
}

/**
 * UNKNOWN for every pill. Used for 401 and thrown / read failures.
 * Distinct from emptyObservedByPanel(): count is null, not 0.
 */
export function unknownObservedByPanel(): ObservedByPanel {
  const out = {} as ObservedByPanel;
  for (const key of PANEL_KEYS) {
    out[key] = makeCount(key, null, 'unknown');
  }
  return out;
}

/**
 * Merge per-panel observed numbers onto an empty-ok baseline.
 * A null input count marks that panel UNKNOWN without writing 0.
 */
export function mergeObservedByPanel(
  counts: Partial<Record<PanelKey, number | null>>,
): ObservedByPanel {
  const out = emptyObservedByPanel();
  for (const key of PANEL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(counts, key)) continue;
    const value = counts[key];
    if (value === null || value === undefined) {
      out[key] = makeCount(key, null, 'unknown');
    } else {
      out[key] = makeCount(key, value, 'ok');
    }
  }
  return out;
}

/**
 * Sum known observed counts. UNKNOWN panels contribute nothing (not 0).
 * Returns null when every panel is UNKNOWN so a header cannot show 0.
 */
export function sumObservedCounts(observed: ObservedByPanel): number | null {
  let sum = 0;
  let anyKnown = false;
  for (const key of PANEL_KEYS) {
    const row = observed[key];
    if (row.status === 'ok' && row.count !== null) {
      sum += row.count;
      anyKnown = true;
    }
  }
  return anyKnown ? sum : null;
}

/**
 * Format a pill badge. Fail / null render as Unanalyzed, never "0" and never
 * dishonest "n/a" in a numeric slot. Honest empty renders as "0 SNPs".
 */
export function formatObservedBadge(row: ObservedPanelCount): string {
  if (row.status === 'unknown' || row.count === null) return UNANALYZED_LABEL;
  return `${row.count} ${row.unit}`;
}

/**
 * Badge for a stored panel_key. A remap miss is Unanalyzed, not 0.
 */
export function observedBadgeForRawPanelKey(
  raw: string | null | undefined,
  observed: ObservedByPanel,
): string {
  const key = normalizeObservedPanelKey(raw);
  if (!key) return UNANALYZED_LABEL;
  return formatObservedBadge(observed[key]);
}

/** Prove fail-open-as-0 is not the same as honest empty. */
export function isUnknownObserved(row: ObservedPanelCount): boolean {
  return row.status === 'unknown' || row.count === null;
}

export function isHonestEmptyObserved(row: ObservedPanelCount): boolean {
  return row.status === 'ok' && row.count === 0;
}
