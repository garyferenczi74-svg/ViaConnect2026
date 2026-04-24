// Prompt #125 P5: Admin scans explorer with search/filter.

import Link from 'next/link';
import { ChevronLeft, LineChart } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { SchedulerDecision, SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS: Record<SchedulerPlatform, string> = {
  buffer: 'Buffer', hootsuite: 'Hootsuite', later: 'Later',
  sprout_social: 'Sprout Social', planoly: 'Planoly',
};

const DECISION_OPTIONS: Array<{ value: SchedulerDecision | ''; label: string }> = [
  { value: '', label: 'All decisions' },
  { value: 'clean', label: 'Clean' },
  { value: 'findings_surfaced', label: 'Findings surfaced' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'fail_closed', label: 'Fail-closed' },
  { value: 'override_accepted', label: 'Overridden' },
];

interface ScanRow {
  id: string;
  scan_id: string;
  practitioner_id: string;
  external_post_id: string;
  scheduled_at: string;
  decision: SchedulerDecision;
  findings_summary: { total?: number } | null;
  scanned_at: string;
  connection: { platform: SchedulerPlatform } | null;
}

export default async function AdminScansPage({ searchParams }: { searchParams: { decision?: string; platform?: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) redirect('/');

  let query = sb
    .from('scheduler_scans')
    .select('id, scan_id, practitioner_id, external_post_id, scheduled_at, decision, findings_summary, scanned_at, connection:scheduler_connections(platform)')
    .order('scanned_at', { ascending: false })
    .limit(200);
  if (searchParams.decision) query = query.eq('decision', searchParams.decision);
  // Platform filter via join would need a .filter('connection.platform', ...);
  // keep it simple here and filter client-side for now.
  const { data } = await query;
  const rowsAll: ScanRow[] = (data as ScanRow[] | null) ?? [];
  const rows = searchParams.platform
    ? rowsAll.filter((r) => r.connection?.platform === searchParams.platform)
    : rowsAll;

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/marshall/scheduler" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scheduler overview
        </Link>
        <span className="text-white/20">/</span>
        <LineChart className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-sm md:text-base font-semibold text-white">Scans</h1>
      </header>

      <form method="get" className="flex items-end gap-3 flex-wrap text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-white/60">Decision</span>
          <select name="decision" defaultValue={searchParams.decision ?? ''} className="rounded-md bg-white/[0.04] border border-white/10 text-white px-2 py-1">
            {DECISION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-white/60">Platform</span>
          <select name="platform" defaultValue={searchParams.platform ?? ''} className="rounded-md bg-white/[0.04] border border-white/10 text-white px-2 py-1">
            <option value="">All platforms</option>
            {(Object.keys(PLATFORM_LABELS) as SchedulerPlatform[]).map((p) => (
              <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-white/20 text-white/80 hover:text-white px-3 py-1">
          Filter
        </button>
        <span className="text-white/40 ml-auto">{rows.length} shown</span>
      </form>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-xs text-white/80">
          <thead className="border-b border-white/10 bg-white/[0.03]">
            <tr className="text-left">
              <th className="px-3 py-2">Scan id</th>
              <th className="px-3 py-2">Decision</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Practitioner</th>
              <th className="px-3 py-2">Findings</th>
              <th className="px-3 py-2">Scheduled</th>
              <th className="px-3 py-2">Scanned</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2 font-mono text-[10px] text-white/50">{r.scan_id}</td>
                <td className="px-3 py-2">{r.decision.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2">{r.connection?.platform ? PLATFORM_LABELS[r.connection.platform] : 'n/a'}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-white/50">{r.practitioner_id.slice(0, 8)}</td>
                <td className="px-3 py-2 tabular-nums text-white/70">{r.findings_summary?.total ?? 0}</td>
                <td className="px-3 py-2 text-white/60">{new Date(r.scheduled_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-white/60">{new Date(r.scanned_at).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/marshall/scheduler/scans/${r.id}`} className="text-[11px] text-sky-300 hover:text-sky-200">View</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-white/50">No scans match the filter.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
