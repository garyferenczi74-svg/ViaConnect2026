// Prompt #125 P5: Admin overview dashboard.
//
// At-a-glance status: per-platform connection counts, scan decision
// distribution over 7 days, override rate highlights, webhook backlog,
// poll worker health, mean decision latency, fail-closed rate.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, LineChart, Radar, ShieldX, Users, Unplug, Plug,
} from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS: Record<SchedulerPlatform, string> = {
  buffer: 'Buffer',
  hootsuite: 'Hootsuite',
  later: 'Later',
  sprout_social: 'Sprout Social',
  planoly: 'Planoly',
};

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) {
    redirect('/');
  }
  return { supabase, user };
}

export default async function SchedulerAdminOverviewPage() {
  const { supabase } = await requireAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { data: conns },
    { data: scansByDecision },
    { count: overrideCount },
    { count: eventsPending },
    { data: platformStates },
    { data: recentInterceptions },
  ] = await Promise.all([
    sb.from('scheduler_connections').select('platform, active').eq('active', true),
    sb.from('scheduler_scans').select('decision, scanned_at').gte('scanned_at', sevenDaysAgo).limit(5000),
    sb.from('scheduler_overrides').select('id', { count: 'exact', head: true }).gte('signed_at', sevenDaysAgo),
    sb.from('scheduler_events').select('id', { count: 'exact', head: true }).eq('processing_status', 'pending'),
    sb.from('scheduler_platform_states').select('platform, mode, updated_at'),
    sb.from('scheduler_interceptions').select('platform, succeeded').gte('attempted_at', sevenDaysAgo).limit(2000),
  ]);

  const connRows = (conns ?? []) as Array<{ platform: SchedulerPlatform }>;
  const connsByPlatform = new Map<string, number>();
  for (const row of connRows) {
    connsByPlatform.set(row.platform, (connsByPlatform.get(row.platform) ?? 0) + 1);
  }

  const scanRows = (scansByDecision ?? []) as Array<{ decision: string }>;
  const decisionTallies = { clean: 0, findings_surfaced: 0, blocked: 0, fail_closed: 0, override_accepted: 0 };
  for (const row of scanRows) {
    if (row.decision in decisionTallies) {
      decisionTallies[row.decision as keyof typeof decisionTallies] += 1;
    }
  }

  const interceptRows = (recentInterceptions ?? []) as Array<{ platform: string; succeeded: boolean | null }>;
  const interceptByPlatform = new Map<string, { attempts: number; succeeded: number }>();
  for (const row of interceptRows) {
    const cur = interceptByPlatform.get(row.platform) ?? { attempts: 0, succeeded: 0 };
    cur.attempts += 1;
    if (row.succeeded) cur.succeeded += 1;
    interceptByPlatform.set(row.platform, cur);
  }

  const totalScans = scanRows.length;
  const failClosedPct = totalScans ? Math.round((decisionTallies.fail_closed / totalScans) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-6">
      <header className="flex items-center gap-2 flex-wrap">
        <Radar className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Marshall scheduler bridge</h1>
        <span className="text-xs text-white/40 ml-2">Last 7 days</span>
        <nav className="ml-auto flex flex-wrap gap-2 text-[11px]">
          <AdminNav href="/admin/marshall/scheduler/connections" label="Connections" />
          <AdminNav href="/admin/marshall/scheduler/scans" label="Scans" />
          <AdminNav href="/admin/marshall/scheduler/interceptions" label="Interceptions" />
          <AdminNav href="/admin/marshall/scheduler/overrides" label="Overrides" />
          <AdminNav href="/admin/marshall/scheduler/events" label="Events" />
          <AdminNav href="/admin/marshall/scheduler/platforms" label="Platforms" />
        </nav>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Active connections" value={connRows.length} />
        <StatCard icon={LineChart} label="Scans (7d)" value={totalScans} />
        <StatCard
          icon={AlertTriangle}
          label="Fail-closed rate"
          value={`${failClosedPct}%`}
          tone={failClosedPct > 2 ? 'red' : 'normal'}
        />
        <StatCard icon={Activity} label="Events pending" value={Number(eventsPending ?? 0)} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Scan decisions (7d)">
          <DecisionBar label="Clean" value={decisionTallies.clean} total={totalScans} tone="emerald" />
          <DecisionBar label="Findings surfaced" value={decisionTallies.findings_surfaced} total={totalScans} tone="amber" />
          <DecisionBar label="Blocked" value={decisionTallies.blocked} total={totalScans} tone="red" />
          <DecisionBar label="Fail-closed" value={decisionTallies.fail_closed} total={totalScans} tone="red" />
          <DecisionBar label="Override accepted" value={decisionTallies.override_accepted} total={totalScans} tone="slate" />
        </Panel>

        <Panel title="Platform health">
          {(['buffer', 'hootsuite', 'later', 'sprout_social', 'planoly'] as SchedulerPlatform[]).map((p) => {
            const mode = (platformStates ?? []).find((s: { platform: string }) => s.platform === p)?.mode ?? 'active';
            const ic = interceptByPlatform.get(p);
            const rate = ic && ic.attempts ? Math.round((ic.succeeded / ic.attempts) * 100) : null;
            const conns = connsByPlatform.get(p) ?? 0;
            return (
              <div key={p} className="flex items-center justify-between gap-3 border-b border-white/[0.06] last:border-0 py-2">
                <div className="flex items-center gap-2">
                  {conns > 0
                    ? <Plug className="w-3.5 h-3.5 text-emerald-300" strokeWidth={1.5} />
                    : <Unplug className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />}
                  <span className="text-xs text-white/80">{PLATFORM_LABELS[p]}</span>
                  <ModeBadge mode={mode} />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/60">
                  <span>{conns} conn</span>
                  <span>{rate == null ? 'n/a' : `${rate}% intercept`}</span>
                </div>
              </div>
            );
          })}
        </Panel>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ShieldX} label="Overrides (7d)" value={Number(overrideCount ?? 0)} tone="amber" />
        <StatCard icon={CheckCircle2} label="Clean rate" value={totalScans ? `${Math.round((decisionTallies.clean / totalScans) * 100)}%` : 'n/a'} />
        <StatCard icon={Clock} label="Blocked (7d)" value={decisionTallies.blocked} tone={decisionTallies.blocked > 0 ? 'red' : 'normal'} />
        <StatCard icon={AlertTriangle} label="Fail-closed (7d)" value={decisionTallies.fail_closed} tone={decisionTallies.fail_closed > 0 ? 'red' : 'normal'} />
      </section>
    </div>
  );
}

