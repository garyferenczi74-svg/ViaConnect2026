// Prompt #125 P4: Practitioner posts dashboard (recent scheduler scans).

import Link from 'next/link';
import { ChevronLeft, FileText, Clock, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { SchedulerDecision, SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

const DECISION_LABELS: Record<SchedulerDecision, { label: string; tone: string }> = {
  clean:              { label: 'Clean',          tone: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10' },
  findings_surfaced:  { label: 'Findings',       tone: 'text-amber-300 border-amber-400/30 bg-amber-500/10' },
  blocked:            { label: 'Blocked',        tone: 'text-red-300 border-red-500/40 bg-red-500/10' },
  fail_closed:        { label: 'Fail-closed',    tone: 'text-red-300 border-red-500/40 bg-red-500/10' },
  override_accepted:  { label: 'Overridden',     tone: 'text-white/70 border-white/20 bg-white/[0.05]' },
};

const PLATFORM_LABELS: Record<SchedulerPlatform, string> = {
  buffer: 'Buffer',
  hootsuite: 'Hootsuite',
  later: 'Later',
  sprout_social: 'Sprout Social',
  planoly: 'Planoly',
};

interface ScanRow {
  id: string;
  scan_id: string;
  external_post_id: string;
  target_platforms: string[];
  scheduled_at: string;
  decision: SchedulerDecision;
  findings_summary: { total?: number } | null;
  scanned_at: string;
  connection: { platform: SchedulerPlatform } | null;
}

export default async function PostsDashboardPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from('scheduler_scans')
    .select(
      'id, scan_id, external_post_id, target_platforms, scheduled_at, decision, findings_summary, scanned_at, connection:scheduler_connections(platform)',
    )
    .eq('practitioner_id', user.id)
    .order('scanned_at', { ascending: false })
    .limit(100);
  const rows: ScanRow[] = (data as ScanRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap">
        <Link
          href="/practitioner/marshall/scheduler"
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
        >
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scheduler bridge
        </Link>
        <span className="text-white/20">/</span>
        <h1 className="text-sm md:text-base font-semibold text-white">Recent scans</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length} scan{rows.length === 1 ? '' : 's'}</span>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/60">
          No scheduler scans yet. Connect a scheduler to start pre-publication checks.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02]">
          <table className="min-w-full text-xs text-white/80">
            <thead className="border-b border-white/10 bg-white/[0.03]">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Platform</th>
                <th className="px-3 py-2 font-semibold">Scheduled for</th>
                <th className="px-3 py-2 font-semibold">Findings</th>
                <th className="px-3 py-2 font-semibold">Scan id</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-2">
                    <DecisionBadge decision={r.decision} />
                  </td>
                  <td className="px-3 py-2 text-white/70">
                    {r.connection?.platform ? PLATFORM_LABELS[r.connection.platform] : 'unknown'}
                  </td>
                  <td className="px-3 py-2 text-white/60">
                    <Countdown iso={r.scheduled_at} />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-white/70">
                    {r.findings_summary?.total ?? 0}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-white/40">{r.scan_id}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/practitioner/marshall/scheduler/posts/${r.id}`}
                      className="text-[11px] text-sky-300 hover:text-sky-200"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DecisionBadge({ decision }: { decision: SchedulerDecision }) {
  const meta = DECISION_LABELS[decision];
  const Icon = decision === 'clean' ? ShieldCheck
    : decision === 'blocked' || decision === 'fail_closed' ? ShieldX
    : ShieldAlert;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${meta.tone}`}>
      <Icon className="w-3 h-3" strokeWidth={1.5} />
      {meta.label}
    </span>
  );
}

function Countdown({ iso }: { iso: string }) {
  const when = new Date(iso);
  const now = new Date();
  const diffMs = when.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const inPast = diffMs < 0;
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="w-3 h-3" strokeWidth={1.5} />
      {when.toLocaleString()}
      {Math.abs(diffMs) < 7 * 24 * 3600_000 ? (
        <span className="text-white/40 ml-1">
          ({inPast ? 'past' : `in ${h}h ${m}m`})
        </span>
      ) : null}
    </span>
  );
}
