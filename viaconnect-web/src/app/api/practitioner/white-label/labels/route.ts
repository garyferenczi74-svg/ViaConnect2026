// Prompt #96 Phase 3: Practitioner label designs - list + create.
//
// GET   /api/practitioner/white-label/labels                       list practitioner's designs
// POST  /api/practitioner/white-label/labels  body: { product_catalog_id, layout_template }
//   creates a new draft design with supplement_facts_panel_data
//   auto-populated from product_catalog. Defaults display_product_name
//   to the resolved product name per brand naming scheme.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveProductName } from '@/lib/white-label/branding';
import { buildSupplementFactsPanel } from '@/lib/white-label/supplement-facts';
import { LAYOUT_TEMPLATES, CANONICAL_MANUFACTURER_LINE } from '@/lib/white-label/schema-types';

export const runtime = 'nodejs';

async function loadCtx(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners').select('id').eq('user_id', user.id).maybeSingle();
  if (!practitioner) return { ok: false as const, response: NextResponse.json({ error: 'No practitioner record' }, { status: 404 }) };
  const { data: brand } = await sb
    .from('practitioner_brand_configurations').select('*').eq('practitioner_id', practitioner.id).maybeSingle();
  return { ok: true as const, user, practitionerId: practitioner.id, brand };
}

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await loadCtx(supabase);
  if (!ctx.ok) return ctx.response;

  const sb = supabase as any;
  const { data, error } = await sb
    .from('white_label_label_designs')
    .select(`
      id, display_product_name, layout_template, status, version_number,
      is_current_version, created_at, updated_at,
      product_catalog_id,
      structure_function_claims,
      product_catalog (id, name, sku, category)
    `)
    .eq('practitioner_id', ctx.practitionerId)
    .eq('is_current_version', true)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ designs: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await loadCtx(supabase);
  if (!ctx.ok) return ctx.response;
  if (!ctx.brand) {
    return NextResponse.json({ error: 'Complete brand setup before creating labels' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { product_catalog_id?: string; layout_template?: string }
    | null;

  const productCatalogId = body?.product_catalog_id;
  if (!productCatalogId || typeof productCatalogId !== 'string') {
    return NextResponse.json({ error: 'product_catalog_id required' }, { status: 400 });
  }
  const layoutTemplate = body?.layout_template ?? 'classic_vertical';
  if (!LAYOUT_TEMPLATES.includes(layoutTemplate as typeof LAYOUT_TEMPLATES[number])) {
    return NextResponse.json({ error: `Invalid layout_template: ${layoutTemplate}` }, { status: 400 });
  }

  const sb = supabase as any;

  // Verify the SKU is white-label-eligible.
  const { data: catalogConfig } = await sb
    .from('white_label_catalog_config')
    .select('id, is_white_label_eligible, is_active')
    .eq('product_catalog_id', productCatalogId)
    .maybeSingle();
  if (!catalogConfig || !catalogConfig.is_white_label_eligible || !catalogConfig.is_active) {
    return NextResponse.json({ error: 'SKU is not white-label eligible' }, { status: 403 });
  }

  // Reject duplicate active design for the same SKU.
  const { data: existing } = await sb
    .from('white_label_label_designs')
    .select('id')
    .eq('practitioner_id', ctx.practitionerId)
    .eq('product_catalog_id', productCatalogId)
    .eq('is_current_version', true)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'A current label already exists for this SKU; PATCH it instead', design_id: existing.id }, { status: 409 });
  }

  // Pull the product to seed defaults.
  const { data: product, error: prodErr } = await sb
    .from('product_catalog')
    .select('id, name, sku, category, delivery_form, formulation_json')
    .eq('id', productCatalogId)
    .maybeSingle();
  if (prodErr || !product) {
    return NextResponse.json({ error: 'Product lookup failed' }, { status: 404 });
  }

  const facts = buildSupplementFactsPanel(product);
  const displayName = resolveProductName({
    scheme: ctx.brand.product_naming_scheme,
    practicePrefix: ctx.brand.practice_prefix,
    customName: null,
    product: { name: product.name, sku: product.sku },
  });

  const { data: inserted, error: insertErr } = await sb
    .from('white_label_label_designs')
    .insert({
      practitioner_id: ctx.practitionerId,
      brand_configuration_id: ctx.brand.id,
      product_catalog_id: productCatalogId,
      display_product_name: displayName,
      layout_template: layoutTemplate,
      supplement_facts_panel_data: facts,
      manufacturer_line: CANONICAL_MANUFACTURER_LINE,
      status: 'draft',
      version_number: 1,
      is_current_version: true,
    })
    .select('*')
    .maybeSingle();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ design: inserted, supplement_facts_warnings: facts.source_warnings }, { status: 201 });
}
