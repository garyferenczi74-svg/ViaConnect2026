// Prompt #125 P5: Admin overrides log.

import Link from 'next/link';
import { ChevronLeft, Flag } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  scan_id: string;
  practitioner_id: string;
  finding_ids: string[];
  justification: string;
  ip_address: string | null;
  signed_at: string;
  pattern_flag_triggered: boolean;
}

export default async function AdminOverridesPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) redirect('/');

  const { data } = await sb
    .from('scheduler_overrides')
    .select('id, scan_id, practitioner_id, finding_ids, justification, ip_address, signed_at, pattern_flag_triggered')
    .order('signed_at', { ascending: false })
    .limit(200);
  const rows: Row[] = (data as Row[] | null) ?? [];
  const flaggedCount = rows.filter((r) => r.pattern_flag_triggered).length;

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/marshall/scheduler" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scheduler overview
        </Link>
        <span className="text-white/20">/</span>
        <Flag className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-sm md:text-base font-semibold text-white">Overrides</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}, {flaggedCount} pattern-flagged</span>
      </header>

      <div className="space-y-2">
        {rows.map((r) => (
          <article key={r.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-white/60">
              <span className="font-mono">{r.practitioner_id.slice(0, 8)}</span>
              <span>{new Date(r.signed_at).toLocaleString()}</span>
              {r.pattern_flag_triggered ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/10 text-amber-300 px-1.5 py-0.5">
                  <Flag className="w-3 h-3" strokeWidth={1.5} />
                  pattern flag
                </span>
              ) : null}
              <Link href={`/admin/marshall/scheduler/scans/${r.scan_id}`} className="ml-auto text-sky-300 hover:text-sky-200">view scan</Link>
            </div>
            <div className="mt-2 text-xs text-white/80 whitespace-pre-wrap">{r.justification}</div>
            <div className="mt-2 text-[10px] text-white/40">
              Findings: {(r.finding_ids ?? []).join(', ')}
              {r.ip_address ? ` · IP: ${r.ip_address}` : ''}
            </div>
          </article>
        ))}
        {rows.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/60">
            No overrides on record.
          </div>
        ) : null}
      </div>
    </div>
  );
}
