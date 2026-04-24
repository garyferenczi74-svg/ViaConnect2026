import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import HipaaQuickForm, { type QuickFieldSpec } from '@/components/hipaa-admin/HipaaQuickForm';

export const dynamic = 'force-dynamic';

interface SanctionRow {
  id: string;
  workforce_member_pseudonym: string;
  action_kind: string;
  triggering_incident_id: string | null;
  action_date: string;
  recorded_at: string;
}

interface IncidentRow { id: string; incident_id: string; title: string }

export default async function SanctionsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [sanctionRes, incidentRes] = await Promise.all([
    supabase
      .from('hipaa_sanction_actions')
      .select('id, workforce_member_pseudonym, action_kind, triggering_incident_id, action_date, recorded_at')
      .order('action_date', { ascending: false })
      .limit(100),
    supabase
      .from('compliance_incidents')
      .select('id, incident_id, title')
      .order('opened_at', { ascending: false })
      .limit(100),
  ]);
  const rows: SanctionRow[] = (sanctionRes.data as SanctionRow[] | null) ?? [];
  const incidents: IncidentRow[] = (incidentRes.data as IncidentRow[] | null) ?? [];

  const fields: QuickFieldSpec[] = [
    { name: 'workforceMemberRealId', label: 'Workforce member identifier', type: 'text', required: true,
      placeholder: 'Employee number, email, or internal ID (server pseudonymizes)' },
    { name: 'actionKind', label: 'Action kind', type: 'select', required: true, options: [
      { value: 'verbal_warning', label: 'Verbal warning' },
      { value: 'written_warning', label: 'Written warning' },
      { value: 'retraining', label: 'Retraining' },
      { value: 'suspension', label: 'Suspension' },
      { value: 'termination', label: 'Termination' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'triggeringIncidentId', label: 'Triggering incident (optional)', type: 'select', options: [
      ...incidents.map((i) => ({ value: i.id, label: `${i.incident_id}: ${i.title}`.slice(0, 80) })),
    ]},
    { name: 'actionDate', label: 'Action date', type: 'date', required: true },
  ];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/hipaa" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          HIPAA overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Sanction actions</h1>
            <p className="text-xs text-white/40">45 CFR 164.308(a)(1)(ii)(C). Required. Workforce identifiers are pseudonymized on record.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Record a sanction</h2>
          <HipaaQuickForm apiPath="/api/hipaa/sanctions" fields={fields} submitLabel="Record sanction" />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Recorded sanctions ({rows.length})</h2>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No sanction actions on file.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <KindBadge kind={r.action_kind} />
                    <span className="text-[11px] text-white/50">{r.action_date}</span>
                    {r.triggering_incident_id ? (
                      <span className="text-[11px] text-white/40 font-mono">incident {r.triggering_incident_id.slice(0, 8)}…</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[10px] text-white/40 font-mono break-all">Pseudonym: {r.workforce_member_pseudonym}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    verbal_warning: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
    written_warning: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
    retraining: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    suspension: 'bg-orange-500/15 border-orange-400/30 text-orange-200',
    termination: 'bg-red-500/20 border-red-400/40 text-red-200',
    other: 'bg-white/[0.05] border-white/[0.12] text-white/70',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${map[kind] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {kind.replace(/_/g, ' ')}
    </span>
  );
}
