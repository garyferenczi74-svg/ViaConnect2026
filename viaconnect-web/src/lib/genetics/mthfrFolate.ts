// Brief 6 / Brief 17 honesty: MTHFR folate copy is GeneXM / genex_m only.
// NutrigenDX and other panels may mention MTHFR as a neighbor gene, but they
// do not own the folate implication. No new SNP math lives here.

import { normalizeObservedPanelKey } from './panelKeyAliases';
import type { PanelKey } from './panelLabels';

/** Canonical MTHFR folate rsIDs already shipped on GeneXM. */
export const MTHFR_FOLATE_RSIDS: ReadonlySet<string> = new Set([
  'rs1801133',
  'rs1801131',
  'rs2066470',
]);

export function isMthfrFolateTarget(
  rsid: string | null | undefined,
  gene?: string | null,
): boolean {
  const geneKey = (gene ?? '').trim().toLowerCase();
  if (geneKey === 'mthfr') return true;
  const id = (rsid ?? '').trim().toLowerCase();
  return MTHFR_FOLATE_RSIDS.has(id);
}

/**
 * Folate implication copy for MTHFR is allowed only on the remapped
 * methylation / genex_m panel. A remap miss is not genex_m.
 */
export function mayShowMthfrFolate(
  panelKeyOrRaw: PanelKey | string | null | undefined,
): boolean {
  const key =
    panelKeyOrRaw === 'methylation'
      ? 'methylation'
      : normalizeObservedPanelKey(
          typeof panelKeyOrRaw === 'string' ? panelKeyOrRaw : null,
        );
  return key === 'methylation';
}
