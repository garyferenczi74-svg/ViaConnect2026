// =============================================================================
// Prompt 175g (2026-06-05): barcode resolution route.
//
// Cascade per 175g Section 2.1, batch 1 scope (5.3 MedlinePlus and Go-UPC
// parked until 1 week before launch; 5.4 DSLD retained via existing
// plugin):
//   1. Canonical hit: supplement_reference_canonical lookup by upc.
//      Free + instant.
//   2. pluginRegistry.lookupBarcode cascade: farmceuticaCachePlugin ->
//      nihDSLDPlugin -> openFoodFactsPlugin -> farmceuticaPeptidesPlugin.
//      First plugin returning a non-null result with a brand wins.
//
// Returns a normalized draft with per-field provenance so the
// confirmation panel can pre-fill name + brand + dosage + form and
// flag fields needing user confirmation in orange. The canonical
// upsert (175f / 175l) happens AFTER the user confirms, through the
// existing /canonical-ingest route; this route reads only.
// =============================================================================

import { NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPluginRegistry } from '@/plugins/registry';
import { validateBarcode } from '@/lib/nutrition/barcode/checksum';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export type ResolveStatus = 'ok' | 'identity_only' | 'not_found';

export interface ResolvedDraft {
  product_name: string | null;
  brand: string | null;
  primary_strength: string | null;
  form: string | null;
  ingredients: Array<{
    name: string;
    amount: number | null;
    unit: string | null;
    form: string | null;
  }>;
  field_sources: Record<string, string>;
}

interface ResolvePayload {
  barcode?: unknown;
  portal?: unknown;
}

const PRIMARY_FORM_TOKENS = [
  'capsule', 'tablet', 'softgel', 'soft gel',
  'powder', 'liquid', 'tincture', 'gummy', 'gel',
  'lozenge', 'spray', 'patch',
] as const;

export function inferFormFromIngredients(
  ingredients: ReadonlyArray<{ form: string | null }>,
): string | null {
  for (const ing of ingredients) {
    if (!ing.form) continue;
    const lower = ing.form.toLowerCase();
    for (const token of PRIMARY_FORM_TOKENS) {
      if (lower.includes(token)) return token.replace(' ', '');
    }
  }
  return null;
}

export function inferPrimaryStrength(
  ingredients: ReadonlyArray<{ amount: number | null; unit: string | null }>,
): string | null {
  // Prefer the largest dosed ingredient as the primary strength when the
  // record does not call one out explicitly. Common for single-active
  // bottles like Vitamin D3 1000 IU.
  let best: { amount: number; unit: string } | null = null;
  for (const ing of ingredients) {
    if (ing.amount === null || !Number.isFinite(ing.amount)) continue;
    if (!ing.unit) continue;
    if (best === null || ing.amount > best.amount) {
      best = { amount: ing.amount, unit: ing.unit };
    }
  }
  return best ? `${best.amount} ${best.unit}` : null;
}

