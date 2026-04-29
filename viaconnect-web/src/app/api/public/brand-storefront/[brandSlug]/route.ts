// Prompt #103 Phase 4: Public storefront query.
//
// GET /api/public/brand-storefront/[brandSlug]
//   -> brand record + category records + published products for that
//      brand. Public read; RLS on tables already allows anon SELECT on
//      brands / product_categories / products (storefront scope).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { brandSlug: string } },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    const sb = supabase as any;

    const brandRes = await withTimeout(
      (async () => sb
        .from('brands')
        .select('brand_id, brand_slug, display_name, wordmark_style, master_tagline, storefront_slug, storefront_theme_json')
        .eq('brand_slug', params.brandSlug)
        .maybeSingle())(),
      8000,
      'api.public.brand-storefront.brand-load',
    );
    const brand = brandRes.data;
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    const categoriesRes = await withTimeout(
      (async () => sb
        .from('product_categories')
        .select('product_category_id, category_slug, display_name, identity_mark_type, palette_rule, bottle_color_primary_hex, typography_primary_hex, accent_color_hex, dual_delivery_mark_primary_hex, dual_delivery_mark_outline_hex, tagline_primary, display_order')
        .eq('brand_id', brand.brand_id)
        .order('display_order'))(),
      8000,
      'api.public.brand-storefront.categories-load',
    );
    const categories = categoriesRes.data;

    const productsRes = await withTimeout(
      (async () => sb
        .from('products')
        .select('id, name, product_category_id, serving_count, serving_unit, dose_per_serving_text, sku_bottle_color_primary_hex, sku_typography_primary_hex, sku_typography_secondary_hex, sku_accent_color_hex, sku_dd_mark_primary_hex, sku_dd_mark_outline_hex, packaging_proof_path')
        .eq('brand_id', brand.brand_id)
        .eq('can_publish_to_storefront', true)
        .order('name'))(),
      8000,
      'api.public.brand-storefront.products-load',
    );
    const products = productsRes.data;

    return NextResponse.json({ brand, categories: categories ?? [], products: products ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.public.brand-storefront', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.public.brand-storefront', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
