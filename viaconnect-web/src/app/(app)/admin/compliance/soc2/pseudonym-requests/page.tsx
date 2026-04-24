import Link from 'next/link';
import { ChevronLeft, KeyRound, ShieldCheck, Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { classifyFromRows, type LogRow } from '@/lib/soc2/auditor/pseudonymApprovals';
import { knownContexts } from '@/lib/soc2/auditor/resolvePseudonym';
import PseudonymRequestActions from '@/components/compliance/soc2/PseudonymRequestActions';

export const dynamic = 'force-dynamic';

export default async function PseudonymRequestsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <GuardMessage message="Sign in required." />;
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const viewerRole = (profile as { role?: string } | null)?.role ?? '';

  const { data } = await supabase
    .from('soc2_auditor_access_log')
    .select('id, grant_id, packet_id, action, target_path, resolved_pseudonym, justification, approver_steve, approver_thomas, occurred_at')
    .in('action', ['pseudonym_resolve_request', 'pseudonym_resolve_granted', 'pseudonym_resolve_denied'])
    .order('occurred_at', { ascending: false })
    .limit(1000);
  const rows: LogRow[] = (data as LogRow[] | null) ?? [];

  const requests = rows.filter((r) => r.action === 'pseudonym_resolve_request');
  const byKey = new Map<string, LogRow[]>();
  for (const r of rows) {
    const key = `${r.packet_id ?? ''}|${r.resolved_pseudonym ?? ''}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }
  const snapshots = requests.map((r) => classifyFromRows(r, byKey.get(`${r.packet_id ?? ''}|${r.resolved_pseudonym ?? ''}`) ?? []));

  const pending = snapshots.filter((s) => s.state !== 'resolved' && s.state !== 'denied');
  const done = snapshots.filter((s) => s.state === 'resolved' || s.state === 'denied');

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          SOC 2 overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Pseudonym resolve requests</h1>
            <p className="text-xs text-white/40">Dual approval required: Steve signs the compliance slot, Thomas signs the legal slot.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-8">
        <Section title={`Pending (${pending.length})`} snapshots={pending} viewerRole={viewerRole} />
        <Section title={`Terminal (${done.length})`} snapshots={done} viewerRole={viewerRole} />
      </div>
    </div>
  );
}

function Section({ title, snapshots, viewerRole }: {
  title: string;
  snapshots: ReturnType<typeof classifyFromRows>[];
  viewerRole: string;
}) {
  const contexts = knownContexts();
  return (
    <section>
      <h2 className="text-sm font-semibold text-white mb-2">{title}</h2>
      {snapshots.length === 0 ? (
        <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-white/40 italic">No requests in this bucket.</div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((s) => (
            <article key={s.requestRow.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3 space-y-2">
              <div className="flex items-start gap-2 flex-wrap">
                <StateBadge state={s.state} />
                <span className="font-mono text-[11px] text-white/70 truncate">{s.requestRow.resolved_pseudonym}</span>
                <span className="ml-auto text-[10px] text-white/40">{s.requestRow.occurred_at.slice(0, 16).replace('T', ' ')}</span>
              </div>
              <div className="text-xs text-white/70">
                Packet: <span className="font-mono text-white/80">{s.requestRow.packet_id?.slice(0, 16) ?? ''}…</span>
              </div>
              {s.requestRow.justification ? (
                <p className="text-xs text-white/80 whitespace-pre-wrap">{s.requestRow.justification}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
                <span className="inline-flex items-center gap-1">
                  Steve: {s.steveApprovalRow ? <ShieldCheck className="w-3 h-3 text-emerald-300" strokeWidth={1.5} aria-hidden /> : <span className="text-amber-300">pending</span>}
                </span>
                <span className="inline-flex items-center gap-1">
                  Thomas: {s.thomasApprovalRow ? <ShieldCheck className="w-3 h-3 text-emerald-300" strokeWidth={1.5} aria-hidden /> : <span className="text-amber-300">pending</span>}
                </span>
                {s.resolutionRow?.target_path ? (
                  <span className="ml-auto font-mono text-[10px] text-emerald-200 truncate">Resolved: {s.resolutionRow.target_path}</span>
                ) : null}
                {s.denialRow ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-red-300">
                    <Archive className="w-3 h-3" strokeWidth={1.5} aria-hidden />
                    denied
                  </span>
                ) : null}
              </div>
              {s.state !== 'resolved' && s.state !== 'denied' ? (
                <PseudonymRequestActions
                  logId={s.requestRow.id}
                  viewerRole={viewerRole}
                  state={s.state}
                  knownContexts={contexts}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StateBadge({ state }: { state: ReturnType<typeof classifyFromRows>['state'] }) {
  const map: Record<string, string> = {
    pending:         'bg-amber-500/15 border-amber-400/30 text-amber-200',
    steve_approved:  'bg-blue-500/15 border-blue-400/30 text-blue-200',
    thomas_approved: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    both_approved:   'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    resolved:        'bg-emerald-500/20 border-emerald-400/40 text-emerald-200',
    denied:          'bg-red-500/15 border-red-400/30 text-red-200',
  };
  const cls = map[state] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${cls}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

function GuardMessage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#1A2744] flex items-center justify-center">
      <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-sm px-4 py-3">{message}</div>
    </div>
  );
}
