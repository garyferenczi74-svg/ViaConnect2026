import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVerifiedPractitionerForModuleB } from '@/lib/peptides/practitionerGate';
import { formatProtocolAttribution } from '@/lib/peptides/protocolAttribution';

export const dynamic = 'force-dynamic';

export default async function ProtocolSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const verified = await getVerifiedPractitionerForModuleB(user.id);
  if (!verified) redirect('/practitioner/peptide-protocols');

  const admin = createAdminClient();
  const { data: protocol } = await admin
    .from('practitioner_peptide_protocols')
    .select('*')
    .eq('id', id)
    .eq('practitioner_id', verified.practitionerId)
    .maybeSingle();

  if (!protocol || protocol.status !== 'issued') notFound();

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

  return (
    <div className="min-h-screen bg-white text-[#1A2744] p-6 md:p-10 print:p-4">
      <article className="mx-auto max-w-2xl space-y-4" data-testid="protocol-sheet">
        <h1 className="text-xl font-semibold">Patient instruction sheet</h1>
        <p className="text-sm">Patient reference: {protocol.patient_ref}</p>
        <p className="text-sm">
          Compound: {peptide?.display_name ?? peptide?.slug ?? 'peptide'}
        </p>
        <p className="text-sm">
          Dose (entered by prescriber): {protocol.dose_amount} {protocol.dose_unit}
        </p>
        <p className="text-sm">Frequency: {protocol.frequency_text || '-'}</p>
        <p className="text-sm">Timing: {protocol.timing_text || '-'}</p>
        <p className="text-sm">Duration: {protocol.duration_text || '-'}</p>
        <p className="text-sm">Route: {protocol.route_text}</p>
        <p className="text-sm">
          Converted draw: {Number(protocol.computed_units).toFixed(2)} units on{' '}
          {protocol.syringe_standard} ({Number(protocol.computed_volume_ml).toFixed(4)} mL)
        </p>
        <p className="text-xs border-t border-[#1A2744]/20 pt-3 mt-4">{attribution}</p>
        <p className="text-xs text-[#1A2744]/70">
          ViaConnect converted units from values the practitioner entered. Not a
          platform-authored dose.
        </p>
      </article>
    </div>
  );
}
