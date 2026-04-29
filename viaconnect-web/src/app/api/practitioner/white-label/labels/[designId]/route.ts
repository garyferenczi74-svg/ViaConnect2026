// Prompt #96 Phase 3: Single label-design read + update.
//
// GET   /api/practitioner/white-label/labels/[designId]
// PATCH /api/practitioner/white-label/labels/[designId]
//
// PATCH refuses to mutate manufacturer_line; any client attempt is logged
// to a console warning and the field is dropped from the update set
// (the formal compliance check in Phase 4 still flags the violation if
// the practitioner finds a way around the API).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CANONICAL_MANUFACTURER_LINE, LAYOUT_TEMPLATES } from '@/lib/white-label/schema-types';
import { detectStructureFunctionClaims, detectDiseaseClaims } from '@/lib/white-label/branding';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const EDITABLE_KEYS = [
  'display_product_name', 'short_description', 'long_description', 'tagline',
  'layout_template', 'usage_directions', 'warning_text',
  'allergen_statement', 'other_ingredients',
  'structure_function_claims', 'status',
] as const;

const ALLOWED_STATUS_TRANSITIONS_FROM_PRACTITIONER = new Set<string>([
  'draft', 'ready_for_review', 'archived',
]);

async function loadCtx(supabase: ReturnType<typeof createClient>, designId: string) {
  const authResult = await withTimeout(
    supabase.auth.getUser(),
    5000,
    'api.white-label.labels.designId.auth',
  );
  const user = authResult.data.user;
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as any;
  const practitionerRes = await withTimeout(
    (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
    8000,
    'api.white-label.labels.designId.practitioner-load',
  );
  const practitioner = practitionerRes.data;
  if (!practitioner) return { ok: false as const, response: NextResponse.json({ error: 'No practitioner record' }, { status: 404 }) };

  const designRes = await withTimeout(
    (async () => sb.from('white_label_label_designs').select('*').eq('id', designId).maybeSingle())(),
    8000,
    'api.white-label.labels.designId.design-load',
  );
  const design = designRes.data;
  if (!design) return { ok: false as const, response: NextResponse.json({ error: 'Design not found' }, { status: 404 }) };
  if (design.practitioner_id !== practitioner.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true as const, user, practitionerId: practitioner.id, design };
}

function handleOuterError(err: unknown, requestId: string): NextResponse {
  if (isTimeoutError(err)) {
    safeLog.error('api.white-label.labels.designId', 'database timeout', { requestId, error: err });
    return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
  }
  safeLog.error('api.white-label.labels.designId', 'unexpected error', { requestId, error: err });
  return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
}

export async function GET(request: NextRequest, { params }: { params: { designId: string } }): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    const ctx = await loadCtx(supabase, params.designId);
    if (!ctx.ok) return ctx.response;

    const sb = supabase as any;
    const productRes = await withTimeout(
      (async () => sb
        .from('product_catalog')
        .select('id, name, sku, category, delivery_form')
        .eq('id', ctx.design.product_catalog_id)
        .maybeSingle())(),
      8000,
      'api.white-label.labels.designId.product-load',
    );
    const product = productRes.data;
    const brandRes = await withTimeout(
      (async () => sb
        .from('practitioner_brand_configurations')
        .select('*')
        .eq('id', ctx.design.brand_configuration_id)
        .maybeSingle())(),
      8000,
      'api.white-label.labels.designId.brand-load',
    );
    const brand = brandRes.data;

    return NextResponse.json({ design: ctx.design, product, brand });
  } catch (err) {
    return handleOuterError(err, requestId);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { designId: string } }): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    const ctx = await loadCtx(supabase, params.designId);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};

    // Strict reject of non-canonical manufacturer_line so a misconfigured form
    // surfaces a clear error instead of silently dropping the field.
    if (body.manufacturer_line !== undefined && body.manufacturer_line !== CANONICAL_MANUFACTURER_LINE) {
      safeLog.warn('api.white-label.labels.designId', 'rejected manufacturer_line mutation', { requestId, designId: params.designId });
      return NextResponse.json({
        error: 'manufacturer_line is non-editable. Drop the field from your request to save.',
        canonical: CANONICAL_MANUFACTURER_LINE,
      }, { status: 400 });
    }
    if (body.supplement_facts_panel_data !== undefined) {
      safeLog.warn('api.white-label.labels.designId', 'rejected supplement_facts_panel_data mutation', { requestId, designId: params.designId });
      return NextResponse.json({
        error: 'supplement_facts_panel_data is auto-populated and non-editable. Drop the field from your request to save.',
      }, { status: 400 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of EDITABLE_KEYS) {
      if (body[k] !== undefined) update[k] = body[k];
    }

    if (update.layout_template && !LAYOUT_TEMPLATES.includes(update.layout_template as typeof LAYOUT_TEMPLATES[number])) {
      return NextResponse.json({ error: `Invalid layout_template: ${update.layout_template}` }, { status: 400 });
    }
    if (update.status && !ALLOWED_STATUS_TRANSITIONS_FROM_PRACTITIONER.has(update.status as string)) {
      return NextResponse.json({ error: `Practitioners cannot set status to ${update.status}` }, { status: 400 });
    }

    // Force the canonical manufacturer line on every save, defending against any
    // client that managed to slip a different value in.
    update.manufacturer_line = CANONICAL_MANUFACTURER_LINE;

    // Pre-flight claim hints (advisory; not a blocker).
    const advisoryFlags: string[] = [];
    const allTextFields = [
      body.display_product_name ?? ctx.design.display_product_name,
      body.short_description ?? ctx.design.short_description,
      body.long_description ?? ctx.design.long_description,
      body.tagline ?? ctx.design.tagline,
      ...((body.structure_function_claims ?? ctx.design.structure_function_claims) ?? []),
    ].filter(Boolean).join(' ');
    if (detectDiseaseClaims(allTextFields)) {
      advisoryFlags.push('Likely disease claim language detected; this will be rejected at compliance review.');
    }
    if (detectStructureFunctionClaims(allTextFields)) {
      advisoryFlags.push('Structure/function language detected; medical-director review will be required when you submit.');
    }

    const sb = supabase as any;
    const updateRes = await withTimeout(
      (async () => sb
        .from('white_label_label_designs')
        .update(update)
        .eq('id', params.designId)
        .select('*')
        .maybeSingle())(),
      8000,
      'api.white-label.labels.designId.patch',
    );
    const data = updateRes.data;
    const error = updateRes.error;
    if (error) {
      safeLog.error('api.white-label.labels.designId', 'patch failed', { requestId, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ design: data, advisory_flags: advisoryFlags });
  } catch (err) {
    return handleOuterError(err, requestId);
  }
}
