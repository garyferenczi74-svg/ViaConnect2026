/**
 * Prompt 225: practitioner Collection 14 depth UI.
 * Server role gate. No dose, reconstitution, or sourcing instruction fields.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FlaskConical, ShieldCheck, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadPractitionerPeptideCatalog } from '@/lib/kb/peptides/loadPractitionerPeptides';

export const dynamic = 'force-dynamic';

export default async function PractitionerPeptideDepthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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

  const catalog = await loadPractitionerPeptideCatalog(250);
  const educational = catalog.entries.filter((e) => e.exclusionTier === 'educational');
  const restricted = catalog.entries.filter((e) => e.exclusionTier === 'restricted');
  const excluded = catalog.entries.filter((e) => e.isExcludedDecline);

  return (
    <div className="min-h-screen bg-[#1A2744] text-white p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1E3054] border border-white/[0.08] flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-semibold truncate">
                Peptide Protocol Depth
              </h1>
              <p className="text-xs text-white/45">
                Collection 14 practitioner educational frameworks. Not a product catalog. No dosing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
            Marshall-gated · Lex lane
          </div>
        </header>

        {!catalog.ok ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Catalog unavailable. Fail-closed. Retry shortly.
          </div>
        ) : null}

        <p className="text-xs text-white/55 leading-relaxed rounded-xl border border-white/10 bg-[#1E3054]/40 p-3">
          Practitioner depth means clinical context, monitoring considerations, contraindication
          classes, interaction classes, evidence appraisal, and regulatory posture. It does not
          include dose, route instruction, reconstitution, injection technique, cycle length, or
          sourcing information.
        </p>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">
            Educational monographs ({educational.length})
          </h2>
          <div className="space-y-2">
            {educational.slice(0, 80).map((e) => (
              <article
                key={e.slug}
                data-testid={`practitioner-peptide-${e.slug}`}
                className="rounded-xl border border-white/10 bg-[#1E3054]/50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <h3 className="text-sm font-medium text-white">{e.displayName}</h3>
                  <span className="text-[10px] text-[#2DA5A0]">Grade {e.evidenceGrade}</span>
                </div>
                <p className="text-[11px] text-white/45 mt-0.5">
                  {e.category} · {e.molecularClass.replace(/_/g, ' ')}
                  {!e.isPeptide ? ' · not a peptide' : ''}
                </p>
                <p className="text-xs text-white/65 mt-2 leading-relaxed">{e.mechanismSummary}</p>
                {e.evidenceSummary ? (
                  <p className="text-[11px] text-white/45 mt-2 leading-relaxed">{e.evidenceSummary}</p>
                ) : null}
                <p className="text-[10px] text-white/35 mt-2">
                  Marshall: {e.marshallStatus} · Lex: {e.lexStatus} · WADA field: {e.wadaStatus}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">
            Restricted (practitioner only) ({restricted.length})
          </h2>
          <div className="space-y-2">
            {restricted.map((e) => (
              <article
                key={e.slug}
                className="rounded-xl border border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.08)] p-4"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <h3 className="text-sm font-medium text-white">{e.displayName}</h3>
                    <p className="text-xs text-white/65 mt-1 leading-relaxed">{e.mechanismSummary}</p>
                    {e.exclusionReason ? (
                      <p className="text-[11px] text-[#FBBF24] mt-2">{e.exclusionReason}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">
            Excluded adverse references ({excluded.length})
          </h2>
          <div className="space-y-2">
            {excluded.map((e) => (
              <article
                key={e.slug}
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
              >
                <h3 className="text-sm font-medium text-white">{e.displayName}</h3>
                <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
                  {e.exclusionReason ||
                    'Excluded adverse reference. No monograph body. Redirect patients to licensed clinical care.'}
                </p>
              </article>
            ))}
          </div>
        </section>

        <Link
          href="/peptide-protocol"
          className="inline-flex text-xs text-[#2DA5A0] hover:underline"
        >
          Back to consumer Peptide Education
        </Link>
      </div>
    </div>
  );
}
