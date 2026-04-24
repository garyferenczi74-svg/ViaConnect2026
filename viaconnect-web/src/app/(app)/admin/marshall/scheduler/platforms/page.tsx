// Prompt #125 P5: Platforms + kill-switch admin page.
//
// One card per platform showing current mode, any pending state change,
// and a propose form. Pending changes render approve/reject controls
// (dual-approval: proposer cannot approve; reviewer must be someone else).

import Link from 'next/link';
import { ChevronLeft, Gauge, History } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import PlatformToggleForm from '@/components/scheduler/PlatformToggleForm';
import PendingChangeActions from '@/components/scheduler/PendingChangeActions';
import { SCHEDULER_PLATFORMS, type SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS: Record<SchedulerPlatform, string> = {
  buffer: 'Buffer', hootsuite: 'Hootsuite', later: 'Later',
  sprout_social: 'Sprout Social', planoly: 'Planoly',
};

interface StateRow {
  platform: SchedulerPlatform;
  mode: 'active' | 'scan_only' | 'disabled';
  updated_at: string;
  updated_by: string | null;
}

interface PendingChangeRow {
  id: string;
  platform: SchedulerPlatform;
  previous_mode: string;
  proposed_mode: string;
  proposed_by: string;
  proposed_at: string;
  proposal_reason: string;
}

interface RecentChangeRow {
  id: string;
  platform: SchedulerPlatform;
  previous_mode: string;
  proposed_mode: string;
  proposed_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  applied_at: string | null;
  rejection_reason: string | null;
}

export default async function PlatformsAdminPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) redirect('/');

  const [{ data: states }, { data: pending }, { data: recent }] = await Promise.all([
    sb.from('scheduler_platform_states').select('platform, mode, updated_at, updated_by'),
    sb.from('scheduler_platform_state_changes')
      .select('id, platform, previous_mode, proposed_mode, proposed_by, proposed_at, proposal_reason')
      .is('approved_at', null)
      .is('rejected_at', null)
      .order('proposed_at', { ascending: false }),
    sb.from('scheduler_platform_state_changes')
      .select('id, platform, previous_mode, proposed_mode, proposed_at, approved_at, rejected_at, applied_at, rejection_reason')
      .order('proposed_at', { ascending: false })
      .limit(20),
  ]);
  const stateRows = (states as StateRow[] | null) ?? [];
  const pendingRows = (pending as PendingChangeRow[] | null) ?? [];
  const recentRows = (recent as RecentChangeRow[] | null) ?? [];

  const stateByPlatform = new Map(stateRows.map((s) => [s.platform, s]));
  const pendingByPlatform = new Map(pendingRows.map((p) => [p.platform, p]));

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-6">
      <header className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/marshall/scheduler" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scheduler overview
        </Link>
        <span className="text-white/20">/</span>
        <Gauge className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-sm md:text-base font-semibold text-white">Platforms + kill switches</h1>
      </header>

      <p className="text-[11px] text-white/50 max-w-3xl">
        Platform mode changes require dual approval. The proposer cannot also be the approver. Set a platform to scan-only if its interception API is misbehaving; set to disabled only if you have practitioner notification coverage for the lapse.
      </p>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCHEDULER_PLATFORMS.map((p) => {
          const state = stateByPlatform.get(p);
          const pendingChange = pendingByPlatform.get(p);
          return (
            <article key={p} className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <header className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white">{PLATFORM_LABELS[p]}</h3>
                <ModeBadge mode={state?.mode ?? 'active'} />
              </header>
              {pendingChange ? (
                <div className="rounded-md border border-amber-400/40 bg-amber-500/10 p-2 space-y-2">
                  <div className="text-[11px] text-amber-200">
                    <span className="font-semibold">Pending change:</span>{' '}
                    {pendingChange.previous_mode} <span className="text-white/40">to</span>{' '}
                    <span className="font-semibold">{pendingChange.proposed_mode}</span>
                    <span className="text-white/40 ml-1">
                      proposed {new Date(pendingChange.proposed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/80 italic">{pendingChange.proposal_reason}</div>
                  <PendingChangeActions
                    platform={p}
                    changeId={pendingChange.id}
                    proposerIsSelf={pendingChange.proposed_by === user.id}
                  />
                </div>
              ) : (
                <PlatformToggleForm platform={p} currentMode={state?.mode ?? 'active'} />
              )}
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <header className="flex items-center gap-2 mb-2">
          <History className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold text-white/80">Recent state changes</h3>
          <span className="text-[11px] text-white/40">{recentRows.length} entries</span>
        </header>
        <ul className="space-y-1 text-xs">
          {recentRows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 border-b border-white/5 last:border-0 py-1">
              <span className="text-white/70">{PLATFORM_LABELS[r.platform]}</span>
              <span className="font-mono text-[11px] text-white/80">{r.previous_mode} &gt; {r.proposed_mode}</span>
              <span className={
                r.applied_at ? 'text-emerald-300'
                : r.rejected_at ? 'text-red-300'
                : 'text-amber-300'
              }>
                {r.applied_at ? 'applied' : r.rejected_at ? 'rejected' : 'pending'}
              </span>
              <span className="text-white/40 ml-auto">{new Date(r.proposed_at).toLocaleString()}</span>
            </li>
          ))}
          {recentRows.length === 0 ? (
            <li className="text-white/60 py-4 text-center">No state changes yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const tone = mode === 'active' ? 'text-emerald-300 border-emerald-400/30 bg-emerald-500/5'
    : mode === 'scan_only' ? 'text-amber-300 border-amber-400/30 bg-amber-500/5'
    : 'text-red-300 border-red-500/40 bg-red-500/10';
  const label = mode === 'scan_only' ? 'scan only' : mode;
  return <span className={`inline-flex rounded-md border ${tone} px-2 py-0.5 text-[11px]`}>{label}</span>;
}
