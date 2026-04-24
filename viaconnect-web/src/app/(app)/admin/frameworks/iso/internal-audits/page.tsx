import Link from 'next/link';
import { ChevronLeft, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import HipaaQuickForm, { type QuickFieldSpec } from '@/components/hipaa-admin/HipaaQuickForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  audit_ref: string;
  audit_date: string;
  scope: string;
  auditor: string;
  auditor_is_independent: boolean;
  major_findings_count: number;
  minor_findings_count: number;
  observations_count: number;
  summary: string;
  storage_key: string | null;
}

const FIELDS: QuickFieldSpec[] = [
  { name: 'auditRef', label: 'Audit identifier', type: 'text', required: true, placeholder: 'IA-2026-01' },
  { name: 'auditDate', label: 'Audit date', type: 'date', required: true },
  { name: 'auditor', label: 'Auditor', type: 'text', required: true, placeholder: 'Full name or firm' },
  { name: 'scope', label: 'Scope', type: 'textarea', required: true, minLength: 10,
    placeholder: 'Clauses and Annex A themes in scope for this audit' },
  { name: 'summary', label: 'Summary', type: 'textarea', required: true, minLength: 20,
    placeholder: 'Findings summary, conclusions, and follow-up' },
  { name: 'majorFindingsCount', label: 'Major findings', type: 'number', required: true },
  { name: 'minorFindingsCount', label: 'Minor findings', type: 'number', required: true },
  { name: 'observationsCount', label: 'Observations', type: 'number', required: true },
];

export default async function InternalAuditsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('iso_internal_audits')
    .select('id, audit_ref, audit_date, scope, auditor, auditor_is_independent, major_findings_count, minor_findings_count, observations_count, summary, storage_key')
    .order('audit_date', { ascending: false })
    .limit(50);
  const rows: Row[] = (data as Row[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/iso" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          ISO overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Internal audits</h1>
            <p className="text-xs text-white/40">Clause 9.2. Audits at planned intervals; independent auditor expected.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Record an audit</h2>
          <HipaaQuickForm apiPath="/api/iso/internal-audits" fields={FIELDS} submitLabel="Record audit" />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Recent audits ({rows.length})</h2>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No audits on file.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-mono text-xs text-white">{r.audit_ref}</span>
                    <span className="text-[10px] text-white/50">{r.audit_date}</span>
                    {r.auditor_is_independent ? (
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-emerald-400/30 bg-emerald-500/15 text-emerald-200">independent</span>
                    ) : null}
                    {r.storage_key ? <span className="text-[10px] text-white/40">report attached</span> : null}
                  </div>
                  <p className="mt-2 text-xs text-white/80"><span className="text-white/50">Scope:</span> {r.scope}</p>
                  <div className="mt-1 text-[11px] text-white/70 flex flex-wrap gap-3">
                    <span><span className="text-red-300 tabular-nums">{r.major_findings_count}</span> major</span>
                    <span><span className="text-amber-300 tabular-nums">{r.minor_findings_count}</span> minor</span>
                    <span><span className="text-blue-300 tabular-nums">{r.observations_count}</span> observations</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