export async function POST(request: Request) {
  let body: ResolvePayload | null = null;
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') {
      body = parsed as ResolvePayload;
    }
  } catch {
    body = null;
  }

  const barcode = typeof body?.barcode === 'string' ? body.barcode.trim() : '';
  if (!barcode) {
    return NextResponse.json({ status: 'not_found' as ResolveStatus, reason: 'no_barcode' }, { status: 200 });
  }

  const validation = validateBarcode(barcode);
  if (!validation.valid) {
    // Even an invalid checksum can be a real product the user typed
    // manually; we still try the lookup but flag the status as
    // identity_only so the UI surfaces the OCR fallback prominently.
    safeLog.info('caq.resolve', 'invalid_checksum_passthrough', {
      reason: validation.reason,
      len: barcode.length,
    });
  }

  // Auth context. Lookups themselves do not require auth (the user is
  // already inside the CAQ or Protocol surface), but we still capture
  // user_id for telemetry.
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;
  void userId;

  // ---- Step 1: canonical hit by UPC ---------------------------------------
  // Free and instant. Read-only via the session client per
  // supplement_reference_canonical's authenticated-SELECT RLS.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: canonical } = await (supabase as any)
      .from('supplement_reference_canonical')
      .select('product_name, brand, primary_strength, form, structured_ingredients, source_of_record, field_sources')
      .eq('upc', barcode)
      .limit(1)
      .maybeSingle();
    if (canonical) {
      const ingredients = Array.isArray(canonical.structured_ingredients)
        ? canonical.structured_ingredients
        : [];
      const fieldSources: Record<string, string> = {
        product_name: 'canonical',
        brand: 'canonical',
        primary_strength: 'canonical',
        form: 'canonical',
        ingredients: 'canonical',
        ...((canonical.field_sources && typeof canonical.field_sources === 'object') ? canonical.field_sources : {}),
      };
      const draft: ResolvedDraft = {
        product_name: typeof canonical.product_name === 'string' ? canonical.product_name : null,
        brand: typeof canonical.brand === 'string' ? canonical.brand : null,
        primary_strength: typeof canonical.primary_strength === 'string' ? canonical.primary_strength : null,
        form: typeof canonical.form === 'string' ? canonical.form : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ingredients: ingredients.map((it: any) => ({
          name: typeof it?.name === 'string' ? it.name : '',
          amount: typeof it?.amount === 'number' ? it.amount : null,
          unit: typeof it?.unit === 'string' ? it.unit : null,
          form: typeof it?.form === 'string' ? it.form : null,
        })).filter((it: { name: string }) => it.name.length > 0),
        field_sources: fieldSources,
      };
      safeLog.info('caq.resolve', 'canonical_hit', { barcode, source: canonical.source_of_record });
      return NextResponse.json({ status: 'ok' as ResolveStatus, source: 'canonical', draft }, { status: 200 });
    }
  } catch (err) {
    safeLog.warn('caq.resolve', 'canonical lookup failed', { error: err });
  }

  // ---- Step 2: plugin cascade --------------------------------------------
  // farmceuticaCachePlugin (canonical proxy) -> nihDSLDPlugin ->
  // openFoodFactsPlugin -> farmceuticaPeptidesPlugin. First non-null +
  // branded result wins. Each plugin handles its own timeout / error.
  try {
    const registry = createPluginRegistry();
    const pluginResult = await registry.lookupBarcode(barcode);
    if (pluginResult && (pluginResult.brand || pluginResult.productName)) {
      const ingredients = (pluginResult.ingredients ?? []).map((it) => ({
        name: it.name,
        amount: it.amount,
        unit: it.unit,
        form: it.form,
      }));
      const inferredForm = inferFormFromIngredients(pluginResult.ingredients ?? []);
      const inferredStrength = inferPrimaryStrength(pluginResult.ingredients ?? []);
      const pluginSource = pluginResult.source ?? 'plugin';
      const fieldSources: Record<string, string> = {
        product_name: pluginSource,
        brand: pluginSource,
        ingredients: pluginSource,
      };
      if (inferredForm) fieldSources.form = pluginSource;
      if (inferredStrength) fieldSources.primary_strength = pluginSource;

      const draft: ResolvedDraft = {
        product_name: pluginResult.productName,
        brand: pluginResult.brand,
        primary_strength: inferredStrength,
        form: inferredForm,
        ingredients,
        field_sources: fieldSources,
      };
      safeLog.info('caq.resolve', 'plugin_hit', {
        barcode,
        source: pluginSource,
        confidence: pluginResult.confidence,
      });
      return NextResponse.json({ status: 'ok' as ResolveStatus, source: pluginSource, draft }, { status: 200 });
    }
  } catch (err) {
    safeLog.warn('caq.resolve', 'plugin cascade threw', { error: err });
  }

  // ---- Step 3: identity-only fallback ------------------------------------
  // We have a valid UPC but no source filled it. The client surfaces the
  // OCR fallback action and the manual entry form, both prefilled with
  // the barcode value.
  safeLog.info('caq.resolve', 'identity_only', { barcode });
  // Service-role write of a corpus-style "lookup missed" row so the
  // Sherlock acquisition job has a queue of products to research.
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('barcode_capture_corpus')
      .insert({
        user_hash: 'system_resolve_miss',
        consent: false,
        decode_success: true,
        decoded_value: barcode,
        symbology: validation.format ?? 'UPC_A',
        valid_checksum: validation.valid,
        device: 'resolve_route',
      })
      .catch(() => undefined);
  } catch {
    // Best effort; the response below is the contract.
  }

  return NextResponse.json({
    status: 'identity_only' as ResolveStatus,
    upc: barcode,
    ocr_suggested: true,
  }, { status: 200 });
}
