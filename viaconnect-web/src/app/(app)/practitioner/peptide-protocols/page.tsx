import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FlaskConical } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PeptideProtocolBuilderClient } from '@/components/practitioner/peptide-protocols/PeptideProtocolBuilderClient';

export const dynamic = 'force-dynamic';

export default async function PractitionerPeptideProtocolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/practitioner/peptide-protocols');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, user_type, is_practitioner')
    .eq('id', user.id)
    .maybeSingle();

  const row = profile as {
    role?: string;
    user_type?: string;
    is_practitioner?: boolean;
  } | null;
  const isPractitioner =
    row?.is_practitioner === true ||
    row?.role === 'practitioner' ||
    row?.user_type === 'practitioner' ||
    row?.role === 'admin';

  if (!isPractitioner) {
    redirect('/peptide-protocol');
  }

  return (
    <div className="min-h-screen bg-[#1A2744] text-white p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1E3054] border border-white/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">Peptide protocols</h1>
              <p className="text-xs text-white/45">
                Module B · De-identified · Verified licence required
              </p>
            </div>
          </div>
          <Link href="/practitioner/peptides" className="text-xs text-white/50 underline">
            Monographs
          </Link>
        </header>
        <PeptideProtocolBuilderClient />
      </div>
    </div>
  );
}
