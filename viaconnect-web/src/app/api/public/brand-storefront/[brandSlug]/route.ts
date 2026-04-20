// Prompt #103 Phase 4: Public storefront query.
//
// GET /api/public/brand-storefront/[brandSlug]
//   -> brand record + category records + published products for that
//      brand. Public read; RLS on tables already allows anon SELECT on
//      brands / product_categories / products (storefront scope).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { brandSlug: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const sb = supabase as any;

  const { data: brand } = await sb
    .from('brands')
    .select('brand_id, brand_slug, display_name, wordmark_style, master_tagline, storefront_slug, storefront_theme_json')
    .eq('brand_slug', params.brandSlug)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

  const { data: categories } = await sb
    .from('product_categories')
    .select('product_category_id, category_slug, display_name, identity_mark_type, palette_rule, bottle_color_primary_hex, typography_primary_hex, accent_color_hex, dual_delivery_mark_primary_hex, dual_delivery_mark_outline_hex, tagline_primary, display_order')
    .eq('brand_id', brand.brand_id)
    .order('display_order');

  const { data: products } = await sb
    .from('products')
    .select('id, name, product_category_id, serving_count, serving_unit, dose_per_serving_text, sku_bottle_color_primary_hex, sku_typography_primary_hex, sku_typography_secondary_hex, sku_accent_color_hex, sku_dd_mark_primary_hex, sku_dd_mark_outline_hex, packaging_proof_path')
    .eq('brand_id', brand.brand_id)
    .eq('can_publish_to_storefront', true)
    .order('name');

  return NextResponse.json({ brand, categories: categories ?? [], products: products ?? [] });
}
