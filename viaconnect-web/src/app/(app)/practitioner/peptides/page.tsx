/**
 * Prompt 214d Gap 5: practitioner-only peptide depth UI.
 * Full protocol frameworks, evidence grading, provenance, last-verified.
 * Consumer sessions must never receive this depth (route + RLS).
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FlaskConical, ShieldCheck, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface DepthEntry {
  entry_key: string;
  title: string;
  summary: string;
  mechanism: string | null;
  evidence_grade: string;
  regulatory_status: string | null;
  safety_context: string | null;
  provenance: unknown;
  source_url: string | null;
  last_verified_at: string;
  is_practitioner_depth: boolean;
  is_active: boolean;
}

export default async function PractitionerPeptideDepthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Practitioner role gate (fail-closed to dashboard if not practitioner)
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

  // Prefer practitioner-depth entries; fall back to all active educational rows
  // (depth flag rows require service role; admin client not required for approved edu)
  let entries: DepthEntry[] = [];
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { data } = await admin
      .from('peptide_education_entries')
      .select(
        'entry_key, title, summary, mechanism, evidence_grade, regulatory_status, safety_context, provenance, source_url, last_verified_at, is_practitioner_depth, is_active',
      )
      .eq('is_active', true)
      .order('last_verified_at', { ascending: false })
      .limit(40);
    entries = (Array.isArray(data) ? data : []) as DepthEntry[];
  } catch {
    entries = [];
  }

  const depth = entries.filter((e) => e.is_practitioner_depth);
  const educational = entries.filter((e) => !e.is_practitioner_depth);

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
                Practitioner educational frameworks only. Not a consumer product catalog.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
            Marshall-gated content
          </div>
        </header>

        <section className="rounded-2xl border border-[#B75E18]/25 bg-[#1E3054]/60 p-4 text-xs text-white/60 leading-relaxed">
          Prescriptive protocol depth is confined to practitioner contexts. Discuss with
          patients as educational material. Tesofensine remains a regulatory-timing pause.
          No purchase paths.
        </section>

        {depth.length === 0 && educational.length === 0 && (
          <p className="text-sm text-white/50">
            No peptide education entries loaded yet. Apply 214c migration and run Thanos
            ingest.
          </p>
        )}

        {depth.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#2DA5A0]">Practitioner depth</h2>
            {depth.map((e) => (
              <DepthCard key={e.entry_key} entry={e} gateLabel="depth" />
            ))}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70">
            Educational catalog (shared with consumer layer)
          </h2>
          {educational.map((e) => (
            <DepthCard key={e.entry_key} entry={e} gateLabel="reviewed" />
          ))}
        </section>

        <p className="text-[11px] text-white/35">
          Consumer patients see educational summaries only at{' '}
          <Link href="/peptide-protocol" className="text-[#2DA5A0] underline">
            Peptide Education
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function DepthCard({
  entry,
  gateLabel,
}: {
  entry: DepthEntry;
  gateLabel: string;
}) {
  const verified = entry.last_verified_at
    ? new Date(entry.last_verified_at).toLocaleString()
    : 'UNKNOWN';

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4 md:p-5 space-y-3">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{entry.title}</h3>
          <p className="text-[11px] text-white/40 font-mono mt-0.5">{entry.entry_key}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full border border-[#2DA5A0]/30 px-2 py-1 text-[#2DA5A0]">
            grade: {entry.evidence_grade}
          </span>
          <span className="rounded-full border border-white/15 px-2 py-1 text-white/50">
            gate: {gateLabel}
          </span>
        </div>
      </div>
      <p className="text-xs text-white/65 leading-relaxed">{entry.summary}</p>
      {entry.mechanism && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 mb-1">Mechanism</p>
          <p className="text-xs text-white/55">{entry.mechanism}</p>
        </div>
      )}
      {entry.safety_context && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 mb-1">Safety context</p>
          <p className="text-xs text-white/55">{entry.safety_context}</p>
        </div>
      )}
      {entry.regulatory_status && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 mb-1">Regulatory</p>
          <p className="text-xs text-white/55">{entry.regulatory_status}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[11px] text-white/40 pt-1 border-t border-white/[0.06]">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
          Last verified: {verified}
        </span>
        {entry.source_url && (
          <a
            href={entry.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#2DA5A0] min-h-[36px]"
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
            Provenance source
          </a>
        )}
      </div>
    </article>
  );
}
