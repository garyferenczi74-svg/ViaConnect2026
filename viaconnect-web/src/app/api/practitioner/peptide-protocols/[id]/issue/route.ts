/**
 * Prompt 226 Module B: practitioner sign-off / issue protocol.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVerifiedPractitionerForModuleB } from '@/lib/peptides/practitionerGate';
import {
  formatProtocolAttribution,
  PROTOCOL_ATTRIBUTION_VERSION,
} from '@/lib/peptides/protocolAttribution';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
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

  const admin = createAdminClient();
  const { data: protocol, error } = await admin
    .from('practitioner_peptide_protocols')
    .select('*')
    .eq('id', id)
    .eq('practitioner_id', verified.practitionerId)
    .maybeSingle();

  if (error || !protocol) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  if (protocol.status === 'issued') {
    return NextResponse.json({ ok: true, alreadyIssued: true, protocol });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await admin
    .from('practitioner_peptide_protocols')
    .update({
      status: 'issued',
      signed_off_at: now,
      issued_at: now,
      attribution_version: PROTOCOL_ATTRIBUTION_VERSION,
      updated_at: now,
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message.slice(0, 200) });
  }

  const { data: peptide } = await admin
    .from('kb_peptides')
    .select('display_name, slug')
    .eq('id', protocol.peptide_id)
    .maybeSingle();

  const attribution = formatProtocolAttribution({
    practitionerName: verified.displayName,
    licenseNumber: verified.licenseNumber,
    jurisdiction: verified.jurisdiction,
  });

  return NextResponse.json({
    ok: true,
    protocol: updated,
    peptide,
    attribution,
    sheet: {
      patientRef: protocol.patient_ref,
      compound: peptide?.display_name ?? peptide?.slug,
      doseEnteredByPrescriber: `${protocol.dose_amount} ${protocol.dose_unit}`,
      frequency: protocol.frequency_text,
      timing: protocol.timing_text,
      duration: protocol.duration_text,
      route: protocol.route_text,
      syringeUnits: protocol.computed_units,
      syringeStandard: protocol.syringe_standard,
      volumeMl: protocol.computed_volume_ml,
      attribution,
      note: 'ViaConnect converted units from values the practitioner entered. Not a platform-authored dose.',
    },
  });
}
