// Brief 16 / Brief 51: per-row honesty chips for Your Variants.
// Demo | Unanalyzed | Reference | your upload | GENEX360 | GeneXM.
// Never "Your variant". Display name is GeneXM. Stored aliases map at display time.
// Fail / missing call => Unanalyzed. No new SNP math.

import { normalizeObservedPanelKey } from './panelKeyAliases';
import { GENEX360_DISPLAY_LABEL, GENEXM_DISPLAY_LABEL, YOUR_UPLOAD_CHIP } from './geneLineProvenance';

export type VariantRowChipKind =
  | 'demo'
  | 'unanalyzed'
  | 'reference'
  | 'your_upload'
  | 'genex360'
  | 'genexm';

export const VARIANT_ROW_CHIP_LABEL: Record<VariantRowChipKind, string> = {
  demo: 'Demo',
  unanalyzed: 'Unanalyzed',
  reference: 'Reference',
  your_upload: YOUR_UPLOAD_CHIP,
  genex360: GENEX360_DISPLAY_LABEL,
  genexm: GENEXM_DISPLAY_LABEL,
};

export interface VariantRowChipInput {
  is_sample?: boolean | null;
  genotype?: string | null;
  status?: string | null;
  stored_panel_key?: string | null;
  remapMiss?: boolean;
}

export function hasVariantCall(row: {
  genotype?: string | null;
  status?: string | null;
}): boolean {
  const genotype = (row.genotype ?? '').trim();
  const status = (row.status ?? '').trim();
  return genotype.length > 0 || status.length > 0;
}

export function parseVariantRowChipKind(raw: unknown): VariantRowChipKind | null {
  if (
    raw === 'demo' ||
    raw === 'unanalyzed' ||
    raw === 'reference' ||
    raw === 'your_upload' ||
    raw === 'genex360' ||
    raw === 'genexm'
  ) {
    return raw;
  }
  return null;
}

export function variantRowChip(row: VariantRowChipInput): VariantRowChipKind {
  if (row.is_sample === true) return 'demo';
  if (row.remapMiss === true) return 'unanalyzed';
  const stored = (row.stored_panel_key ?? '').trim();
  if (stored.toLowerCase() === 'reference' && !hasVariantCall(row)) return 'reference';
  if (!hasVariantCall(row)) return 'unanalyzed';
  const key = normalizeObservedPanelKey(stored);
  if (key === 'methylation') return 'genexm';
  if (
    key === 'nutrition' ||
    key === 'hormone' ||
    key === 'epigenetic' ||
    key === 'peptide' ||
    key === 'cannabis'
  ) {
    return 'genex360';
  }
  return 'your_upload';
}
