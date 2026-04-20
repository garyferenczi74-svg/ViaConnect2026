// Prompt #96 Phase 6: White-label SKU resolver.
//
// Critical: even though the patient sees the practitioner's brand, the
// adherence + drug-drug-interaction systems need the underlying ViaCura
// formulation to do their cross-patient analytics. This resolver
// translates a list of supplements (where some carry a white-label SKU
// reference) into the underlying product_catalog ids.
//
// Patient-facing UI (My Protocols, My Supplements) should still display
// the practitioner-branded name; that mapping is loaded separately and
// keyed off the same white_label_sku_mappings row this resolver uses.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvableSupplement {
  /** product_catalog_id when consumer SKU; label_design_id when white-label */
  reference_id: string;
  reference_kind: 'product_catalog' | 'white_label_label_design';
  /** Additional metadata the caller wants preserved through resolution. */
  meta?: Record<string, unknown>;
}

export interface ResolvedSupplement {
  reference_id: string;
  reference_kind: 'product_catalog' | 'white_label_label_design';
  underlying_product_catalog_id: string;
  practitioner_id: string | null;
  display_name: string | null;
  meta?: Record<string, unknown>;
}

export async function resolveSupplements(
  inputs: ResolvableSupplement[],
  supabase: SupabaseClient | unknown,
): Promise<ResolvedSupplement[]> {
  const sb = supabase as any;
  const labelIds = inputs
    .filter((i) => i.reference_kind === 'white_label_label_design')
    .map((i) => i.reference_id);
  const productIds = inputs
    .filter((i) => i.reference_kind === 'product_catalog')
    .map((i) => i.reference_id);

  // Look up white-label mappings in one go.
  let mappings: Array<{
    label_design_id: string;
    underlying_viacura_product_id: string;
    practitioner_id: string;
    display_name: string | null;
  }> = [];
  if (labelIds.length > 0) {
    const { data } = await sb
      .from('white_label_sku_mappings')
      .select('label_design_id, underlying_viacura_product_id, practitioner_id, display_name')
      .in('label_design_id', labelIds)
      .eq('is_active', true);
    mappings = (data ?? []) as typeof mappings;
  }
  const byLabel = new Map(mappings.map((m) => [m.label_design_id, m]));

  // Look up product names for direct-product references.
  let productNames = new Map<string, string>();
  if (productIds.length > 0) {
    const { data } = await sb
      .from('product_catalog')
      .select('id, name')
      .in('id', productIds);
    productNames = new Map(((data ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
  }

  return inputs.map((input) => {
    if (input.reference_kind === 'white_label_label_design') {
      const m = byLabel.get(input.reference_id);
      return {
        reference_id: input.reference_id,
        reference_kind: input.reference_kind,
        underlying_product_catalog_id: m?.underlying_viacura_product_id ?? input.reference_id,
        practitioner_id: m?.practitioner_id ?? null,
        display_name: m?.display_name ?? null,
        meta: input.meta,
      };
    }
    return {
      reference_id: input.reference_id,
      reference_kind: input.reference_kind,
      underlying_product_catalog_id: input.reference_id,
      practitioner_id: null,
      display_name: productNames.get(input.reference_id) ?? null,
      meta: input.meta,
    };
  });
}
