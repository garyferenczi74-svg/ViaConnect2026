// Prompt #125 P5: Admin scan detail (read-only).

import Link from 'next/link';
import { ChevronLeft, LineChart, Fingerprint, Calendar, User2, FileText } from 'lucide-react';
import { redirect, notFound } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { SchedulerDecision, SchedulerPlatform, FindingsSummary } from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS: Record<SchedulerPlatform, string> = {
  buffer: 'Buffer', hootsuite: 'Hootsuite', later: 'Later',
  sprout_social: 'Sprout Social', planoly: 'Planoly',
};

interface ScanDetail {
  id: string;
  scan_id: string;
  practitioner_id: string;
  external_post_id: string;
  target_platforms: string[];
  scheduled_at: string;
  content_hash_sha256: string;
  rule_registry_version: string;
  decision: SchedulerDecision;
  findings_summary: FindingsSummary | null;
  scanned_at: string;
  receipt_reused_id: string | null;
  receipt_issued_id: string | null;
  connection: { platform: SchedulerPlatform; external_account_label: string | null } | null;
}

interface InterceptionRow {
  id: string;
  mechanism: string;
  attempted_at: string;
  succeeded: boolean | null;
  error_message: string | null;
}

interface OverrideRow {
  id: string;
  practitioner_id: string;
  finding_ids: string[];
  justification: string;
  ip_address: string | null;
  signed_at: string;
  pattern_flag_triggered: boolean;
}

export default async function AdminScanDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) redirect('/');

  const [{ data: scan }, { data: intercepts }, { data: overrides }] = await Promise.all([
    sb
      .from('scheduler_scans')
      .select(
        'id, scan_id, practitioner_id, external_post_id, target_platforms, scheduled_at, content_hash_sha256, rule_registry_version, decision, findings_summary, scanned_at, receipt_reused_id, receipt_issued_id, connection:scheduler_connections(platform, external_account_label)',
      )
      .eq('id', params.id)
      .maybeSingle(),
    sb
      .from('scheduler_interceptions')
      .select('id, mechanism, attempted_at, succeeded, error_message')
      .eq('scan_id', params.id)
      .order('attempted_at', { ascending: false }),
    sb
      .from('scheduler_overrides')
      .select('id, practitioner_id, finding_ids, justification, ip_address, signed_at, pattern_flag_triggered')
      .eq('scan_id', params.id)
      .order('signed_at', { ascending: false }),
  ]);
  if (!scan) notFound();

  const row = scan as ScanDetail;
  const interceptRows = (intercepts as InterceptionRow[] | null) ?? [];
  const overrideRows = (overrides as OverrideRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap text-xs text-white/60">
        <Link href="/admin/marshall/scheduler/scans" className="inline-flex items-center gap-1 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scans
        </Link>
        <span className="text-white/20">/</span>
        <LineChart className="w-3.5 h-3.5 text-[#B75E18]" strokeWidth={1.5} />
        <span className="font-mono text-white/80">{row.scan_id}</span>
      </header>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/80">{row.decision.replace(/_/g, ' ')}</span>
          <span className="text-[11px] text-white/50">{row.connection?.platform ? PLATFORM_LABELS[row.connection.platform] : 'n/a'}</span>
        </div>
        <MetaRow icon={User2} label="Practitioner" value={row.practitioner_id} mono />
        <MetaRow icon={FileText} label="External post id" value={row.external_post_id} mono />
        <MetaRow icon={Calendar} label="Scheduled at" value={new Date(row.scheduled_at).toLocaleString()} />
        <MetaRow icon={Calendar} label="Scanned at" value={new Date(row.scanned_at).toLocaleString()} />
        <MetaRow icon={Fingerprint} label="Content hash" value={row.content_hash_sha256.slice(0, 16) + '...'} mono />
        <MetaRow icon={Fingerprint} label="Registry version" value={row.rule_registry_version} mono />
        <MetaRow icon={Fingerprint} label="Receipt reused" value={row.receipt_reused_id ?? 'none'} mono />
        <MetaRow icon={Fingerprint} label="Receipt issued" value={row.receipt_issued_id ?? 'none'} mono />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-xs font-semibold text-white/80 mb-2">Findings</h3>
        {row.findings_summary && row.findings_summary.total > 0 ? (
          <>
            <div className="grid grid-cols-5 gap-1 text-center mb-2">
              {(['P0', 'P1', 'P2', 'P3', 'P4'] as const).map((sev) => (
                <div key={sev} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                  <div className="text-[10px] text-white/50">{sev}</div>
                  <div className="text-sm font-semibold text-white tabular-nums">
                    {row.findings_summary?.bySeverity[sev] ?? 0}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {row.findings_summary.ruleIds.map((id) => (
                <span key={id} className="font-mono text-[10px] rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-white/70">{id}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-xs text-white/60">No findings.</div>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-xs font-semibold text-white/80 mb-2">Interceptions ({interceptRows.length})</h3>
        {interceptRows.length === 0 ? (
          <div className="text-xs text-white/60">No interception attempts.</div>
        ) : (
          <ul className="space-y-1 text-xs">
            {interceptRows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span className="text-white/70">{r.mechanism}</span>
                <span className={r.succeeded ? 'text-emerald-300' : 'text-red-300'}>{r.succeeded ? 'succeeded' : 'failed'}</span>
                <span className="text-white/40">{new Date(r.attempted_at).toLocaleString()}</span>
                {r.error_message ? <span className="text-red-300 text-[10px]">{r.error_message}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-xs font-semibold text-white/80 mb-2">Overrides ({overrideRows.length})</h3>
        {overrideRows.length === 0 ? (
          <div className="text-xs text-white/60">No overrides on this scan.</div>
        ) : (
          <ul className="space-y-2">
            {overrideRows.map((r) => (
              <li key={r.id} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                  <span className="font-mono">{r.practitioner_id.slice(0, 8)}</span>
                  <span className="text-white/40">{new Date(r.signed_at).toLocaleString()}</span>
                  {r.pattern_flag_triggered ? <span className="text-amber-300">pattern flagged</span> : null}
                  {r.ip_address ? <span className="font-mono text-white/40">{r.ip_address}</span> : null}
                </div>
                <div className="mt-1 text-xs text-white/80 whitespace-pre-wrap">{r.justification}</div>
                <div className="mt-1 text-[10px] text-white/40">Finding ids: {(r.finding_ids ?? []).join(', ')}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetaRow({
  icon: Icon, label, value, mono = false,
}: {
  icon: typeof Calendar; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="inline-flex items-center gap-1 text-white/40">
        <Icon className="w-3 h-3" strokeWidth={1.5} />
        {label}
      </span>
      <span className={mono ? 'font-mono text-white/80 truncate' : 'text-white/80 truncate'}>{value}</span>
    </div>
  );
}
