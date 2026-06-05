// =============================================================================
// Prompt 175l (2026-06-05): canonical product ingest route.
//
// Fired by the supplement-confirmation save path on every user-confirmed
// product. Upserts a PHI-free product row into supplement_reference_canonical
// so Hannah and the resolver chain progressively build out the internal
// catalog as users scan real products.
//
// Authentication: required (so we can attribute the source as user_scan
// vs anonymous). The route does NOT store any user-identifying data
// in the canonical row; only the product catalog fields.
// =============================================================================

import { NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ingestCanonicalProduct,
  type CanonicalSource,
} from '@/lib/caq/supplements/canonical-ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

interface IngestPayload {
  upc?: unknown;
  npn?: unknown;
  dsldId?: unknown;
  brand?: unknown;
  productName?: unknown;
  primaryStrength?: unknown;
  form?: unknown;
  structuredIngredients?: unknown;
  source?: unknown;
}

const VALID_SOURCES: ReadonlySet<CanonicalSource> = new Set([
  'lnhpd', 'dsld', 'curated', 'user_scan',
]);

export async function POST(request: Request) {
  let body: IngestPayload | null = null;
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') {
      body = parsed as IngestPayload;
    }
  } catch {
    body = null;
  }

  if (!body) {
    return NextResponse.json({ ok: false, reason: 'invalid_body' }, { status: 200 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 200 });
  }

  const productName = typeof body.productName === 'string' ? body.productName.trim() : '';
  if (!productName) {
    return NextResponse.json({ ok: false, reason: 'product_name_required' }, { status: 200 });
  }

  const source: CanonicalSource = (typeof body.source === 'string' && VALID_SOURCES.has(body.source as CanonicalSource))
    ? body.source as CanonicalSource
    : 'user_scan';

  // Defensive coercion: every string field is trimmed and the
  // structured_ingredients payload is coerced to an array of plain
  // objects so a misshapen client cannot inject arbitrary JSON.
  const upc = typeof body.upc === 'string' ? body.upc.trim() : null;
  const npn = typeof body.npn === 'string' ? body.npn.trim() : null;
  const dsldId = typeof body.dsldId === 'string' ? body.dsldId.trim() : null;
  const brand = typeof body.brand === 'string' ? body.brand.trim() : null;
  const primaryStrength = typeof body.primaryStrength === 'string' ? body.primaryStrength.trim() : null;
  const form = typeof body.form === 'string' ? body.form.trim() : null;

  const ingredientsRaw = Array.isArray(body.structuredIngredients) ? body.structuredIngredients : [];
  const structuredIngredients = ingredientsRaw
    .filter((it): it is Record<string, unknown> => it !== null && typeof it === 'object' && !Array.isArray(it))
    .slice(0, 64);

  const admin = createAdminClient();
  const result = await ingestCanonicalProduct(
    {
      upc: upc && upc.length > 0 ? upc : null,
      npn: npn && npn.length > 0 ? npn : null,
      dsldId: dsldId && dsldId.length > 0 ? dsldId : null,
      brand: brand && brand.length > 0 ? brand : null,
      productName,
      primaryStrength: primaryStrength && primaryStrength.length > 0 ? primaryStrength : null,
      form: form && form.length > 0 ? form : null,
      structuredIngredients,
      source,
    },
    admin,
  );

  if (!result.ok) {
    safeLog.warn('caq.canonical-ingest', 'route ingest failed', { reason: result.reason });
  }

  return NextResponse.json({
    ok: result.ok,
    identityKey: result.identityKey,
    upserted: result.upserted,
    reason: result.reason,
  }, { status: 200 });
}