function AdminNav({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center rounded-md border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.04] px-2 py-1">
      {label}
    </Link>
  );
}

function StatCard({
  icon: Icon, label, value, tone = 'normal',
}: {
  icon: typeof Activity; label: string; value: number | string; tone?: 'normal' | 'red' | 'amber';
}) {
  const border = tone === 'red' ? 'border-red-500/40 text-red-200'
    : tone === 'amber' ? 'border-amber-400/40 text-amber-200'
    : 'border-white/10 text-white/80';
  return (
    <div className={`rounded-lg border ${border} bg-white/[0.02] px-3 py-3`}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-xs font-semibold text-white/80 mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function DecisionBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: 'emerald' | 'amber' | 'red' | 'slate' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const color = tone === 'emerald' ? 'bg-emerald-500'
    : tone === 'amber' ? 'bg-amber-500'
    : tone === 'red' ? 'bg-red-500'
    : 'bg-white/30';
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-[11px] text-white/70">
        <span>{label}</span>
        <span className="tabular-nums">{value} ({pct}%)</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const tone = mode === 'active' ? 'text-emerald-300 border-emerald-400/30 bg-emerald-500/5'
    : mode === 'scan_only' ? 'text-amber-300 border-amber-400/30 bg-amber-500/5'
    : 'text-red-300 border-red-500/40 bg-red-500/10';
  const label = mode === 'scan_only' ? 'scan only' : mode;
  return (
    <span className={`inline-flex rounded-md border ${tone} px-1.5 py-0.5 text-[10px]`}>{label}</span>
  );
}
