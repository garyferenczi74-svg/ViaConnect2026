// Prompt #125 P5: Admin interceptions log.

import Link from 'next/link';
import { ChevronLeft, Shield } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  scan_id: string;
  platform: string;
  mechanism: string;
  attempted_at: string;
  succeeded: boolean | null;
  error_message: string | null;
}

export default async function AdminInterceptionsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) redirect('/');

  const { data } = await sb
    .from('scheduler_interceptions')
    .select('id, scan_id, platform, mechanism, attempted_at, succeeded, error_message')
    .order('attempted_at', { ascending: false })
    .limit(200);
  const rows: Row[] = (data as Row[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/marshall/scheduler" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scheduler overview
        </Link>
        <span className="text-white/20">/</span>
        <Shield className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-sm md:text-base font-semibold text-white">Interceptions</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length} recent</span>
      </header>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-xs text-white/80">
          <thead className="border-b border-white/10 bg-white/[0.03]">
            <tr className="text-left">
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Mechanism</th>
              <th className="px-3 py-2">Outcome</th>
              <th className="px-3 py-2">Scan</th>
              <th className="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2 text-white/60">{new Date(r.attempted_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.platform}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{r.mechanism}</td>
                <td className={`px-3 py-2 ${r.succeeded === true ? 'text-emerald-300' : r.succeeded === false ? 'text-red-300' : 'text-white/60'}`}>
                  {r.succeeded === true ? 'succeeded' : r.succeeded === false ? 'failed' : 'pending'}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/marshall/scheduler/scans/${r.scan_id}`} className="text-[11px] text-sky-300 hover:text-sky-200">view</Link>
                </td>
                <td className="px-3 py-2 text-[11px] text-red-300/80 max-w-xs truncate">{r.error_message ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-white/50">No interceptions on record.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
