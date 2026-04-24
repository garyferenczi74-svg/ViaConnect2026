import Link from 'next/link';
import { ChevronLeft, FileWarning } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import HipaaQuickForm, { type QuickFieldSpec } from '@/components/hipaa-admin/HipaaQuickForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  nc_ref: string;
  source: string;
  severity: string;
  status: string;
  description: string;
  target_date: string | null;
  actual_closure_date: string | null;
  recorded_at: string;
}

const FIELDS: QuickFieldSpec[] = [
  { name: 'ncRef', label: 'Nonconformity identifier', type: 'text', required: true, placeholder: 'NC-2026-001' },
  { name: 'source', label: 'Source', type: 'select', required: true, options: [
    { value: 'internal_audit', label: 'Internal audit' },
    { value: 'external_audit', label: 'External audit' },
    { value: 'incident', label: 'Security incident' },
    { value: 'management_review', label: 'Management review' },
    { value: 'risk_review', label: 'Risk review' },
    { value: 'other', label: 'Other' },
  ]},
  { name: 'sourceRef', label: 'Source reference (optional)', type: 'text',
    placeholder: 'Audit ref, incident id, etc.' },
  { name: 'severity', label: 'Severity', type: 'select', required: true, options: [
    { value: 'major', label: 'Major' },
    { value: 'minor', label: 'Minor' },
    { value: 'observation', label: 'Observation' },
  ]},
  { name: 'status', label: 'Status', type: 'select', required: true, options: [
    { value: 'open', label: 'Open' },
    { value: 'root_cause_analysis', label: 'Root cause analysis' },
    { value: 'action_planned', label: 'Action planned' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'closed', label: 'Closed' },
    { value: 'verified', label: 'Verified' },
  ]},
  { name: 'description', label: 'Description', type: 'textarea', required: true, minLength: 20,
    placeholder: 'Full nonconformity statement' },
  { name: 'rootCause', label: 'Root cause (optional)', type: 'textarea',
    placeholder: '5 whys or equivalent analysis result' },
  { name: 'correctiveAction', label: 'Corrective action (optional)', type: 'textarea',
    placeholder: 'Action to prevent recurrence' },
  { name: 'targetDate', label: 'Target closure date (optional)', type: 'date' },
];

export default async function NonconformitiesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('iso_nonconformities')
    .select('id, nc_ref, source, severity, status, description, target_date, actual_closure_date, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(100);
  const rows: Row[] = (data as Row[] | null) ?? [];
  const openish = new Set(['open', 'root_cause_analysis', 'action_planned', 'in_progress']);
  const open = rows.filter((r) => openish.has(r.status)).length;
  const major = rows.filter((r) => r.severity === 'major' && openish.has(r.status)).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/iso" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          ISO overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <FileWarning className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Nonconformities</h1>
            <p className="text-xs text-white/40">Clause 10.2. Track nonconformities to root cause, corrective action, and verification.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Log a nonconformity</h2>
          <HipaaQuickForm apiPath="/api/iso/nonconformities" fields={FIELDS} submitLabel="Log NC" />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-white">Nonconformities ({rows.length})</h2>
            <span className="text-[11px] text-white/60">
              <span className="text-red-300">{major} major open</span>, <span className="text-amber-300">{open} total open</span>
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No nonconformities on file.</div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-mono text-xs text-white">{r.nc_ref}</span>
                    <SeverityBadge severity={r.severity} />
                    <StatusBadge status={r.status} />
                    <span className="ml-auto text-[10px] text-white/40">{r.source.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/80 line-clamp-2">{r.description}</p>
                  <div className="mt-1 text-[10px] text-white/50">
                    {r.target_date ? `target ${r.target_date}` : 'no target'}
                    {r.actual_closure_date ? `, closed ${r.actual_closure_date}` : ''}
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

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    major: 'bg-red-500/20 border-red-400/40 text-red-200',
    minor: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
    observation: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${map[severity] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const closedish = status === 'closed' || status === 'verified';
  const tone = closedish
    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
    : 'bg-white/[0.05] border-white/[0.12] text-white/80';
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
