// Prompt #96 Phase 3: Practitioner brand-configuration CRUD.
//
// GET    /api/practitioner/white-label/brand   read own brand (or 404)
// POST   /api/practitioner/white-label/brand   create (only one per practitioner;
//                                              409 if exists; requires enrollment)
// PATCH  /api/practitioner/white-label/brand   update fields (idempotent;
//                                              re-runs validation; revokes
//                                              brand_config_approved when any
//                                              user-visible field changes)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateBrandConfiguration, type BrandConfigInput } from '@/lib/white-label/branding';

export const runtime = 'nodejs';

const FIELD_KEYS = [
  'brand_name', 'brand_tagline', 'brand_description',
  'logo_primary_url', 'logo_secondary_url', 'logo_monochrome_url', 'wordmark_url',
  'primary_color_hex', 'secondary_color_hex', 'accent_color_hex',
  'background_color_hex', 'text_color_hex',
  'brand_font_primary', 'brand_font_secondary',
  'practice_legal_name', 'practice_address_line_1', 'practice_address_line_2',
  'practice_city', 'practice_state', 'practice_postal_code', 'practice_country',
  'practice_phone', 'practice_email', 'practice_website',
  'product_naming_scheme', 'practice_prefix',
] as const;

const VALIDATABLE_FIELDS = new Set([
  'brand_name', 'primary_color_hex', 'secondary_color_hex', 'accent_color_hex',
  'background_color_hex', 'text_color_hex',
  'practice_legal_name', 'practice_address_line_1', 'practice_city',
  'practice_state', 'practice_postal_code', 'practice_phone', 'practice_email',
  'product_naming_scheme', 'practice_prefix',
]);

async function loadPractitionerAndEnrollment(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners').select('id').eq('user_id', user.id).maybeSingle();
  if (!practitioner) {
    return { ok: false as const, response: NextResponse.json({ error: 'No practitioner record for this user' }, { status: 404 }) };
  }

  const { data: enrollment } = await sb
    .from('white_label_enrollments')
    .select('id, status')
    .eq('practitioner_id', practitioner.id)
    .maybeSingle();
  if (!enrollment) {
    return { ok: false as const, response: NextResponse.json({ error: 'Enroll in white-label before creating a brand' }, { status: 403 }) };
  }
  if (!['eligibility_verified', 'brand_setup', 'first_production_order', 'active'].includes(enrollment.status)) {
    return { ok: false as const, response: NextResponse.json({ error: `Enrollment status ${enrollment.status} does not permit brand setup` }, { status: 403 }) };
  }

  return { ok: true as const, user, practitionerId: practitioner.id, enrollmentId: enrollment.id };
}

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await loadPractitionerAndEnrollment(supabase);
  if (!ctx.ok) return ctx.response;

  const sb = supabase as any;
  const { data, error } = await sb
    .from('practitioner_brand_configurations')
    .select('*')
    .eq('practitioner_id', ctx.practitionerId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ brand: null });
  return NextResponse.json({ brand: data });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await loadPractitionerAndEnrollment(supabase);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};
  const validation = validateBrandConfiguration(body as BrandConfigInput);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Brand validation failed', errors: validation.errors }, { status: 400 });
  }

  const insertRow: Record<string, unknown> = {
    practitioner_id: ctx.practitionerId,
    enrollment_id: ctx.enrollmentId,
  };
  for (const k of FIELD_KEYS) {
    if (body[k] !== undefined) insertRow[k] = body[k];
  }

  const sb = supabase as any;
  const { data: existing } = await sb
    .from('practitioner_brand_configurations').select('id').eq('practitioner_id', ctx.practitionerId).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Brand already exists; use PATCH to update' }, { status: 409 });
  }

  const { data, error } = await sb
    .from('practitioner_brand_configurations')
    .insert(insertRow)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Advance enrollment to brand_setup if it was at eligibility_verified.
  await sb
    .from('white_label_enrollments')
    .update({ status: 'brand_setup', updated_at: new Date().toISOString() })
    .eq('id', ctx.enrollmentId)
    .eq('status', 'eligibility_verified');

  return NextResponse.json({ brand: data }, { status: 201 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await loadPractitionerAndEnrollment(supabase);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};

  const sb = supabase as any;
  const { data: existing } = await sb
    .from('practitioner_brand_configurations')
    .select('*')
    .eq('practitioner_id', ctx.practitionerId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'Brand does not exist; use POST to create' }, { status: 404 });
  }

  const merged = { ...existing, ...body };
  const validation = validateBrandConfiguration(merged as BrandConfigInput);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Brand validation failed', errors: validation.errors }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let approvalAffected = false;
  for (const k of FIELD_KEYS) {
    if (body[k] !== undefined && body[k] !== existing[k]) {
      update[k] = body[k];
      if (VALIDATABLE_FIELDS.has(k)) approvalAffected = true;
    }
  }
  if (approvalAffected && existing.brand_config_approved) {
    update.brand_config_approved = false;
    update.brand_config_approved_at = null;
    update.brand_config_approved_by = null;
  }

  const { data, error } = await sb
    .from('practitioner_brand_configurations')
    .update(update)
    .eq('id', existing.id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ brand: data, approval_revoked: approvalAffected && existing.brand_config_approved });
}
