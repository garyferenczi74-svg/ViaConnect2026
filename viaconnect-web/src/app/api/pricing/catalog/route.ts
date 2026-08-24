import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  loadPricingCatalog,
  isPricingCatalogError,
  PRICING_CATALOG_TIMEOUT_MS,
} from '@/lib/pricing/catalog';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = await createClient();
    const catalog = await loadPricingCatalog(supabase, PRICING_CATALOG_TIMEOUT_MS);
    return NextResponse.json(catalog, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error) {
    if (isPricingCatalogError(error)) {
      safeLog.error('api.pricing.catalog', error.message, { requestId, status: error.status });
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    safeLog.error('api.pricing.catalog', 'unexpected error', { requestId, error });
    return NextResponse.json(
      { error: 'We could not load live membership prices. Please try again.' },
      { status: 500 },
    );
  }
}
