import { redirect } from 'next/navigation';
import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function MyPeptideProtocolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/peptide-protocol/my-protocols');

  const admin = createAdminClient();
  const { data } = await admin
    .from('practitioner_peptide_protocols')
    .select(
      'id, patient_ref, dose_amount, dose_unit, frequency_text, computed_units, syringe_standard, issued_at, peptide_id',
    )
    .eq('recipient_user_id', user.id)
    .eq('status', 'issued')
    .order('issued_at', { ascending: false })
    .limit(50);

  const peptideIds = [...new Set((data ?? []).map((r) => r.peptide_id).filter(Boolean))];
  const nameById = new Map<string, string>();
  if (peptideIds.length) {
    const { data: peps } = await admin
      .from('kb_peptides')
      .select('id, display_name')
      .in('id', peptideIds);
    for (const p of peps ?? []) {
      nameById.set(String(p.id), String(p.display_name));
    }
  }

  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <div className="space-y-3" data-testid="my-peptide-protocols">
        <h2 className="text-base font-semibold text-white">My protocols</h2>
        <p className="text-xs text-white/50 leading-relaxed">
          Protocols appear here only when a verified practitioner issues one to your account.
          De-identified references never show your legal name on this surface.
        </p>
        {!data?.length ? (
          <p className="text-sm text-white/45 rounded-xl border border-white/10 bg-[#1E3054]/50 p-4">
            No issued peptide protocols linked to your account yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-white/10 bg-[#1E3054]/70 p-3 text-xs text-white/70"
              >
                <div className="text-sm text-white">
                  {nameById.get(String(row.peptide_id)) ?? 'Peptide'}
                </div>
                <div>
                  Prescriber dose: {row.dose_amount} {row.dose_unit} ·{' '}
                  {Number(row.computed_units).toFixed(2)} u ({row.syringe_standard})
                </div>
                <div>{row.frequency_text || 'Frequency on sheet from your clinician'}</div>
                <div className="text-white/40 mt-1">
                  Issued {row.issued_at ? new Date(row.issued_at).toLocaleString() : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PeptideProtocolHeroShell>
  );
}
