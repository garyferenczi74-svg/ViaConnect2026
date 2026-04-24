// Prompt #125 P5: Admin connections explorer.

import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const dynamic = 'force-dynamic';

const PLATFORM_LABELS: Record<SchedulerPlatform, string> = {
  buffer: 'Buffer', hootsuite: 'Hootsuite', later: 'Later',
  sprout_social: 'Sprout Social', planoly: 'Planoly',
};

interface ConnectionRow {
  id: string;
  practitioner_id: string;
  platform: SchedulerPlatform;
  external_account_id: string;
  external_account_label: string | null;
  scopes_granted: string[];
  connected_at: string;
  last_verified_at: string | null;
  active: boolean;
  disconnected_at: string | null;
  disconnected_reason: string | null;
}

export default async function AdminConnectionsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) redirect('/');

  const { data } = await sb
    .from('scheduler_connections')
    .select('id, practitioner_id, platform, external_account_id, external_account_label, scopes_granted, connected_at, last_verified_at, active, disconnected_at, disconnected_reason')
    .order('connected_at', { ascending: false })
    .limit(200);
  const rows: ConnectionRow[] = (data as ConnectionRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/marshall/scheduler" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scheduler overview
        </Link>
        <span className="text-white/20">/</span>
        <Users className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-sm md:text-base font-semibold text-white">Connections</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </header>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-xs text-white/80">
          <thead className="border-b border-white/10 bg-white/[0.03]">
            <tr className="text-left">
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Practitioner</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Scopes</th>
              <th className="px-3 py-2">Connected</th>
              <th className="px-3 py-2">Disconnected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2">
                  {r.active ? (
                    <span className="inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/5 text-emerald-300 px-1.5 py-0.5 text-[10px]">active</span>
                  ) : (
                    <span className="inline-flex rounded-md border border-white/10 text-white/50 px-1.5 py-0.5 text-[10px]">
                      {r.disconnected_reason ?? 'inactive'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{PLATFORM_LABELS[r.platform]}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-white/60">{r.practitioner_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-white/70">
                  {r.external_account_label ?? r.external_account_id}
                </td>
                <td className="px-3 py-2 text-[11px] text-white/60 max-w-xs truncate">{(r.scopes_granted ?? []).join(', ')}</td>
                <td className="px-3 py-2 text-white/60">{new Date(r.connected_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-white/60">{r.disconnected_at ? new Date(r.disconnected_at).toLocaleDateString() : 'n/a'}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-white/50">No connections recorded.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
