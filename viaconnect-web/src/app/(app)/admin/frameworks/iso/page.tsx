import Link from 'next/link';
import {
  BookMarked,
  ListTree,
  Gauge,
  ClipboardCheck,
  Users2,
  FileWarning,
  FileText,
  ChevronLeft,
  Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TILES = [
  { href: '/admin/frameworks/iso/soa',                label: 'Statement of Applicability', icon: ListTree,      ref: 'Clause 6.1 / SoA' },
  { href: '/admin/frameworks/iso/risk-register',      label: 'Risk Register',              icon: Gauge,         ref: 'Clause 6.1, 8.2, 8.3' },
  { href: '/admin/frameworks/iso/internal-audits',    label: 'Internal Audits',            icon: ClipboardCheck, ref: 'Clause 9.2' },
  { href: '/admin/frameworks/iso/management-reviews', label: 'Management Reviews',         icon: Users2,        ref: 'Clause 9.3' },
  { href: '/admin/frameworks/iso/nonconformities',    label: 'Nonconformities',            icon: FileWarning,   ref: 'Clause 10.2' },
  { href: '/admin/frameworks/iso/isms-scope',         label: 'ISMS Scope',                 icon: BookMarked,    ref: 'Clause 4.3' },
];

export default async function IsoOverviewPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [
    soaAllRes, soaApplicableRes, soaExcludedRes,
    riskOpenRes, riskAllRes,
    auditsRes, mgmtRes, ncOpenRes, scopeApprovedRes,
  ] = await Promise.all([
    supabase.from('iso_statements_of_applicability').select('id', { count: 'exact', head: true }),
    supabase.from('iso_statements_of_applicability').select('id', { count: 'exact', head: true }).eq('applicability', 'applicable'),
    supabase.from('iso_statements_of_applicability').select('id', { count: 'exact', head: true }).eq('applicability', 'excluded'),
    supabase.from('iso_risk_register').select('id', { count: 'exact', head: true }).in('status', ['open', 'treated']),
    supabase.from('iso_risk_register').select('id', { count: 'exact', head: true }),
    supabase.from('iso_internal_audits').select('id', { count: 'exact', head: true }),
    supabase.from('iso_management_reviews').select('id', { count: 'exact', head: true }),
    supabase.from('iso_nonconformities').select('id', { count: 'exact', head: true }).not('status', 'in', '("closed","verified")'),
    supabase.from('iso_isms_scope_documents').select('id', { count: 'exact', head: true }).not('approved_at', 'is', null),
  ]);

  const counts = {
    soaTotal: soaAllRes.count ?? 0,
    soaApplicable: soaApplicableRes.count ?? 0,
    soaExcluded: soaExcludedRes.count ?? 0,
    risksOpen: riskOpenRes.count ?? 0,
    risksAll: riskAllRes.count ?? 0,
    audits: auditsRes.count ?? 0,
    mgmtReviews: mgmtRes.count ?? 0,
    ncOpen: ncOpenRes.count ?? 0,
    scopeApproved: scopeApprovedRes.count ?? 0,
  };

  // The Annex A + ISMS clause target is 113 control points (20 clauses + 93 Annex A).
  const coveragePct = counts.soaTotal > 0 ? Math.round((counts.soaTotal / 93) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Compliance overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">ISO/IEC 27001:2022</h1>
            <p className="text-xs text-white/40">ISMS clauses 4 to 10 plus Annex A: 93 controls. ISMS Manager signs certification-audit evidence.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="SoA entries" value={counts.soaTotal} tone="slate" />
          <Stat label="SoA applicable" value={counts.soaApplicable} tone="emerald" />
          <Stat label="SoA excluded" value={counts.soaExcluded} tone="slate" />
          <Stat label="Open risks" value={counts.risksOpen} tone={counts.risksOpen > 0 ? 'amber' : 'slate'} />
          <Stat label="Open nonconformities" value={counts.ncOpen} tone={counts.ncOpen > 0 ? 'amber' : 'slate'} />
          <Stat label="Approved scope" value={counts.scopeApproved} tone={counts.scopeApproved > 0 ? 'emerald' : 'red'} />
        </div>

        {counts.scopeApproved === 0 ? (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 flex items-start gap-3">
            <BookMarked className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="text-sm font-semibold text-amber-200">No approved ISMS scope on file</div>
              <p className="text-xs text-amber-200/80 mt-1">
                Clause 4.3 requires an approved ISMS scope statement. Certification auditors will flag this as a major nonconformity.
              </p>
              <Link href="/admin/frameworks/iso/isms-scope" className="inline-flex items-center gap-1 mt-2 text-xs text-amber-200 hover:text-white">
                Upload scope document
              </Link>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="text-sm font-semibold text-white">SoA coverage</div>
            <div className="text-[11px] text-white/40">{counts.soaTotal} of 93 Annex A controls determined; {coveragePct}%</div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full bg-[#B75E18]"
              style={{ width: `${Math.min(coveragePct, 100)}%` }}
              aria-hidden
            />
          </div>
        </div>

        <section>
          <div className="text-sm font-semibold text-white mb-3">ISO 27001 subsurfaces</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="flex items-start gap-3 rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-3"
              >
                <div className="w-9 h-9 rounded-md bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
                  <t.icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{t.label}</div>
                  <div className="text-[10px] text-white/50 font-mono">{t.ref}</div>
                </div>
                <FileText className="w-3.5 h-3.5 text-white/30 mt-1" strokeWidth={1.5} aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'amber' | 'emerald' | 'red' }) {
  const classes: Record<typeof tone, string> = {
    slate:   'border-white/[0.12] bg-white/[0.04] text-white/80',
    amber:   'border-amber-400/30 bg-amber-500/10 text-amber-200',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    red:     'border-red-400/30 bg-red-500/10 text-red-200',
  };
  return (
    <div className={`rounded-lg border ${classes[tone]} p-3`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
