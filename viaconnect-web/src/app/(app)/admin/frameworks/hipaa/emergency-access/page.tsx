import Link from 'next/link';
import { ChevronLeft, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import HipaaQuickForm, { type QuickFieldSpec } from '@/components/hipaa-admin/HipaaQuickForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  invoked_at: string;
  invoked_by: string;
  justification: string;
  scope_of_access: string;
  reviewed_at: string | null;
  closed_at: string | null;
}

const FIELDS: QuickFieldSpec[] = [
  { name: 'invokedAt', label: 'Invoked at', type: 'datetime-local', required: true },
  { name: 'justification', label: 'Justification', type: 'textarea', required: true, minLength: 30,
    placeholder: 'Why emergency access was needed; business continuity, patient safety, etc.' },
  { name: 'scopeOfAccess', label: 'Scope of access', type: 'textarea', required: true, minLength: 10,
    placeholder: 'Systems, records, data accessed under the emergency procedure' },
];

export default async function EmergencyAccessPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('hipaa_emergency_access_invocations')
    .select('id, invoked_at, invoked_by, justification, scope_of_access, reviewed_at, closed_at')
    .order('invoked_at', { ascending: false })
    .limit(50);
  const rows: Row[] = (data as Row[] | null) ?? [];
  const openCount = rows.filter((r) => !r.closed_at).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/hipaa" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          HIPAA overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Emergency access</h1>
            <p className="text-xs text-white/40">45 CFR 164.312(a)(2)(ii). Required. Each invocation must be justified and reviewed.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Record an invocation</h2>
          <HipaaQuickForm apiPath="/api/hipaa/emergency-access" fields={FIELDS} submitLabel="Record invocation" />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-white">Recent invocations ({rows.length})</h2>
            {openCount > 0 ? (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border border-amber-400/30 bg-amber-500/15 text-amber-200">
                {openCount} open for review
              </span>
            ) : null}
          </div>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No emergency access on file.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <StateBadge closedAt={r.closed_at} reviewedAt={r.reviewed_at} />
                    <span className="text-[11px] text-white/50">{r.invoked_at.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <div className="mt-2 text-xs text-white/80"><span className="text-white/50">Justification:</span> {r.justification}</div>
                  <div className="mt-1 text-xs text-white/80"><span className="text-white/50">Scope:</span> {r.scope_of_access}</div>
                  <div className="mt-1 text-[10px] text-white/40 font-mono">Invoked by {r.invoked_by.slice(0, 8)}…</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StateBadge({ closedAt, reviewedAt }: { closedAt: string | null; reviewedAt: string | null }) {
  if (closedAt) {
    return <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border border-emerald-400/30 bg-emerald-500/15 text-emerald-200">closed</span>;
  }
  if (reviewedAt) {
    return <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border border-blue-400/30 bg-blue-500/15 text-blue-200">reviewed</span>;
  }
  return <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border border-amber-400/30 bg-amber-500/15 text-amber-200">open</span>;
}
