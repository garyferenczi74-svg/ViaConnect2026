// Prompt #125 P4: Scan detail view.
//
// Shows one scheduler_scans row: its decision, findings summary
// (counts by severity, rule ids), scheduled publish time, countdown to
// the scheduled publish, and (if the decision is 'blocked' or
// 'findings_surfaced') a link into the override flow.

import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ChevronLeft, Clock, ShieldAlert, ShieldCheck, ShieldX, FileText, ExternalLink } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { SchedulerDecision, SchedulerPlatform, FindingsSummary } from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

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
  findings_summary: FindingsSummary | null;
  scanned_at: string;
  content_hash_sha256: string;
  rule_registry_version: string;
  connection: { platform: SchedulerPlatform; external_account_label: string | null } | null;
}

export default async function ScanDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from('scheduler_scans')
    .select(
      'id, scan_id, external_post_id, target_platforms, scheduled_at, decision, findings_summary, scanned_at, content_hash_sha256, rule_registry_version, connection:scheduler_connections(platform, external_account_label)',
    )
    .eq('id', params.id)
    .eq('practitioner_id', user.id)
    .maybeSingle();
  const row = data as ScanRow | null;
  if (!row) notFound();

  const canOverride = row.decision === 'blocked' || row.decision === 'findings_surfaced';
  const findings = row.findings_summary;
  const ruleIds = findings?.ruleIds ?? [];
  const bySeverity = findings?.bySeverity ?? { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap text-xs text-white/60">
        <Link href="/practitioner/marshall/scheduler/posts" className="inline-flex items-center gap-1 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Recent scans
        </Link>
        <span className="text-white/20">/</span>
        <span className="font-mono text-white/80">{row.scan_id}</span>
      </header>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <DecisionHero decision={row.decision} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-white/60">
              {row.connection?.platform ? PLATFORM_LABELS[row.connection.platform] : 'scheduler'} post
              {row.connection?.external_account_label ? `, ${row.connection.external_account_label}` : ''}
            </div>
            <div className="text-sm text-white mt-0.5 font-mono truncate">{row.external_post_id}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-white/70">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
              Scheduled {new Date(row.scheduled_at).toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#B75E18]" strokeWidth={1.5} />
            Findings
          </h3>
          {findings && findings.total > 0 ? (
            <>
              <div className="mt-3 grid grid-cols-5 gap-1 text-center">
                {(['P0', 'P1', 'P2', 'P3', 'P4'] as const).map((sev) => (
                  <div key={sev} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                    <div className="text-[10px] text-white/50">{sev}</div>
                    <div className="text-sm font-semibold text-white tabular-nums">{bySeverity[sev] ?? 0}</div>
                  </div>
                ))}
              </div>
              {ruleIds.length > 0 ? (
                <div className="mt-3">
                  <div className="text-[10px] text-white/40 mb-1">Rules triggered</div>
                  <div className="flex flex-wrap gap-1">
                    {ruleIds.map((id) => (
                      <span key={id} className="inline-flex rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-white/80">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-xs text-white/60">No findings on this scan.</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
          <h3 className="text-xs font-semibold text-white/80">Scan metadata</h3>
          <MetaRow label="Scanned at" value={new Date(row.scanned_at).toLocaleString()} />
          <MetaRow label="Registry version" value={row.rule_registry_version} mono />
          <MetaRow label="Content hash" value={row.content_hash_sha256.slice(0, 12) + '...'} mono />
          <MetaRow label="Target platforms" value={(row.target_platforms ?? []).join(', ') || 'none'} />
        </div>
      </section>

      {canOverride ? (
        <section className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4">
          <h3 className="text-sm font-semibold text-amber-200">Override this block</h3>
          <p className="text-xs text-amber-200/80 mt-1">
            You can override Marshall and publish anyway. The override is signed, logged, and counted; no clearance receipt is issued; no good-faith credit if Hounddog catches the post later.
          </p>
          <Link
            href={`/practitioner/marshall/scheduler/posts/${row.id}/override`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-400/60 text-amber-200 hover:bg-amber-500/20 px-3 py-1.5 text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
            Review consequences + sign override
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function DecisionHero({ decision }: { decision: SchedulerDecision }) {
  const config: Record<SchedulerDecision, { Icon: typeof ShieldCheck; color: string; label: string }> = {
    clean:              { Icon: ShieldCheck, color: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/40', label: 'Clean' },
    findings_surfaced:  { Icon: ShieldAlert, color: 'text-amber-300 bg-amber-500/10 border-amber-400/40', label: 'Findings surfaced' },
    blocked:            { Icon: ShieldX, color: 'text-red-300 bg-red-500/10 border-red-500/40', label: 'Blocked' },
    fail_closed:        { Icon: ShieldX, color: 'text-red-300 bg-red-500/10 border-red-500/40', label: 'Fail-closed' },
    override_accepted:  { Icon: ShieldAlert, color: 'text-white/70 bg-white/[0.05] border-white/20', label: 'Overridden' },
  };
  const meta = config[decision];
  const Icon = meta.Icon;
  return (
    <div className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${meta.color}`}>
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      <span className="text-sm font-semibold">{meta.label}</span>
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px] gap-3">
      <span className="text-white/40">{label}</span>
      <span className={mono ? 'font-mono text-white/80 truncate' : 'text-white/80 truncate'}>{value}</span>
    </div>
  );
}
