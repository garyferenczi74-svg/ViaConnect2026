/**
 * Prompt 226 Module B: list / create de-identified peptide protocols.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getVerifiedPractitionerForModuleB,
  loadModuleBCompounds,
} from '@/lib/peptides/practitionerGate';
import {
  computeSyringeUnits,
  type BarrelSize,
  type MassUnit,
  type SyringeStandard,
} from '@/lib/peptides/converterMath';
import { PROTOCOL_ATTRIBUTION_VERSION } from '@/lib/peptides/protocolAttribution';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const verified = await getVerifiedPractitionerForModuleB(user.id);
  if (!verified) {
    return NextResponse.json({
      ok: false,
      error: 'module_b_verification_required',
      protocols: [],
    });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('practitioner_peptide_protocols')
    .select(
      'id, patient_ref, peptide_id, dose_amount, dose_unit, frequency_text, status, computed_units, syringe_standard, created_at, issued_at',
    )
    .eq('practitioner_id', verified.practitionerId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, protocols: [] });
  }

  const compounds = await loadModuleBCompounds();
  return NextResponse.json({
    ok: true,
    verified,
    protocols: data ?? [],
    compounds,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const verified = await getVerifiedPractitionerForModuleB(user.id);
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: 'module_b_verification_required' },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patientRef = typeof body.patientRef === 'string' ? body.patientRef.trim() : '';
  if (patientRef.length < 1 || patientRef.length > 64) {
    return NextResponse.json({ ok: false, error: 'patient_ref_required' }, { status: 400 });
  }
  // Reject obvious PHI patterns in opaque ref (best-effort)
  if (/\s{2,}|,|\b(mr|mrs|ms|dr)\b/i.test(patientRef) && /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(patientRef)) {
    return NextResponse.json({
      ok: false,
      error: 'patient_ref_looks_like_name',
      message:
        'Use an opaque code you hold outside ViaConnect. Do not enter a patient legal name.',
    });
  }

  const peptideId = typeof body.peptideId === 'string' ? body.peptideId : '';
  const compounds = await loadModuleBCompounds();
  const compound = compounds.find((c) => c.id === peptideId);
  if (!compound) {
    return NextResponse.json({ ok: false, error: 'peptide_not_allowed' }, { status: 400 });
  }

  const doseAmount = Number(body.doseAmount);
  const vialAmount = Number(body.vialAmount);
  const diluentMl = Number(body.diluentMl);
  const doseUnit = body.doseUnit as MassUnit;
  const vialUnit = body.vialUnit as MassUnit;
  const syringeStandard = body.syringeStandard as SyringeStandard;
  const barrelSize = Number(body.barrelSize) as BarrelSize;

  const admin = createAdminClient();
  const { data: pep } = await admin
    .from('kb_peptides')
    .select('iu_mg_factor, iu_mg_factor_verified')
    .eq('id', peptideId)
    .maybeSingle();

  const computed = computeSyringeUnits({
    vialAmount,
    vialUnit,
    diluentMl,
    doseAmount,
    doseUnit,
    syringeStandard,
    barrelSize,
    iuMgFactor: pep?.iu_mg_factor == null ? null : Number(pep.iu_mg_factor),
    iuMgFactorVerified: pep?.iu_mg_factor_verified === true,
  });

  if (!computed.ok) {
    return NextResponse.json({ ok: false, compute: computed });
  }

  const recipientUserId =
    typeof body.recipientUserId === 'string' && body.recipientUserId.length > 10
      ? body.recipientUserId
      : null;

  const { data, error } = await admin
    .from('practitioner_peptide_protocols')
    .insert({
      practitioner_id: verified.practitionerId,
      author_user_id: user.id,
      patient_ref: patientRef,
      recipient_user_id: recipientUserId,
      peptide_id: peptideId,
      dose_amount: doseAmount,
      dose_unit: doseUnit,
      vial_amount: vialAmount,
      vial_unit: vialUnit,
      diluent_ml: diluentMl,
      frequency_text: String(body.frequencyText ?? '').slice(0, 200),
      timing_text: String(body.timingText ?? '').slice(0, 200),
      duration_text: String(body.durationText ?? '').slice(0, 200),
      route_text: String(body.routeText ?? 'subcutaneous').slice(0, 80),
      syringe_standard: syringeStandard,
      barrel_size: barrelSize,
      computed_concentration: computed.concentrationPerMl,
      computed_volume_ml: computed.volumeMl,
      computed_units: computed.syringeUnits,
      status: 'draft',
      attribution_version: PROTOCOL_ATTRIBUTION_VERSION,
    })
    .select('id, status, computed_units, patient_ref, created_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message.slice(0, 200) });
  }

  return NextResponse.json({
    ok: true,
    protocol: data,
    compute: computed,
    compound,
  });
}
