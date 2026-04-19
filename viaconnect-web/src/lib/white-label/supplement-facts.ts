// Prompt #96 Phase 3: Supplement-facts panel builder.
//
// Given a product_catalog row, produce the JSONB shape that
// white_label_label_designs.supplement_facts_panel_data expects. The
// panel is auto-populated at design creation and is non-editable by the
// practitioner; the practitioner only chooses display name, claims,
// directions, etc. on top.
//
// The product_catalog.formulation_json shape is partly free-form across
// the seed data (it predates white-label), so we accept a few common
// shapes and normalize. When the source is missing required fields, we
// emit a minimal panel and surface a warnings array so the label
// designer can flag the practitioner ("we are missing serving size for
// this SKU; ask ViaCura ops to populate before submitting for review").

export interface SupplementFactsIngredient {
  name: string;
  amount: string;            // e.g. "500 mg" or "100 mcg"
  daily_value_percent: number | null; // null = "not established"
}

export interface SupplementFactsPanel {
  serving_size: string;
  servings_per_container: number;
  net_quantity: string;      // e.g. "60 capsules"
  ingredients: SupplementFactsIngredient[];
  source_warnings: string[];
}

export interface ProductCatalogRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  delivery_form: string | null;
  formulation_json: unknown;
}

export function buildSupplementFactsPanel(product: ProductCatalogRow): SupplementFactsPanel {
  const warnings: string[] = [];
  const f = (product.formulation_json ?? {}) as Record<string, unknown>;

  const servingSize = stringOr(f.serving_size, null);
  if (!servingSize) warnings.push('serving_size missing on product_catalog.formulation_json');

  const servingsPerContainer = numberOr(f.servings_per_container, null);
  if (servingsPerContainer == null) warnings.push('servings_per_container missing');

  const netQuantity = stringOr(f.net_quantity, null) ??
    deriveNetQuantity(servingsPerContainer, product.delivery_form);
  if (!netQuantity) warnings.push('net_quantity could not be derived');

  const ingredients = normalizeIngredients(f.ingredients);
  if (ingredients.length === 0) warnings.push('ingredients list is empty');

  return {
    serving_size: servingSize ?? 'unknown',
    servings_per_container: servingsPerContainer ?? 0,
    net_quantity: netQuantity ?? 'unknown',
    ingredients,
    source_warnings: warnings,
  };
}

function stringOr(v: unknown, fallback: string | null): string | null {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  return fallback;
}

function numberOr(v: unknown, fallback: number | null): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function deriveNetQuantity(servings: number | null, deliveryForm: string | null): string | null {
  if (servings == null) return null;
  const form = (deliveryForm ?? '').toLowerCase();
  if (form === 'capsule') return `${servings} capsules`;
  if (form === 'tablet') return `${servings} tablets`;
  if (form === 'softgel') return `${servings} softgels`;
  if (form === 'gummy') return `${servings} gummies`;
  return `${servings} servings`;
}

function normalizeIngredients(raw: unknown): SupplementFactsIngredient[] {
  if (!Array.isArray(raw)) return [];
  const out: SupplementFactsIngredient[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const name = stringOr(o.name ?? o.ingredient ?? o.compound, null);
    if (!name) continue;
    const amount =
      stringOr(o.amount ?? o.dose ?? o.amount_per_serving, null) ??
      'amount unspecified';
    const dvRaw = o.daily_value_percent ?? o.dv_percent ?? o.dv;
    const dv = numberOr(dvRaw, null);
    out.push({ name, amount, daily_value_percent: dv });
  }
  return out;
}
