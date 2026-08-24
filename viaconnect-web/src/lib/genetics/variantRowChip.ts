// Brief 16: per-row honesty chips for Your Variants.
// Demo | Result | Unanalyzed | Reference. Never "Your variant".
// No new SNP math.

export type VariantRowChipKind = 'demo' | 'result' | 'unanalyzed' | 'reference';

export const VARIANT_ROW_CHIP_LABEL: Record<VariantRowChipKind, string> = {
  demo: 'Demo',
  result: 'Result',
  unanalyzed: 'Unanalyzed',
  reference: 'Reference',
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

export function variantRowChip(row: VariantRowChipInput): VariantRowChipKind {
  if (row.is_sample === true) return 'demo';
  if (row.remapMiss === true) return 'unanalyzed';
  const stored = (row.stored_panel_key ?? '').trim().toLowerCase();
  if (stored === 'reference' && !hasVariantCall(row)) return 'reference';
  if (!hasVariantCall(row)) return 'unanalyzed';
  return 'result';
}
