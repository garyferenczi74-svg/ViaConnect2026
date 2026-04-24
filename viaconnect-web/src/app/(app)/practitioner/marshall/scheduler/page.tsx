// Prompt #125 P4: Practitioner scheduler portal.
//
// Shows the five supported schedulers as connect-or-connected cards.
// Per §11: coverage-level badge (Full / Notify-only / Polling fallback),
// scope list visible when connected, disconnect button (sends POST to
// the disconnect API).

import Link from 'next/link';
import { Calendar, Shield, AlertCircle, CheckCircle2, Unplug, FileSignature } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  SCHEDULER_PLATFORMS,
  SCHEDULER_COVERAGE_BY_PLATFORM,
  type SchedulerPlatform,
  type SchedulerCoverageLevel,
} from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS: Record<SchedulerPlatform, string> = {
  buffer: 'Buffer',
  hootsuite: 'Hootsuite',
  later: 'Later',
  sprout_social: 'Sprout Social',
  planoly: 'Planoly',
};

const PLATFORM_SCOPE_BLURB: Record<SchedulerPlatform, string> = {
  buffer: 'Read your drafts and queued updates. Return problematic posts to drafts before they publish.',
  hootsuite: 'Read your scheduled messages. Reject-pending-compliance during Approval Workflow.',
  later: 'Read your queued posts. Reschedule problematic posts to buy time for remediation.',
  sprout_social: 'Read your publishing queue. Approve or reject-pending-review during Approval Workflow.',
  planoly: 'Read your queued posts. Notify-only coverage: we email if we spot a compliance issue.',
};

interface ConnectionRow {
  id: string;
  platform: SchedulerPlatform;
  external_account_label: string | null;
  scopes_granted: string[];
  connected_at: string;
  active: boolean;
}

export default async function SchedulerPortalPage({
  searchParams,
}: {
  searchParams: { connected?: string; oauth_error?: string; platform?: string };
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: conns } = await sb
    .from('scheduler_connections')
    .select('id, platform, external_account_label, scopes_granted, connected_at, active')
    .eq('practitioner_id', user.id)
    .eq('active', true)
    .order('connected_at', { ascending: false });
  const connections: ConnectionRow[] = (conns as ConnectionRow[] | null) ?? [];
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-6">
      <header className="flex items-start gap-3 flex-wrap">
        <Calendar className="w-5 h-5 text-[#B75E18] mt-1" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold text-white">Scheduler bridge</h1>
          <p className="text-xs text-white/50 mt-1 max-w-3xl">
            Connect your post-scheduling account so Marshall can pre-check drafts and queued posts before publication. Clean content inherits your existing clearance receipt chain; flagged content is held until remediated or explicitly overridden. You can disconnect at any time.
          </p>
        </div>
        <Link
          href="/practitioner/marshall/scheduler/posts"
          className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 rounded-md px-3 py-1.5"
        >
          <FileSignature className="w-3.5 h-3.5" strokeWidth={1.5} />
          Recent scans
        </Link>
      </header>

      {searchParams.connected ? (
        <Banner tone="success">
          Connected to {PLATFORM_LABELS[searchParams.connected as SchedulerPlatform] ?? searchParams.connected}. Marshall is watching your queue.
        </Banner>
      ) : null}
      {searchParams.oauth_error ? (
        <Banner tone="error">
          Connection attempt failed: {searchParams.oauth_error}. Try again, or contact support if this persists.
        </Banner>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SCHEDULER_PLATFORMS.map((p) => {
          const conn = byPlatform.get(p);
          const coverage = SCHEDULER_COVERAGE_BY_PLATFORM[p];
          return (
            <article key={p} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">{PLATFORM_LABELS[p]}</h2>
                  <CoverageBadge level={coverage} />
                </div>
                {conn ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 px-2 py-0.5 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/10 text-white/50 px-2 py-0.5 text-[11px]">
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/60 mt-2">{PLATFORM_SCOPE_BLURB[p]}</p>
              {conn ? (
                <div className="mt-3 space-y-2">
                  <div className="text-[10px] text-white/40 font-mono">
                    Connected {new Date(conn.connected_at).toLocaleDateString()}
                    {conn.external_account_label ? `, ${conn.external_account_label}` : null}
                  </div>
                  <div className="text-[10px] text-white/40">
                    Scopes: {(conn.scopes_granted ?? []).join(', ')}
                  </div>
                  <form action={`/api/marshall/scheduler/oauth/disconnect/${conn.id}`} method="post">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10 px-2.5 py-1 text-[11px]"
                    >
                      <Unplug className="w-3 h-3" strokeWidth={1.5} />
                      Disconnect
                    </button>
                  </form>
                </div>
              ) : p === 'buffer' || p === 'hootsuite' ? (
                <div className="mt-3">
                  <Link
                    href={`/api/marshall/scheduler/oauth/start/${p}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#B75E18] hover:bg-[#a75217] text-white px-3 py-1.5 text-xs"
                  >
                    <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Connect
                  </Link>
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-white/40 italic">
                  Connection flow rolls out with a later phase.
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  const styles = tone === 'success'
    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
    : 'border-red-500/40 bg-red-500/10 text-red-200';
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`rounded-md border ${styles} px-3 py-2 text-xs flex items-start gap-2`}>
      <Icon className="w-4 h-4 mt-0.5" strokeWidth={1.5} />
      <span>{children}</span>
    </div>
  );
}

function CoverageBadge({ level }: { level: SchedulerCoverageLevel }) {
  const label = level === 'full' ? 'Full integration'
    : level === 'notify_only' ? 'Notify only'
    : 'Polling fallback';
  const color = level === 'full' ? 'text-emerald-300 border-emerald-400/30 bg-emerald-500/5'
    : level === 'notify_only' ? 'text-amber-300 border-amber-400/30 bg-amber-500/5'
    : 'text-sky-300 border-sky-400/30 bg-sky-500/5';
  return (
    <span className={`inline-flex items-center rounded-md border ${color} px-1.5 py-0.5 text-[10px] mt-1`}>
      {label}
    </span>
  );
}
