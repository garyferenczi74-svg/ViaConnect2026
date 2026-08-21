/**
 * Prompt 226 Module B: submit / read license verification request (AB/NY).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVerifiedPractitionerForModuleB } from '@/lib/peptides/practitionerGate';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const verified = await getVerifiedPractitionerForModuleB(user.id);
  const admin = createAdminClient();
  const { data: practitioner } = await admin
    .from('practitioners')
    .select('id, license_verified, license_jurisdiction, license_number, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: pending } = practitioner
    ? await admin
        .from('practitioner_license_verification_requests')
        .select('id, jurisdiction, issuing_body, license_number, status, created_at, admin_note')
        .eq('practitioner_id', practitioner.id)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] };

  return NextResponse.json({
    ok: true,
    moduleBVerified: Boolean(verified),
    verified,
    hasPractitionerRow: Boolean(practitioner),
    requests: pending ?? [],
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const jurisdiction = body.jurisdiction === 'NY' ? 'NY' : body.jurisdiction === 'AB' ? 'AB' : null;
  const issuingBody = typeof body.issuingBody === 'string' ? body.issuingBody.trim() : '';
  const licenseNumber = typeof body.licenseNumber === 'string' ? body.licenseNumber.trim() : '';
  if (!jurisdiction || issuingBody.length < 2 || licenseNumber.length < 2) {
    return NextResponse.json(
      { ok: false, error: 'jurisdiction (AB|NY), issuingBody, and licenseNumber required' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  let { data: practitioner } = await admin
    .from('practitioners')
    .select('id, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!practitioner) {
    // Minimal practitioner row so verification can proceed
    const displayName =
      typeof body.displayName === 'string' && body.displayName.trim().length > 1
        ? body.displayName.trim()
        : user.email?.split('@')[0] || 'Practitioner';
    const { data: created, error: createErr } = await admin
      .from('practitioners')
      .insert({
        user_id: user.id,
        display_name: displayName,
        practice_name: displayName,
        credential_type: 'other',
        account_status: 'active',
      })
      .select('id, display_name')
      .maybeSingle();
    if (createErr || !created) {
      return NextResponse.json({
        ok: false,
        error: createErr?.message?.slice(0, 200) ?? 'practitioner_create_failed',
      });
    }
    practitioner = created;
  }

  const { data: existingPending } = await admin
    .from('practitioner_license_verification_requests')
    .select('id')
    .eq('practitioner_id', practitioner.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingPending) {
    return NextResponse.json({
      ok: false,
      error: 'pending_request_exists',
      requestId: existingPending.id,
    });
  }

  const { data: reqRow, error } = await admin
    .from('practitioner_license_verification_requests')
    .insert({
      practitioner_id: practitioner.id,
      user_id: user.id,
      jurisdiction,
      issuing_body: issuingBody,
      license_number: licenseNumber,
      display_name_snapshot: String(practitioner.display_name ?? ''),
      status: 'pending',
    })
    .select('id, status, created_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message.slice(0, 200) });
  }

  // Mirror jurisdiction onto practitioners row (not verified until admin approves)
  await admin
    .from('practitioners')
    .update({
      license_jurisdiction: jurisdiction,
      license_issuing_body: issuingBody,
      license_number: licenseNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', practitioner.id);

  return NextResponse.json({ ok: true, request: reqRow });
}
