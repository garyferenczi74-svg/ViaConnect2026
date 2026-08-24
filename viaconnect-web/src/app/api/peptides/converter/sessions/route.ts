/**
 * Prompt 226: save / list converter history (user-owned RLS via admin write with user_id).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getActiveConverterDisclaimer,
  userHasAcknowledged,
} from '@/lib/peptides/converterGate';
import { loadConverterAllowlist } from '@/lib/peptides/converterAllowlist';
import {
  computeSyringeUnits,
  type BarrelSize,
  type MassUnit,
  type SyringeStandard,
} from '@/lib/peptides/converterMath';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('converter_sessions')
    .select(
      'id, peptide_id, vial_amount, vial_unit, diluent_ml, dose_amount, dose_unit, syringe_standard, barrel_size, computed_concentration, computed_volume_ml, computed_units, warnings, label, created_at, disclaimer_version_id',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, sessions: [] });
  }

  const disclaimer = await getActiveConverterDisclaimer();
  return NextResponse.json({
    ok: true,
    sessions: data ?? [],
    layer3: disclaimer?.layer3Text ?? null,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const disclaimer = await getActiveConverterDisclaimer();
  if (!disclaimer) {
    return NextResponse.json({ ok: false, error: 'disclaimer_not_cleared' }, { status: 403 });
  }
  const ack = await userHasAcknowledged(user.id, disclaimer.id);
  if (!ack.acked) {
    return NextResponse.json({ ok: false, error: 'acknowledgement_required' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const peptideId = typeof body.peptideId === 'string' ? body.peptideId : '';
  const allowlist = await loadConverterAllowlist();
  if (!allowlist.ok) {
    return NextResponse.json({ ok: false, unavailable: true });
  }
  const compound = allowlist.compounds.find((c) => c.id === peptideId);
  if (!compound) {
    return NextResponse.json({ ok: false, error: 'peptide_not_found' }, { status: 403 });
  }

  const computed = computeSyringeUnits({
    vialAmount: Number(body.vialAmount),
    vialUnit: body.vialUnit as MassUnit,
    diluentMl: Number(body.diluentMl),
    doseAmount: Number(body.doseAmount),
    doseUnit: body.doseUnit as MassUnit,
    syringeStandard: body.syringeStandard as SyringeStandard,
    barrelSize: Number(body.barrelSize) as BarrelSize,
    iuMgFactor: compound.iuMgFactor,
    iuMgFactorVerified: compound.iuMgFactorVerified,
  });

  if (!computed.ok) {
    return NextResponse.json({ ok: false, result: computed });
  }

  const label = typeof body.label === 'string' ? body.label.slice(0, 80) : '';
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('converter_sessions')
    .insert({
      user_id: user.id,
      peptide_id: peptideId,
      vial_amount: Number(body.vialAmount),
      vial_unit: body.vialUnit,
      diluent_ml: Number(body.diluentMl),
      dose_amount: Number(body.doseAmount),
      dose_unit: body.doseUnit,
      syringe_standard: body.syringeStandard,
      barrel_size: Number(body.barrelSize),
      computed_concentration: computed.concentrationPerMl,
      computed_volume_ml: computed.volumeMl,
      computed_units: computed.syringeUnits,
      warnings: computed.warnings.map((w) => w.code),
      label,
      disclaimer_version_id: disclaimer.id,
    })
    .select('id, created_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message.slice(0, 200) });
  }

  return NextResponse.json({
    ok: true,
    session: data,
    layer3: disclaimer.layer3Text,
  });
}
